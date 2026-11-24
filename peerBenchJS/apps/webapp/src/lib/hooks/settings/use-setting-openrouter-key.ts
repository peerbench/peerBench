import { SETTING_OPENROUTER_API_KEY } from "@/lib/settings";
import { useLocalStorage } from "../use-local-storage";

export const useSettingOpenRouterKey = (
  listenToStorageChanges: boolean = true
) => {
  return useLocalStorage<string>(SETTING_OPENROUTER_API_KEY.name, {
    listenToStorageChanges,
  });
};
