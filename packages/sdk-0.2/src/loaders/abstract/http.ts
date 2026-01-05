import { MaybePromise } from "@/types";
import { AbstractLoader, LoaderResult } from "./loader";
import { BaseBenchmarkSpecV1 } from "@/schemas/benchmark-spec";

export abstract class AbstractHttpLoader extends AbstractLoader {
  abstract loadData(params: {
    url: string;
    options?: RequestInit;
  }): MaybePromise<LoaderResult>;

  abstract loadBenchmarkSpec(params: {
    url: string;
    options?: RequestInit;
  }): MaybePromise<BaseBenchmarkSpecV1>;
}
