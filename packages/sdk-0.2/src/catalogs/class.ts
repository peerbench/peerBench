import { CatalogItemNotFoundError } from "@/errors/catalog";
import { ClassConstructor } from "@/utilities";
import { BaseCatalog } from "./base";

export type ClassCatalogItem<T extends ClassConstructor<unknown>> = {
  constructor: T;
  instantiate: (...args: any[]) => InstanceType<T>;
};

export class ClassCatalog<
  T extends ClassConstructor<unknown>,
> extends BaseCatalog<ClassCatalogItem<T>> {
  override register(kind: string, item: ClassCatalogItem<T>) {
    super.register(kind, item);
  }

  instantiate(kind: string, ...args: any[]) {
    const item = this.get(kind);

    if (!item) {
      throw new CatalogItemNotFoundError(kind);
    }

    return item.instantiate(...args);
  }
}
