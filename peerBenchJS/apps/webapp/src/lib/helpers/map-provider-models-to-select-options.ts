import { ModelSelectOption } from "@/components/model-select";
import { useProviders } from "../hooks/use-providers";

/**
 * Maps Provider object into an array of objects
 * that can be used by the ModelSelect component.
 */
export function mapProviderModelsToSelectOptions(
  providers: ReturnType<typeof useProviders>
) {
  return Object.entries(providers)
    .map(([, provider]) => {
      // Provider is not usable, return a disabled entry
      if (provider.error && provider.implementation === undefined) {
        return [
          {
            disabled: true,
            providerLabel: provider.label,
            icon: provider.icon,
            message: `${provider.label} is not usable: ${provider.error}`,
          },
        ] as ModelSelectOption[];
      }

      return provider.models.map<ModelSelectOption>((model) => ({
        ...model,
        provider: provider.identifier,
        providerLabel: provider.label,
        icon: provider.icon,
      }));
    })
    .flat();
}
