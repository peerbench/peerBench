import { MaybePromise } from "@/types";
import { AbstractLoader, LoaderResult } from "./loader";
import { BaseBenchmarkSpecV1 } from "@/schemas/benchmark-spec";

export abstract class AbstractDataLoader extends AbstractLoader {
  abstract loadData(params: {
    content: Uint8Array;
  }): MaybePromise<LoaderResult>;

  abstract loadBenchmarkSpec(params: {
    content: Uint8Array;
  }): MaybePromise<BaseBenchmarkSpecV1>;
}
