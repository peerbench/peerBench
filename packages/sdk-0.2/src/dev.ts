import { MMLUProMainTestCaseSchemaV1 } from "./benchmarks/mmlu-pro";
import { idGeneratorUUIDv7 } from "./utils";

async function main() {
  const abc = await MMLUProMainTestCaseSchemaV1.new({
    id: "123",
    answerKey: "A",
    answer: "A",
    options: {
      A: "A",
      B: "B",
      C: "C",
      D: "D",
    },
    question: "What is the capital of France?",
  }).withId(idGeneratorUUIDv7);
  console.log(JSON.stringify(abc, null, 2));
}

main();
