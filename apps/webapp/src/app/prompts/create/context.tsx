import { ModelSelectOption, ModelSelectValue } from "@/components/model-select";
import { PromptSetSelectOption } from "@/components/prompt-set-select";
import { useAuth } from "@/components/providers/auth";
import { isAnyProviderLoading } from "@/lib/helpers/is-any-provider-loading";
import { mapProviderModelsToSelectOptions } from "@/lib/helpers/map-provider-models-to-select-options";
import { LLMProvider } from "@/lib/hooks/use-llm-provider";
import { useProviders } from "@/lib/hooks/use-providers";
import {
  calculateCID,
  calculateSHA256,
  Prompt,
  PromptResponse,
  PromptScore,
  PromptType,
  PromptTypes,
} from "peerbench";
import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  SetStateAction,
  Dispatch,
  useRef,
  useMemo,
  useEffect,
} from "react";
import { v7 as uuidv7 } from "uuid";

export type GenerationMode = "manual" | "llm-generated";
export type LLMGenerationConfig = {
  instructions: string;
  input: string;
  isGenerating: boolean;
  selectedGenerationModel: ModelSelectValue<false>;
};
export type PromptTestModel = ModelSelectValue<false> & {
  response?: PromptResponse;
  score?: PromptScore;
  error?: string;
};

interface SupportingDocument {
  id: number;
  name: string;
  content: string;
  cid: string;
  sha256: string;
  uploaderId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PageContextType = {
  getDefaultScorerForPromptType: (promptType: PromptType) => string;
  buildPromptObject: () => Promise<Prompt>;

  selectedScorer: string;
  setSelectedScorer: Dispatch<SetStateAction<string>>;

  generationMode: GenerationMode;
  setGenerationMode: Dispatch<SetStateAction<GenerationMode>>;

  selectedPromptType: PromptType;
  setSelectedPromptType: Dispatch<SetStateAction<PromptType>>;

  llmGenerationConfig: LLMGenerationConfig | null;
  setLLMGenerationConfig: Dispatch<SetStateAction<LLMGenerationConfig>>;

  providers: Record<string, LLMProvider & { icon: string }>;

  prompt: Prompt;
  setPrompt: Dispatch<SetStateAction<Prompt>>;

  showValidationErrors: boolean;
  setShowValidationErrors: Dispatch<SetStateAction<boolean>>;

  isTesting: boolean;
  setIsTesting: Dispatch<SetStateAction<boolean>>;

  isUploading: boolean;
  setIsUploading: Dispatch<SetStateAction<boolean>>;

  selectedTestModels: PromptTestModel[];
  setSelectedTestModels: Dispatch<SetStateAction<PromptTestModel[]>>;

  testingSystemPrompt: string;
  setTestingSystemPrompt: Dispatch<SetStateAction<string>>;

  selectedScorerModel: ModelSelectValue<false>;
  setSelectedScorerModel: Dispatch<SetStateAction<ModelSelectValue<false>>>;

  selectedPromptSet: PromptSetSelectOption | null;
  setSelectedPromptSet: Dispatch<SetStateAction<PromptSetSelectOption | null>>;

  lastUploadedPromptId: string | null;
  setLastUploadedPromptId: Dispatch<SetStateAction<string | null>>;

  selectedDocuments: SupportingDocument[];
  setSelectedDocuments: Dispatch<SetStateAction<SupportingDocument[]>>;

  isInProgress: boolean;

  clearPrompt: () => void;
  clearForNewPrompt: () => void;

  modelSelectOptions: ModelSelectOption[];

  noValidProvider: boolean;
};

const PageContext = createContext<PageContextType | null>(null);

export function PageContextProvider({ children }: { children: ReactNode }) {
  const user = useAuth();
  const providers = useProviders();
  const [prompt, setPrompt] = useState<Prompt>({
    promptUUID: "",
    answer: "",
    answerKey: "",
    fullPrompt: "",
    fullPromptCID: "",
    fullPromptSHA256: "",
    options: {},
    prompt: "",
    promptCID: "",
    promptSHA256: "",
    type: PromptTypes.MultipleChoice,
    metadata: {},
    scorers: [],
  });
  const [generationMode, setGenerationMode] =
    useState<GenerationMode>("manual");
  const [selectedPromptType, setSelectedPromptType] = useState<PromptType>(
    PromptTypes.MultipleChoice
  );
  const [showValidationErrors, setShowValidationErrors] =
    useState<boolean>(false);
  const [llmGenerationConfig, setLLMGenerationConfig] =
    useState<LLMGenerationConfig>({
      instructions: "",
      input: "",
      isGenerating: false,
      selectedGenerationModel: null,
    });
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedTestModels, setSelectedTestModels] = useState<
    PromptTestModel[]
  >([]);
  const [testingSystemPrompt, setTestingSystemPrompt] = useState<string>("");
  const [selectedScorerModel, setSelectedScorerModel] =
    useState<ModelSelectValue<false>>(null);
  const [selectedPromptSet, setSelectedPromptSet] =
    useState<PromptSetSelectOption | null>(null);
  const [lastUploadedPromptId, setLastUploadedPromptId] = useState<
    string | null
  >(null);
  const [selectedDocuments, setSelectedDocuments] = useState<
    SupportingDocument[]
  >([]);
  const [noValidProvider, setNoValidProvider] = useState<boolean>(false);
  const modelSelectOptions = useMemo(
    () => mapProviderModelsToSelectOptions(providers),
    [providers]
  );
  const [selectedScorer, setSelectedScorer] = useState<string>("");
  const hasDefaultsSet = useRef<boolean>(false);

