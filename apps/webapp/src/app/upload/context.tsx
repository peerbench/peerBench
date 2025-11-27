"use client";
import {
  PromptSetSelectHandler,
  PromptSetSelectOption,
} from "@/components/prompt-set-select";
import { uploadAction } from "@/lib/actions/upload";
import { QK_PROMPT_SETS, QK_PROMPTS } from "@/lib/react-query/query-keys";
import {
  DataParser,
  hashObject,
  NonRevealedPromptResponseSchema,
  NonRevealedPromptSchema,
  PBParser,
  Prompt,
  PromptResponse,
  PromptResponseSchema,
  PromptSchema,
  PromptScore,
  PromptScoreSchema,
  RateLimiter,
} from "peerbench";
import { useQueryClient } from "@tanstack/react-query";
import { usePromptAPI } from "@/lib/hooks/use-prompt-api";
import {
  createContext,
  useContext,
  ReactNode,
  Dispatch,
  SetStateAction,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useResponsesAPI } from "@/lib/hooks/use-responses-api";
import { useScoreAPI } from "@/lib/hooks/use-score-api";

type StateFields = {
  isRevealed?: boolean;
  isRegistered?: boolean;
  upload: boolean;
  reveal: boolean;
  hashCIDRegistration: string;
  hashSha256Registration: string;
};

export type PromptState = Prompt & StateFields;
export type PromptResponseState = PromptResponse & StateFields;
export type PromptScoreState = PromptScore & StateFields;

export type EntityState = PromptState | PromptResponseState | PromptScoreState;
export type EntityType = "prompts" | "responses" | "scores";

export type PageContextType = {
  prompts: PromptState[];
  setPrompts: Dispatch<SetStateAction<PromptState[]>>;

  responses: PromptResponseState[];
  setResponses: Dispatch<SetStateAction<PromptResponseState[]>>;

  scores: PromptScoreState[];
  setScores: Dispatch<SetStateAction<PromptScoreState[]>>;

  uploadedFileName: string | null;
  setUploadedFileName: Dispatch<SetStateAction<string | null>>;

  isUploadedFileFollowsStandardFormat: boolean;
  setIsUploadedFileFollowsStandardFormat: Dispatch<SetStateAction<boolean>>;

  isParsing: boolean;
  setIsParsing: Dispatch<SetStateAction<boolean>>;

  isUploading: boolean;
  setIsUploading: Dispatch<SetStateAction<boolean>>;

  selectedPromptSet: PromptSetSelectOption | null;
  setSelectedPromptSet: Dispatch<SetStateAction<PromptSetSelectOption | null>>;

  promptSelectHandler: React.RefObject<PromptSetSelectHandler | null>;
  uploadBlockerMessage?: string;
  promptsToBeProcessedInfo: {
    toBeUploadedCount: number;
    toBeRevealedCount: number;
    isLoadingStatuses: boolean;
  };
  responsesToBeProcessedInfo: {
    toBeUploadedCount: number;
    toBeRevealedCount: number;
    isLoadingStatuses: boolean;
  };
  scoresToBeProcessedInfo: {
    toBeUploadedCount: number;
    isLoadingStatuses: boolean;
  };

  clear: () => void;
  uploadFile: (file: File) => Promise<boolean>;
  uploadData: () => Promise<void>;
};

