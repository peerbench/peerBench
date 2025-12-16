import { SETTING_GOOGLE_API_KEY } from "@/lib/settings";
import { useLocalStorage } from "../use-local-storage";

export const useSettingGoogleKey = (listenToStorageChanges: boolean = true) => {
  return useLocalStorage<string>(SETTING_GOOGLE_API_KEY.name, {
    listenToStorageChanges,
  });
};
