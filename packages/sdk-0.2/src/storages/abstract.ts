export abstract class AbstractStorage<TObject> {
  abstract init(params?: unknown): Promise<void>;
  abstract read(key: string, params?: unknown): Promise<TObject | null>;
  abstract readAll(params?: unknown): Promise<TObject[]>;
  abstract write(
    key: string,
    value: TObject,
    params?: unknown
  ): Promise<unknown>;
}
