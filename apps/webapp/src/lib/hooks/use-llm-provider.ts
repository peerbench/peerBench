import { AbstractLLMProvider, MaybePromise } from "peerbench";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type LLMProviderModel = {
  modelId: string;
  perMillionTokenInputCost: string;
  perMillionTokenOutputCost: string;
};

export type LLMProvider = {
  identifier: string;
  label: string;
  models: LLMProviderModel[];
  implementation?: AbstractLLMProvider;
  isLoading?: boolean;
  error?: string;
};

export type LLMProviderInstantiateFunction = () => MaybePromise<
  | AbstractLLMProvider
  | undefined
  | [AbstractLLMProvider | undefined, LLMProviderModel[] | undefined]
>;

export function useLLMProvider(params: {
  identifier: string;
  label: string;
  defaultModels?: LLMProviderModel[];

  /**
   * Function to instantiate the Provider implementation.
   */
  instantiate: LLMProviderInstantiateFunction;
}): LLMProvider {
  const [models, setModels] = useState<LLMProviderModel[]>(
    params.defaultModels ?? []
  );
  const [error, setError] = useState<string | undefined>();
  const [isInstantiating, setIsInstantiating] = useState(false);
  const providerRef = useRef<AbstractLLMProvider | undefined>(undefined);

  const init = useCallback(async () => {
    setIsInstantiating(true);
    try {
      // If the `instantiate` function returns `undefined`, it means that the provider
      // is not ready to be initialized yet so we skip all the process and leave it as it is.
      // This is useful if the initialization of the Provider is dependent on some localStorage
      // value or anything that is available after the rendering is done on the client side.
      const providerInitInfo = await params.instantiate();
      if (!providerInitInfo) {
        console.debug(`Provider ${params.identifier} won't be initialized yet`);
        return;
      }

      let provider: AbstractLLMProvider | undefined;

      if (Array.isArray(providerInitInfo)) {
        provider = providerInitInfo[0];
        if (providerInitInfo[1]) {
          setModels(providerInitInfo[1]);
        }
      } else {
        provider = providerInitInfo;
      }

      providerRef.current = provider;

      if (!provider) {
        throw new Error(`Provider ${params.label} couldn't be initialized`);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error(error);
    } finally {
      setIsInstantiating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.instantiate]);

  // Initialize the Provider whenever the `instantiate` function is changed
  useEffect(() => {
    init();
  }, [init]);

  return useMemo(
    () => ({
      identifier: params.identifier,
      label: params.label,
      models,
      isLoading: isInstantiating,
      error,
      implementation: providerRef.current,
    }),
    [models, error, params.identifier, params.label, isInstantiating]
  );
}
