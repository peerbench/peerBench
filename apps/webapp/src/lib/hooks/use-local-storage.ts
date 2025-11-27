import { tryParseJson } from "peerbench";
import { useEffect, useState } from "react";

export function useLocalStorage<T>(
  key: string,
  options?: {
    defaultValue?: T;

    /**
     * TODO: Not implemented yet
     */
    listenToStorageChanges?: boolean;
  }
) {
  const [value, setValue] = useState<T | undefined>();

  useEffect(() => {
    const localStorageValue = tryParseJson(localStorage.getItem(key) || "");

    if (localStorageValue === undefined) {
      // localStorage.setItem(key, JSON.stringify(options?.defaultValue));
      setValue(options?.defaultValue);
    } else {
      setValue(localStorageValue);
    }
  }, [key, options?.defaultValue]);

  return [
    value,
    (newValue: T) => {
      if (typeof window === "undefined") return;
      setValue(() => {
        localStorage.setItem(key, JSON.stringify(newValue));
        return newValue;
      });
    },
  ] as const;
}