export function PageContextProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const promptAPI = usePromptAPI();
  const responseAPI = useResponsesAPI();
  const scoreAPI = useScoreAPI();
  const [prompts, setPrompts] = useState<PromptState[]>([]);
  const [responses, setResponses] = useState<PromptResponseState[]>([]);
  const [scores, setScores] = useState<PromptScoreState[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [
    isUploadedFileFollowsStandardFormat,
    setIsUploadedFileFollowsStandardFormat,
  ] = useState(true);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [selectedPromptSet, setSelectedPromptSet] =
    useState<PromptSetSelectOption | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const promptSelectHandler = useRef<PromptSetSelectHandler>(null);
  const promptsToBeProcessedInfo = useMemo(() => {
    let toBeUploadedCount = 0;
    let toBeRevealedCount = 0;
    let isLoadingStatuses = false;
    for (const prompt of prompts) {
      if (prompt.upload) {
        toBeUploadedCount++;
      }
      if (prompt.reveal) {
        toBeRevealedCount++;
      }
      if (
        prompt.isRegistered === undefined &&
        prompt.isRevealed === undefined
      ) {
        isLoadingStatuses = true;
      }
    }

    return {
      toBeUploadedCount,
      toBeRevealedCount,
      isLoadingStatuses,
    };
  }, [prompts]);
  const responsesToBeProcessedInfo = useMemo(() => {
    let toBeUploadedCount = 0;
    let toBeRevealedCount = 0;
    let isLoadingStatuses = false;
    for (const response of responses) {
      if (response.upload) {
        toBeUploadedCount++;
      }
      if (response.reveal) {
        toBeRevealedCount++;
      }
      if (
        response.isRegistered === undefined &&
        response.isRevealed === undefined
      ) {
        isLoadingStatuses = true;
      }
    }

    return {
      toBeUploadedCount,
      toBeRevealedCount,
      isLoadingStatuses,
    };
  }, [responses]);
  const scoresToBeProcessedInfo = useMemo(() => {
    let toBeUploadedCount = 0;
    let isLoadingStatuses = false;
    for (const score of scores) {
      if (score.upload) {
        toBeUploadedCount++;
      }
      if (score.isRegistered === undefined && score.isRevealed === undefined) {
        isLoadingStatuses = true;
      }
    }

    return {
      toBeUploadedCount,
      isLoadingStatuses,
    };
  }, [scores]);
  const uploadBlockerMessage = useMemo(() => {
    if (isUploading) {
      return "Upload in progress. Please wait.";
    }

    if (isParsing) {
      return "Parsing in progress. Please wait.";
    }

    if (!uploadedFileName) {
      return "No file selected";
    }

    if (!isUploadedFileFollowsStandardFormat) {
      return "The file doesn't follow standard peerBench format";
    }

    if (prompts.length === 0 && responses.length === 0 && scores.length === 0) {
      return "No data found to upload";
    }

    if (!selectedPromptSet) {
      return "Please select a Benchmark";
    }

    if (
      promptsToBeProcessedInfo.toBeUploadedCount === 0 &&
      promptsToBeProcessedInfo.toBeRevealedCount === 0 &&
      responsesToBeProcessedInfo.toBeUploadedCount === 0 &&
      responsesToBeProcessedInfo.toBeRevealedCount === 0 &&
      scoresToBeProcessedInfo.toBeUploadedCount === 0
    ) {
      return "No data chosen to upload";
    }

    if (
      promptsToBeProcessedInfo.isLoadingStatuses ||
      responsesToBeProcessedInfo.isLoadingStatuses ||
      scoresToBeProcessedInfo.isLoadingStatuses
    ) {
      return "Checking statuses";
    }

    return undefined;
  }, [
    isUploading,
    isParsing,
    uploadedFileName,
    isUploadedFileFollowsStandardFormat,
    prompts,
    responses,
    scores,
    selectedPromptSet,
    promptsToBeProcessedInfo,
    responsesToBeProcessedInfo,
    scoresToBeProcessedInfo,
  ]);

  const fetchPromptStatuses = useCallback(
    async (uploadedPrompts: PromptState[]) => {
      await fetchStatuses(uploadedPrompts, {
        buildPayload: (chunk) => ({
          prompts: chunk.map((prompt) => ({
            id: prompt.promptUUID,
            hashSha256Registration: prompt.hashSha256Registration,
            hashCIDRegistration: prompt.hashCIDRegistration,
          })),
        }),
        fetchStatuses: (payload) => promptAPI.getStatuses(payload),
        getKey: (prompt) => prompt.promptUUID,
        updateStates: (statusUpdates) => {
          setPrompts((prev) =>
            prev.map((prompt) => {
              const status = statusUpdates[prompt.promptUUID];
              if (!status) {
                return prompt;
              }

              return {
                ...prompt,
                isRevealed: status.isRevealed,
                isRegistered: status.isRegistered,
                upload: status.isRegistered === true ? false : prompt.upload,
                reveal: status.isRevealed === true ? false : prompt.reveal,
              };
            })
          );
        },
      });
    },
    [promptAPI]
  );
  const fetchResponseStatuses = useCallback(
    async (uploadedResponses: PromptResponseState[]) => {
      await fetchStatuses(uploadedResponses, {
        buildPayload: (chunk) => ({
          responses: chunk.map((response) => ({
            id: response.responseUUID,
            hashSha256Registration: response.hashSha256Registration,
            hashCIDRegistration: response.hashCIDRegistration,
          })),
        }),
        fetchStatuses: (payload) => responseAPI.getStatuses(payload),
        getKey: (response) => response.responseUUID,
        updateStates: (statusUpdates) => {
          setResponses((prev) =>
            prev.map((response) => {
              const status = statusUpdates[response.responseUUID];
              if (!status) {
                return response;
              }

              return {
                ...response,
                isRevealed: status.isRevealed,
                isRegistered: status.isRegistered,
                upload: status.isRegistered === true ? false : response.upload,
                reveal: status.isRevealed === true ? false : response.reveal,
              };
            })
          );
        },
      });
    },
    [responseAPI]
  );
  const fetchScoreStatuses = useCallback(
    async (uploadedScores: PromptScoreState[]) => {
      await fetchStatuses(uploadedScores, {
        buildPayload: (chunk) => ({
          scores: chunk.map((score) => ({
            id: score.scoreUUID,
            hashSha256Registration: score.hashSha256Registration,
            hashCIDRegistration: score.hashCIDRegistration,
          })),
        }),
        fetchStatuses: (payload) => scoreAPI.getStatuses(payload),
        getKey: (score) => score.scoreUUID,
        updateStates: (statusUpdates) => {
          setScores((prev) =>
            prev.map((score) => {
              const status = statusUpdates[score.scoreUUID];
              if (!status) {
                return score;
              }

              return {
                ...score,
                isRevealed: status.isRevealed ?? false,
                isRegistered: status.isRegistered,
                upload: status.isRegistered === true ? false : score.upload,
                reveal: false,
              };
            })
          );
        },
      });
    },
    [scoreAPI]
  );

  const clear = useCallback(() => {
    setPrompts([]);
    setResponses([]);
    setScores([]);
    setUploadedFileName(null);
    setIsUploadedFileFollowsStandardFormat(true);
    setIsParsing(false);
    setIsUploading(false);
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      setIsParsing(true);

      try {
        const content = new Uint8Array(await file.arrayBuffer());
        const { result, parser } = await DataParser.parseContent(content);

        setUploadedFileName(file.name);

        // Fill the states with the parsed data
        result.prompts = await hashObjectArray(
          result.prompts,
          (hashInfo, prompt) => ({
            ...prompt,
            reveal: true,
            upload: true,
            hashSha256Registration: hashInfo.sha256,
            hashCIDRegistration: hashInfo.cid,
          })
        );
        setPrompts(result.prompts as PromptState[]);

        result.responses = await hashObjectArray(
          result.responses,
          (hashInfo, response) => ({
            ...response,
            upload: true,
            reveal: true,
            hashSha256Registration: hashInfo.sha256,
            hashCIDRegistration: hashInfo.cid,
          })
        );

        setResponses(result.responses as PromptResponseState[]);

        result.scores = await hashObjectArray(
          result.scores,
          (hashInfo, score) => ({
            ...score,
            upload: true,
            reveal: false,
            hashSha256Registration: hashInfo.sha256,
            hashCIDRegistration: hashInfo.cid,
          })
        );
        setScores(result.scores as PromptScoreState[]);

        // Check if the file follows standard PeerBench format
        if (parser.getIdentifier() !== PBParser.identifier) {
          setIsUploadedFileFollowsStandardFormat(false);
          return false;
        }

        // Fetch registration/reveal statuses for the
        // found entities in the background (don't await it)
        if (result.prompts.length > 0) {
          fetchPromptStatuses(result.prompts as PromptState[]);
        }

        if (result.responses.length > 0) {
          fetchResponseStatuses(result.responses as PromptResponseState[]);
        }

        if (result.scores.length > 0) {
          fetchScoreStatuses(result.scores as PromptScoreState[]);
        }

        return true;
      } catch (err) {
        setUploadedFileName(null);
        setPrompts([]);
        setResponses([]);
        setScores([]);
        throw err;
      } finally {
        setIsParsing(false);
      }
    },
    [fetchPromptStatuses, fetchResponseStatuses, fetchScoreStatuses]
  );

  const uploadData = useCallback(async () => {
    let newPromptCount = 0;

    try {
      setIsUploading(true);
      const promptsToBeProcessed = [];
      const responsesToBeProcessed = [];
      const scoresToBeProcessed = [];
      for (const prompt of prompts) {
        // Full upload
        if (prompt.reveal) {
          promptsToBeProcessed.push({
            // Use schemas to build the pure object
            ...PromptSchema.parse(prompt),
            // TODO: Add signature fields
          });
        }
        // Non-revealed upload
        else if (prompt.upload) {
          promptsToBeProcessed.push({
            ...NonRevealedPromptSchema.parse(prompt),

            // Use the full object hash calculations
            hashCIDRegistration: prompt.hashCIDRegistration,
            hashSha256Registration: prompt.hashSha256Registration,
            // TODO: Add signature fields
          });
          newPromptCount++;
        }
      }

      for (const response of responses) {
        // Full upload
        if (response.reveal) {
          responsesToBeProcessed.push({
            ...PromptResponseSchema.parse(response),
            // TODO: Add signature fields
          });
        }
        // Non-revealed upload
        else if (response.upload) {
          responsesToBeProcessed.push({
            ...NonRevealedPromptResponseSchema.parse(response),

            // Use the full object hash calculations
            hashCIDRegistration: response.hashCIDRegistration,
            hashSha256Registration: response.hashSha256Registration,
            // TODO: Add signature fields
          });
        }
      }

      for (const score of scores) {
        if (score.upload !== true) {
          continue;
        }

        // We expect that the parser has parsed the Response and Prompts
        // separately and we are looking for the ones that are related to this Score.
        const response = responses.find(
          (r) => r.responseUUID === score.responseUUID
        );
        if (!response) {
          throw new Error(
            `Response data not found for Score ${score.scoreUUID} inside the uploaded Responses`
          );
        }

        const prompt = prompts.find(
          (p) => p.promptUUID === score.prompt?.promptUUID
        );
        if (!prompt) {
          throw new Error(
            `Prompt data not found for Score ${score.scoreUUID} inside the uploaded Prompts`
          );
        }

        scoresToBeProcessed.push({
          ...PromptScoreSchema.parse(score),
          responseHashSha256Registration: response.hashSha256Registration,
          responseHashCIDRegistration: response.hashCIDRegistration,
          promptHashSha256Registration: prompt.hashSha256Registration,
          promptHashCIDRegistration: prompt.hashCIDRegistration,
          // TODO: Add signature fields
        });
      }

      const rateLimiter = new RateLimiter();
      const chunkSize = 210; // Chunk size per entity (3 / 210 = 70 prompts, responses and scores per API call)

      while (true) {
        const promptsChunk = promptsToBeProcessed.slice(0, chunkSize / 3);
        const scoresChunk = scoresToBeProcessed.slice(0, chunkSize / 3);
        const responsesChunk = responsesToBeProcessed.slice(0, chunkSize / 3);

        // No more data to upload
        if (
          promptsChunk.length === 0 &&
          responsesChunk.length === 0 &&
          scoresChunk.length === 0
        ) {
          break;
        }

        const result = await rateLimiter.execute(() =>
          uploadAction({
            promptSetId: selectedPromptSet!.id!,
            prompts: promptsChunk.length > 0 ? promptsChunk : undefined,
            responses: responsesChunk.length > 0 ? responsesChunk : undefined,
            scores: scoresChunk.length > 0 ? scoresChunk : undefined,
          })
        );

        if (result?.error) {
          throw new Error(result.error);
        }

        // Remove the uploaded chunk from the arrays so in the next iteration
        // we will pick up the next chunk.
        promptsToBeProcessed.splice(0, chunkSize / 3);
        responsesToBeProcessed.splice(0, chunkSize / 3);
        scoresToBeProcessed.splice(0, chunkSize / 3);
      }

      // Invalidate query caches
      queryClient.invalidateQueries({
        predicate: (query) =>
          // Prompt Set lists query
          query.queryKey[0] === QK_PROMPT_SETS ||
          // Prompts query
          query.queryKey[0] === QK_PROMPTS,
      });

      // Update the selected Prompt Set since revalidating the query
      // won't update the local state of this component.
      setSelectedPromptSet((prev) => ({
        ...prev!,
        totalPromptsCount: (prev!.totalPromptsCount ?? 0) + newPromptCount,
      }));

      // Clear data states
      setPrompts([]);
      setResponses([]);
      setScores([]);
    } finally {
      setIsUploading(false);
    }
  }, [selectedPromptSet, prompts, responses, scores, queryClient]);

  return (
    <PageContext.Provider
      value={{
        isParsing,
        setIsParsing,

        isUploadedFileFollowsStandardFormat,
        setIsUploadedFileFollowsStandardFormat,

        uploadedFileName,
        setUploadedFileName,

        prompts,
        setPrompts,

        responses,
        setResponses,

        scores,
        setScores,

        selectedPromptSet,
        setSelectedPromptSet,

        isUploading,
        setIsUploading,

        promptSelectHandler,
        uploadBlockerMessage,
        promptsToBeProcessedInfo,
        responsesToBeProcessedInfo,
        scoresToBeProcessedInfo,

        clear,
        uploadFile,
        uploadData,
      }}
    >
      {children}
    </PageContext.Provider>
  );
}

