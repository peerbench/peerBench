import { SETTING_EXTRA } from "@/lib/settings";
import { useLocalStorage } from "../use-local-storage";

export const useSettingExtra = (listenToStorageChanges: boolean = true) => {
  return useLocalStorage(SETTING_EXTRA.name, {
    defaultValue: SETTING_EXTRA.defaultValue,
    listenToStorageChanges,
  });
};
