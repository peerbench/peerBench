import { SETTING_OPENAI_API_KEY } from "@/lib/settings";
import { useLocalStorage } from "../use-local-storage";

export const useSettingOpenAIKey = (listenToStorageChanges: boolean = true) => {
  return useLocalStorage<string>(SETTING_OPENAI_API_KEY.name, {
    listenToStorageChanges,
  });
};
