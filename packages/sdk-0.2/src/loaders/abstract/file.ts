import { MaybePromise } from "@/types";
import { AbstractLoader, LoaderResult } from "./loader";
import { BufferEncodingOption } from "node:fs";
import { BaseBenchmarkSpecV1 } from "@/schemas/benchmark-spec";

export abstract class AbstractFileLoader extends AbstractLoader {
  abstract loadData(params: {
    path: string;
    encoding?: BufferEncodingOption;
  }): MaybePromise<LoaderResult>;

  abstract loadBenchmarkSpec(params: {
    path: string;
    encoding?: BufferEncodingOption;
  }): MaybePromise<BaseBenchmarkSpecV1>;
}
