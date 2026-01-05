import { CatalogItemNotFoundError } from "@/errors/catalog";
import { BaseCatalog } from "./base";
import {
  AbstractDataLoader,
  AbstractFileLoader,
  AbstractHttpLoader,
  AbstractLoader,
} from "@/loaders";

export class LoaderCatalog<
  T extends
    | AbstractDataLoader
    | AbstractFileLoader
    | AbstractHttpLoader
    | AbstractLoader = AbstractLoader,
> extends BaseCatalog<T> {
  override register(kind: string, loader: T) {
    super.register(kind, loader);
  }

  /**
   * Executes all the registered loaders with the given params until one succeeds.
   */
  async tryLoad(params: Parameters<T["loadData"]>[0]) {
    for (const [, loader] of Object.entries(this.items)) {
      try {
        return await loader.loadData(params as any);
      } catch {
        continue;
      }
    }

    throw new CatalogItemNotFoundError({
      message: "No compatible loader found",
    });
  }
}
