import { useSyncExternalStore } from "react";

const STORAGE_KEY = "advancedMode";

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function setAdvancedMode(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // localStorage unavailable
  }
  listeners.forEach((l) => l());
}

export function useAdvancedMode() {
  const advancedMode = useSyncExternalStore(subscribe, getSnapshot);
  return [advancedMode, setAdvancedMode] as const;
}
