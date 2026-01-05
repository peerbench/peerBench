import { ClassCatalog } from "./class";
import { ClassConstructor } from "@/utilities";
import { AbstractScorer } from "@/scorers/abstract";
import { BaseCatalog } from "./base";

export class ScorerCatalog extends ClassCatalog<
  ClassConstructor<AbstractScorer>
> {}
export class ScorerInstanceCatalog extends BaseCatalog<AbstractScorer> {}