  // Helper function to check if inputs should be disabled
  const isInProgress = useMemo(() => {
    const isGenerating =
      generationMode === "llm-generated" && llmGenerationConfig?.isGenerating;

    return isGenerating || isTesting || isUploading;
  }, [generationMode, llmGenerationConfig, isTesting, isUploading]);

  const clearPrompt = () => {
    setPrompt({
      promptUUID: "",
      answer: "",
      answerKey: "",
      fullPrompt: "",
      fullPromptCID: "",
      fullPromptSHA256: "",
      options: {},
      prompt: "",
      promptCID: "",
      promptSHA256: "",
      type: PromptTypes.MultipleChoice,
      metadata: {},
      scorers: [],
    });
    setSelectedDocuments([]);
  };

  const clearForNewPrompt = () => {
    // Clear the prompt data
    clearPrompt();

    // Clear test results and models
    setSelectedTestModels((prevModels) =>
      prevModels.map((model) => ({
        ...model,
        response: undefined,
        score: undefined,
        error: undefined,
      }))
    );

    // Clear LLM generation config
    setLLMGenerationConfig({
      instructions: "",
      input: "",
      isGenerating: false,
      selectedGenerationModel: null,
    });

    // Clear upload state
    setLastUploadedPromptId(null);
    setIsUploading(false);
    setIsTesting(false);
    setShowValidationErrors(false);

    // Reset to default state
    setGenerationMode("manual");

    // Note: We keep the following so user can create another prompt with same settings:
    // - selectedPromptSet (same benchmark)
    // - selectedPromptType (same prompt type)
    // - testingSystemPrompt (same system prompt)
    // - selectedScorerModel (same scorer model)
  };

