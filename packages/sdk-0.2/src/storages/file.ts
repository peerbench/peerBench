import { FileHandle, open } from "node:fs/promises";
import { AbstractStorage } from "./abstract";

export class FileStorage<TObject> extends AbstractStorage<TObject> {
  protected path: string;
  protected codec: AbstractFileStorageCodec<TObject>;
  protected fileHandle: FileHandle | undefined;

  constructor(config: {
    path: string;
    codec: AbstractFileStorageCodec<TObject>;
  }) {
    super();
    this.path = config.path;
    this.codec = config.codec;
  }

  async init(): Promise<void> {
    this.fileHandle = await open(this.path, "r+");
  }

  override async read(
    _key: string,
    _params?: unknown
  ): Promise<TObject | null> {
    throw new Error("Method not implemented.");
  }

  override async readAll(_params?: unknown): Promise<TObject[]> {
    this.assertInitialized();

    return await this.codec.readAll({
      fileHandle: {
        readAt: this.readAt.bind(this),
        readChunks: this.readChunks.bind(this),
        size: this.size.bind(this),
      },
    });
  }

  override async write(
    _key: string,
    _value: TObject,
    _params?: unknown
  ): Promise<unknown> {
    throw new Error("Method not implemented.");
  }

  protected async *readChunks(params: {
    startOffset?: number;
    chunkSize: number;
  }): AsyncIterable<{ offset: number; bytes: Uint8Array }> {
    this.assertInitialized();

    const fileSize = await this.size();
    let offset = params.startOffset ?? 0;

    // NOTE: What if the file size changed during the iteration?
    while (offset < fileSize) {
      const length = Math.min(params.chunkSize, fileSize - offset);
      if (length === 0) break;

      const bytes = await this.readAt(offset, length);
      if (bytes.length === 0) break;
      yield { offset, bytes };
      offset += bytes.length;
    }
  }

  protected async size(): Promise<number> {
    this.assertInitialized();

    return await this.fileHandle.stat().then((stat) => stat.size);
  }

  protected async readAt(offset: number, length: number): Promise<Uint8Array> {
    this.assertInitialized();

    const buffer = new Uint8Array(length);
    const result = await this.fileHandle.read(buffer, 0, length, offset);

    return new Uint8Array(buffer.subarray(0, result.bytesRead));
  }

  protected assertInitialized(): asserts this is this & {
    fileHandle: FileHandle;
  } {
    if (!this.fileHandle) {
      throw new Error("File Storage is not initialized");
    }
  }
}

export type FileStorageFileHandle = {
  size(): Promise<number>;
  readAt(offset: number, length: number): Promise<Uint8Array>;
  readChunks(params: {
    startOffset?: number;
    chunkSize: number;
  }): AsyncIterable<{ offset: number; bytes: Uint8Array }>;
};

export abstract class AbstractFileStorageCodec<TObject> {
  abstract readAll(params: {
    fileHandle: FileStorageFileHandle;
  }): Promise<TObject[]>;
  // TODO: Add other methods like write, append, read one etc.
}
