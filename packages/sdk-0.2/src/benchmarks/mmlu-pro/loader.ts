import { bufferToString } from "@/utils";
import {
  MMLUProMainResponseV1,
  MMLUProMainScoreV1,
  MMLUProMainTestCaseSchemaV1,
  MMLUProMainTestCaseV1,
} from "./test-cases/main.v1";
import z from "zod";
import { AbstractDataLoader } from "@/loaders/abstract/data";
import { LoaderResult } from "@/loaders/abstract/loader";
import { parquetReadObjects } from "hyparquet";
import { MMLUProBenchmarkSpecV1 } from "./spec";

const jsonSchema = z
  .object({
    question_id: z.coerce.number(),
    question: z.string(),
    options: z.array(z.string()),
    answer: z.string(),
    answer_index: z.coerce.number(),
    cot_content: z.string(),
    category: z.string(),
    src: z.string(),
  })
  .array();

function mapData(
  data: z.infer<typeof jsonSchema>
): LoaderResult<
  MMLUProMainTestCaseV1,
  MMLUProMainResponseV1,
  MMLUProMainScoreV1
> {
  return {
    responses: [],
    scores: [],
    testCases: data.map((item) =>
      MMLUProMainTestCaseSchemaV1.new({
        id: `${item.src}-${item.category}-${item.question_id}`,
        question: item.question,
        answerKey: item.answer,
        options: item.options.reduce(
          (acc, option, index) => {
            acc[String.fromCharCode(65 + index)] = option;
            return acc;
          },
          {} as Record<string, string>
        ),
        answer: item.options[item.answer_index]!,
        metadata: {
          category: item.category,
          src: item.src,
          answer_index: item.answer_index,
        },
      })
    ),
  };
}

export class MMLUProJSONDataLoader extends AbstractDataLoader {
  override readonly kind = "mmlu-pro.load.json.data";

  override loadData(params: {
    content: Uint8Array;
  }): LoaderResult<
    MMLUProMainTestCaseV1,
    MMLUProMainResponseV1,
    MMLUProMainScoreV1
  > {
    const content =
      typeof params.content === "string"
        ? params.content
        : bufferToString(params.content);

    const parsed = jsonSchema.parse(JSON.parse(content));
    return mapData(parsed);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override loadBenchmarkSpec(params: {
    content: Uint8Array;
  }): Promise<MMLUProBenchmarkSpecV1> {
    throw new Error("Not implemented");
  }
}

export class MMLUProParquetDataLoader extends AbstractDataLoader {
  override readonly kind = "mmlu-pro.load.parquet.data";

  override async loadData(params: {
    content: Uint8Array;
  }): Promise<
    LoaderResult<
      MMLUProMainTestCaseV1,
      MMLUProMainResponseV1,
      MMLUProMainScoreV1
    >
  > {
    const data = await parquetReadObjects({
      file: params.content.buffer as ArrayBuffer,
    });
    if (!data) {
      throw new Error("Invalid Parquet file");
    }

    return mapData(jsonSchema.parse(data));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override loadBenchmarkSpec(params: {
    content: Uint8Array;
  }): Promise<MMLUProBenchmarkSpecV1> {
    throw new Error("Not implemented");
  }
}
