import { AbstractStorage } from "@/storages/abstract";

export class HttpStorage<TObject> extends AbstractStorage<TObject> {
  protected readonly url: string;
  protected readonly codec: AbstractHttpStorageCodec<TObject>;
  protected readonly fetchFn: typeof fetch;

  constructor(config: {
    url: string;
    codec: AbstractHttpStorageCodec<TObject>;
    fetchFn?: typeof fetch;
  }) {
    super();
    this.url = config.url;
    this.codec = config.codec;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  override async init(_params?: unknown): Promise<void> {
    // Nothing to do here
  }

  override async read(
    _key: string,
    _params?: unknown
  ): Promise<TObject | null> {
    // TODO: Implement `read(key)` with codec support (e.g. query params / path templating).
    throw new Error("Not implemented");
  }

  override async readAll(params?: unknown): Promise<TObject[]> {
    const response = await this.fetchFn(this.url, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    if (!response.ok) {
      throw new Error(
        `HTTP storage request failed: ${response.status} ${response.statusText}`
      );
    }

    return await this.codec.readAll({ url: this.url, response, params });
  }

  override async write(
    _key: string,
    _value: TObject,
    _params?: unknown
  ): Promise<unknown> {
    // TODO: Implement `write(key, value)` for HTTP storage if needed (PUT/POST/PATCH).
    throw new Error("Not implemented");
  }
}

export abstract class AbstractHttpStorageCodec<TObject> {
  abstract readAll(params: {
    url: string;
    response: Response;
    params?: unknown;
  }): Promise<TObject[]>;
}
