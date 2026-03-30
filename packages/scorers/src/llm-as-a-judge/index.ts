import { LLMAsAJudgeScorer } from "peerbench/scorers";
import { defineScorerEntry, type ProviderEntry } from "@peerbench/core";
import meta from "./meta";

export { LLMAsAJudgeScorer };

export function createEntry(providerRegistry: {
  find(name: string): ProviderEntry;
}) {
  return defineScorerEntry({
    ...meta,
    instantiateFromConfig(config, configSchema) {
      const { judgeProvider } = configSchema!.parse(config);
      const callable = providerRegistry
        .find(judgeProvider.provider)
        .instantiateFromConfig(judgeProvider);
      return new LLMAsAJudgeScorer({ callable });
    },
  });
}

export default createEntry;
