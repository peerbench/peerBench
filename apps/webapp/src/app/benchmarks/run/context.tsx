import {
  PromptSetSelectHandler,
  PromptSetSelectOption,
} from "@/components/prompt-set-select";
import { ModelSelectOption, ModelSelectValue } from "@/components/model-select";
import { mapProviderModelsToSelectOptions } from "@/lib/helpers/map-provider-models-to-select-options";
import { LLMProvider } from "@/lib/hooks/use-llm-provider";
import { useProviders } from "@/lib/hooks/use-providers";
import {
  Prompt,
  PromptScore,
  PromptTypes,
  ScoringMethods,
  PromptResponse,
} from "peerbench";
import React, {
  createContext,
  useContext,
  ReactNode,
  SetStateAction,
  Dispatch,
  useState,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { LogsAreaHandler } from "@/components/logs-area";
import { v7 as uuidv7 } from "uuid";
import Decimal from "decimal.js";

export const BenchmarkScoringMethods = {
  ...ScoringMethods,
  none: "none",
} as const;

export type BenchmarkScoringMethod =
  (typeof BenchmarkScoringMethods)[keyof typeof BenchmarkScoringMethods];

export type PromptsSource = "file" | "existing";

export type ResultInfo = {
  model: ModelSelectOption;
  responsesReceived: number;

  correctAnswers: number;
  wrongAnswers: number;
  unknownAnswers: number;

  totalScore: number;
  totalLatency: number;
  totalCost: Decimal;
};

export type Result = {
  response: PromptResponse;
  score?: PromptScore;
};

export type PromptToBeTested = Prompt & {
  testedByModels: string[];
};

export type PageContextType = {
  selectedModels: ModelSelectValue<true>;
  setSelectedModels: Dispatch<SetStateAction<ModelSelectValue<true>>>;

  isRunning: boolean;
  setIsRunning: Dispatch<SetStateAction<boolean>>;

  isUploading: boolean;
  setIsUploading: Dispatch<SetStateAction<boolean>>;

  isResultsUploaded: boolean;
  setIsResultsUploaded: Dispatch<SetStateAction<boolean>>;

  isLoadingPrompts: boolean;
  setIsLoadingPrompts: Dispatch<SetStateAction<boolean>>;

  isUploadedFileFollowsStandardFormat: boolean;
  setIsUploadedFileFollowsStandardFormat: Dispatch<SetStateAction<boolean>>;

  includeScoredPrompts: boolean;
  setIncludeScoredPrompts: Dispatch<SetStateAction<boolean>>;

  resultInfos: ResultInfo[];
  setResultInfos: Dispatch<SetStateAction<ResultInfo[]>>;

  promptsToBeTested: PromptToBeTested[];
  setPromptsToBeTested: Dispatch<SetStateAction<PromptToBeTested[]>>;

  results: Result[];
  addResult: (result: Result) => void;
  clearResults: () => void;

  selectedPromptSet: PromptSetSelectOption | null;
  setSelectedPromptSet: Dispatch<SetStateAction<PromptSetSelectOption | null>>;

  providers: Record<string, LLMProvider & { icon: string }>;

  isInputDisabled: () => boolean;

  promptsSource: PromptsSource | null;
  setPromptsSource: Dispatch<SetStateAction<PromptsSource | null>>;

  savePromptSetSelectHandler: React.RefObject<PromptSetSelectHandler | null>;
  existingPromptSetSelectHandler: React.RefObject<PromptSetSelectHandler | null>;

  uploadedFileName: string | null;
  setUploadedFileName: Dispatch<SetStateAction<string | null>>;

  benchmarkAbortController: React.RefObject<AbortController | null>;

  selectedAiScorerModel: ModelSelectValue<false>;
  setSelectedAiScorerModel: Dispatch<SetStateAction<ModelSelectValue<false>>>;

  areThereOpenEndedPrompts: boolean;
  isAiScorerSelectionRequired: boolean;

  modelSelectOptions: ModelSelectOption[];

  scoringMethod: BenchmarkScoringMethod;
  setScoringMethod: Dispatch<SetStateAction<BenchmarkScoringMethod>>;

  logsHandler: React.RefObject<LogsAreaHandler | null>;

  submitHumanScore: (resultIndex: number, score: number) => void;

  areAllResponsesScored: boolean;
  setAreAllResponsesScored: Dispatch<SetStateAction<boolean>>;

  runId: React.RefObject<string>;
  startedAt: React.RefObject<number>;
  finishedAt: React.RefObject<number>;
};

export function PageContextProvider({ children }: { children: ReactNode }) {
  const providers = useProviders();
  const [selectedModels, setSelectedModels] = useState<ModelSelectValue<true>>(
    []
  );
  const [isRunning, setIsRunning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [
    isUploadedFileFollowsStandardFormat,
    setIsUploadedFileFollowsStandardFormat,
  ] = useState(true);
  const [includeScoredPrompts, setIncludeScoredPrompts] = useState(false);
  const [resultInfos, setResultInfos] = useState<ResultInfo[]>([]);
  const [promptsToBeTested, setPromptsToBeTested] = useState<
    PromptToBeTested[]
  >([]);
  const [isResultsUploaded, setIsResultsUploaded] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [selectedPromptSet, setSelectedPromptSet] =
    useState<PromptSetSelectOption | null>(null);
  const [promptsSource, setPromptsSource] = useState<PromptsSource | null>(
    null
  );
  const [areThereOpenEndedPrompts, setAreThereOpenEndedPrompts] =
    useState(false);
  const [isAiScorerSelectionRequired, setIsAiScorerSelectionRequired] =
    useState(false);
  const [selectedAiScorerModel, setSelectedAiScorerModel] =
    useState<ModelSelectValue<false>>(null);
  const [scoringMethod, setScoringMethod] = useState<BenchmarkScoringMethod>(
    BenchmarkScoringMethods.algo
  );
  const [results, setResults] = useState<Result[]>([]);
  const [areAllResponsesScored, setAreAllResponsesScored] = useState(true);
  const runId = useRef<string>("");
  const startedAt = useRef<number>(0);
  const finishedAt = useRef<number>(0);
  const logsHandler = useRef<LogsAreaHandler | null>(null);
  const savePromptSetSelectHandler = useRef<PromptSetSelectHandler>(null);
  const existingPromptSetSelectHandler = useRef<PromptSetSelectHandler>(null);
  const benchmarkAbortController = useRef<AbortController | null>(null);
  const modelSelectOptions = useMemo(
    () => mapProviderModelsToSelectOptions(providers),
    [providers]
  );

  const isInputDisabled = () => {
    return isRunning || isUploading;
  };

  const addResult = (result: Result) => {
    setResults((old) => [...old, result]);
    setResultInfos((prev) =>
      prev.map((resultInfo) => {
        if (
          resultInfo.model.modelId === result.response.modelSlug &&
          resultInfo.model.provider === result.response.provider
        ) {
          const latency =
            result.response.finishedAt - result.response.startedAt;

          const inputCost = result.response.inputCost
            ? new Decimal(result.response.inputCost)
            : new Decimal(0);
          const outputCost = result.response.outputCost
            ? new Decimal(result.response.outputCost)
            : new Decimal(0);

          const scoreInputCost = result.score?.scorerAIInputCost
            ? new Decimal(result.score.scorerAIInputCost)
            : new Decimal(0);
          const scoreOutputCost = result.score?.scorerAIOutputCost
            ? new Decimal(result.score.scorerAIOutputCost)
            : new Decimal(0);

          return {
            ...resultInfo,
            responsesReceived: resultInfo.responsesReceived + 1,
            totalScore: resultInfo.totalScore + (result.score?.score || 0),
            totalLatency: resultInfo.totalLatency + latency,
            totalCost: resultInfo.totalCost
              .add(inputCost)
              .add(outputCost)
              .add(scoreInputCost)
              .add(scoreOutputCost),

            // TODO: Maybe we can also allow user to set these thresholds. For the time being it is fine since this is only used for the UI
            correctAnswers:
              resultInfo.correctAnswers +
              ((result.score?.score ?? 0) >= 0.5 ? 1 : 0),
            wrongAnswers:
              resultInfo.wrongAnswers +
              ((result.score?.score ?? 0) < 0.5 ? 1 : 0),
            unknownAnswers:
              resultInfo.unknownAnswers +
              (result.score?.score === undefined ? 1 : 0),
          };
        }

        return resultInfo;
      })
    );
  };

  const submitHumanScore = (responseIndex: number, score: number) => {
    setResults((prev) => {
      const newResults = [...prev];
      newResults[responseIndex]!.score = {
        ...newResults[responseIndex]!.response,
        scoreUUID: uuidv7(),
        method: ScoringMethods.human,
        score: score,
        // TODO: Include explanation (need UI input)
      };

      return newResults;
    });
  };

  const clearResults = () => {
    setResults([]);
  };

  useEffect(() => {
    let hasOpenEndedPrompts = false;

    // Check if there are any open-ended Prompts within either in the uploaded file
    // or in the selected Prompt Set. Based on that value we are updating the UI text.
    if (uploadedFileName) {
      hasOpenEndedPrompts = promptsToBeTested.some(
        (prompt) => prompt.type === PromptTypes.OpenEnded
      );
    } else if (selectedPromptSet) {
      hasOpenEndedPrompts =
        selectedPromptSet.includingPromptTypes?.includes(
          PromptTypes.OpenEnded
        ) || false;
    }

    setAreThereOpenEndedPrompts(hasOpenEndedPrompts);
    setIsAiScorerSelectionRequired(
      scoringMethod === BenchmarkScoringMethods.ai
    );
  }, [promptsToBeTested, selectedPromptSet, uploadedFileName, scoringMethod]);

  useEffect(() => {
    if (isResultsUploaded) {
      setPromptsToBeTested((prev) =>
        prev.map((p) => ({
          ...p,
          // New results are uploaded which means if user doesn't enable `includeScoredPrompts` and wants to
          // re-run the benchmark, we must have the information of which prompts are tested by which models.
          testedByModels: [
            ...p.testedByModels,
            ...selectedModels.map((m) => m.modelId),
          ],
        }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResultsUploaded]);

  return (
    <PageContext.Provider
      value={{
        selectedModels,
        setSelectedModels,

        isRunning,
        setIsRunning,

        isLoadingPrompts,
        setIsLoadingPrompts,

        isUploadedFileFollowsStandardFormat,
        setIsUploadedFileFollowsStandardFormat,

        includeScoredPrompts,
        setIncludeScoredPrompts,

        resultInfos,
        setResultInfos,

        isUploading,
        setIsUploading,

        isResultsUploaded,
        setIsResultsUploaded,

        promptsToBeTested,
        setPromptsToBeTested,

        selectedPromptSet,
        setSelectedPromptSet,

        providers,

        isInputDisabled,

        promptsSource,
        setPromptsSource,

        savePromptSetSelectHandler,

        existingPromptSetSelectHandler,

        uploadedFileName,
        setUploadedFileName,

        benchmarkAbortController,

        selectedAiScorerModel,
        setSelectedAiScorerModel,

        areThereOpenEndedPrompts,
        isAiScorerSelectionRequired,

        modelSelectOptions,

        scoringMethod,
        setScoringMethod,

        results,
        addResult,
        submitHumanScore,
        clearResults,

        areAllResponsesScored,
        setAreAllResponsesScored,

        runId,
        startedAt,
        finishedAt,

        logsHandler,
      }}
    >
      {children}
    </PageContext.Provider>
  );
}

export const PageContext = createContext<PageContextType | null>(null);

export function usePageContext() {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error("usePageContext must be used inside PageContextProvider");
  }
  return context;
}
