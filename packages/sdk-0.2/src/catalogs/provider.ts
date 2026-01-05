import { ClassCatalog } from "./class";
import { ClassConstructor } from "@/utilities";
import { AbstractProvider } from "@/providers/abstract/provider";
import { BaseCatalog } from "./base";

export class ProviderCatalog extends ClassCatalog<
  ClassConstructor<AbstractProvider>
> {}
export class ProviderInstanceCatalog extends BaseCatalog<AbstractProvider> {}