  useEffect(() => {
    if (
      // The effect already done its job
      hasDefaultsSet.current ||
      // Some of the Providers didn't call their `instantiate` function yet
      Object.values(providers).every(
        (provider) =>
          provider.error === undefined && provider.implementation === undefined
      ) ||
      // Some of the Providers are still being initialized
      isAnyProviderLoading(providers)
    ) {
      return;
    }

    // Check if there is any valid Provider
    let validProvider: (typeof providers)[keyof typeof providers] | undefined;
    for (const provider of Object.values(providers)) {
      if (provider.implementation !== undefined) {
        validProvider = provider;
        break;
      }
    }

    setNoValidProvider(validProvider === undefined);

    // Select 3 default models for testing
    // from the first found valid Provider.
    if (validProvider) {
      // Try to find the default models from the list of models of the Provider
      const gemini25 = validProvider.models.find(
        (model) =>
          model.modelId.toLowerCase().includes("gemini") &&
          model.modelId.toLowerCase().includes("2.5") &&
          model.modelId.toLowerCase().includes("lite") &&
          !model.modelId.toLowerCase().includes("preview") &&
          !model.modelId.toLowerCase().includes("beta") &&
          !model.modelId.toLowerCase().includes("pro") &&
          model.modelId.toLowerCase().includes("flash") // gemini-2.5-flash
      );
      const deepseekV3 = validProvider.models.find(
        (model) =>
          model.modelId.toLowerCase().includes("deepseek") &&
          model.modelId.toLowerCase().includes("free") &&
          model.modelId.toLowerCase().includes("chat") // deepseek-v3
      );
      const llama318b = validProvider.models.find(
        (model) =>
          model.modelId.toLowerCase().includes("meta-llama") &&
          model.modelId.toLowerCase().includes("free") &&
          model.modelId.toLowerCase().includes("llama") &&
          model.modelId.toLowerCase().includes("4") &&
          model.modelId.toLowerCase().includes("maverick") // llama-4-maverick
      );

      const models: PromptTestModel[] = [];

      if (gemini25) {
        models.push({
          ...gemini25,
          provider: validProvider.identifier,
          providerLabel: validProvider.label,
          icon: validProvider.icon,
        });
      }
      if (deepseekV3) {
        models.push({
          ...deepseekV3,
          provider: validProvider.identifier,
          providerLabel: validProvider.label,
          icon: validProvider.icon,
        });
      }
      if (llama318b) {
        models.push({
          ...llama318b,
          provider: validProvider.identifier,
          providerLabel: validProvider.label,
          icon: validProvider.icon,
        });
      }

      if (models.length > 0) {
        setSelectedTestModels(models);
      }

      // Set gemini-2.5-flash-lite as default scorer model if available
      if (gemini25) {
        setSelectedScorerModel({
          ...gemini25,
          provider: validProvider.identifier,
          providerLabel: validProvider.label,
          icon: validProvider.icon,
        });
      }
    }

    hasDefaultsSet.current = true;
  }, [providers]);

  return (
    <PageContext.Provider
      value={{
        getDefaultScorerForPromptType: (promptType: PromptType) => {
          switch (promptType) {
            case PromptTypes.MultipleChoice:
              return "multiple-choice";
            case PromptTypes.OpenEnded:
              return "ref-answer-equality-llm-judge-scorer";
            case PromptTypes.OrderSentences:
              return "similarity";
            case PromptTypes.Typo:
              return "exact-match";
            default:
              return "ref-answer-equality-llm-judge-scorer";
          }
        },
        buildPromptObject: async () => ({
          promptUUID: prompt.promptUUID || uuidv7(),
          prompt: prompt.prompt,
          promptSHA256: await calculateSHA256(prompt.prompt),
          promptCID: await calculateCID(prompt.prompt).then((c) =>
            c.toString()
          ),
          fullPrompt: prompt.fullPrompt,
          fullPromptSHA256: await calculateSHA256(prompt.fullPrompt),
          fullPromptCID: await calculateCID(prompt.fullPrompt).then((c) =>
            c.toString()
          ),

          // Don't include options at all if there are no options
          options:
            Object.keys(prompt.options || {}).length > 0
              ? prompt.options
              : undefined,
          answerKey: prompt.answerKey || undefined, // Ignore empty answer key
          answer: prompt.answer || undefined, // Ignore empty answer
          metadata: {
            ...(prompt.metadata || {}),
            "generated-via": "peerbench-webapp",
            "generated-by-user-id": user?.id ?? undefined,
          },
          scorers: prompt.scorers,
          type: selectedPromptType,
        }),

        selectedScorer,
        setSelectedScorer,

        generationMode,
        setGenerationMode,

        selectedPromptType,
        setSelectedPromptType,

        llmGenerationConfig,
        setLLMGenerationConfig,

        providers,

        prompt: prompt,
        setPrompt: setPrompt,

        showValidationErrors,
        setShowValidationErrors,

        isTesting,
        setIsTesting,

        isUploading,
        setIsUploading,

        selectedTestModels,
        setSelectedTestModels,

        testingSystemPrompt,
        setTestingSystemPrompt,

        selectedScorerModel,
        setSelectedScorerModel,

        selectedPromptSet,
        setSelectedPromptSet,

        lastUploadedPromptId,
        setLastUploadedPromptId,

        selectedDocuments,
        setSelectedDocuments,

        isInProgress,

        clearPrompt,
        clearForNewPrompt,

        modelSelectOptions,

        noValidProvider,
      }}
    >
      {children}
    </PageContext.Provider>
  );
}

export function usePageContext() {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error("usePageContext must be used inside PageContextProvider");
  }
  return context;
}