type StatusUpdate = {
  isRevealed?: boolean;
  isRegistered: boolean;
};

async function fetchStatuses<TEntity, TPayload extends Record<string, unknown>>(
  entities: TEntity[],
  options: {
    chunkSize?: number;
    buildPayload: (chunk: TEntity[]) => TPayload;
    fetchStatuses: (payload: TPayload) => Promise<StatusUpdate[]>;
    getKey: (entity: TEntity) => string;
    updateStates: (newStates: Record<string, StatusUpdate>) => void;
  }
) {
  try {
    const rateLimiter = new RateLimiter();
    const chunkSize = options.chunkSize ?? 1000;
    const statusUpdates: Record<string, StatusUpdate> = {};

    for (let i = 0; i < entities.length; i += chunkSize) {
      const chunk = entities.slice(i, i + chunkSize);
      if (chunk.length === 0) {
        continue;
      }

      const payload = options.buildPayload(chunk);
      const statuses = await rateLimiter.execute(() =>
        options.fetchStatuses(payload)
      );

      chunk.forEach((entity, index) => {
        const status = statuses[index];
        if (!status) {
          return;
        }

        statusUpdates[options.getKey(entity)] = {
          isRegistered: status.isRegistered,
          isRevealed: status.isRegistered ? status.isRevealed : undefined,
        };
      });
    }

    options.updateStates(statusUpdates);
  } catch (error) {
    console.error("Failed to fetch statuses:", error);
  }
}

async function hashObjectArray<
  TObj extends Prompt | PromptResponse | PromptScore,
  TResult extends Record<string, any> = Record<string, any>,
>(
  objs: TObj[],
  mapFn?: (hashInfo: { cid: string; sha256: string }, obj: TObj) => TResult
) {
  return await Promise.all(
    objs.map((obj) => {
      return new Promise<TResult>((res) => {
        // Hash each object on the idle time so the UI won't freeze
        requestIdleCallback(async () => {
          const hashInfo = await hashObject(obj);

          res(mapFn ? mapFn(hashInfo, obj) : (hashInfo as unknown as TResult));
        });
      });
    })
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
