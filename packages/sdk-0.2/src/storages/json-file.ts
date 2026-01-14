import { bufferToString } from "@/utils";
import {
  AbstractFileStorageCodec,
  FileStorage,
  FileStorageFileHandle,
} from "./file";
import z from "zod";

export class JSONFileStorage<TObject> extends FileStorage<TObject> {
  declare codec: JSONFileStorageCodec<TObject>;

  constructor(config: {
    path: string;
    chunkSize?: number;
    schema: z.ZodType<TObject>;
  }) {
    super({
      path: config.path,
      codec: new JSONFileStorageCodec({
        chunkSize: config.chunkSize,
        schema: config.schema,
      }),
    });
  }
}

export class JSONFileStorageCodec<
  TObject,
> extends AbstractFileStorageCodec<TObject> {
  private chunkSize: number;
  private schema: z.ZodType<TObject>;

  constructor(config: { chunkSize?: number; schema: z.ZodType<TObject> }) {
    super();
    this.chunkSize = config?.chunkSize ?? 64 * 1024;
    this.schema = config.schema;
  }

  async readAll(params: {
    fileHandle: FileStorageFileHandle;
  }): Promise<TObject[]> {
    const wholeFile: Uint8Array = new Uint8Array(
      await params.fileHandle.size()
    );
    for await (const chunk of params.fileHandle.readChunks({
      chunkSize: this.chunkSize,
    })) {
      wholeFile.set(chunk.bytes, chunk.offset);
    }

    return this.schema.array().parse(JSON.parse(bufferToString(wholeFile)));
  }
}
