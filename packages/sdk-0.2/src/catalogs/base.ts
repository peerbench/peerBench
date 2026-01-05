import { CatalogItemNotFoundError } from "@/errors/catalog";

export class BaseCatalog<T> {
  protected items: Record<string, T> = {};

  register(kind: string, item: T) {
    this.items[kind] = item;
  }

  deregister(kind: string) {
    delete this.items[kind];
  }

  get<K extends T>(kind: string, throwIfNotFound: boolean = true) {
    const item = this.items[kind];

    if (throwIfNotFound && !item) {
      throw new CatalogItemNotFoundError(kind);
    }

    return item as K;
  }
}
