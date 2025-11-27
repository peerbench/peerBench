import { validateUserLocalKey } from "@/validation/user-local-key";

const USER_LOCAL_KEY_STORAGE_KEY = "user_local_key";

export const userLocalKeyStorage = {
  /**
   * Get the user local key from localStorage
   */
  get: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(USER_LOCAL_KEY_STORAGE_KEY);
  },

  /**
   * Set the user local key in localStorage with validation
   */
  set: (key: string): { success: boolean; error?: string } => {
    if (typeof window === "undefined") {
      return { success: false, error: "Not available in server environment" };
    }

    const validation = validateUserLocalKey(key);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    try {
      localStorage.setItem(USER_LOCAL_KEY_STORAGE_KEY, key);
      return { success: true };
    } catch {
      return { success: false, error: "Failed to save key to localStorage" };
    }
  },

  /**
   * Remove the user local key from localStorage
   */
  remove: (): boolean => {
    if (typeof window === "undefined") return false;
    try {
      localStorage.removeItem(USER_LOCAL_KEY_STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if a user local key exists and is valid
   */
  hasValidKey: (): boolean => {
    const key = userLocalKeyStorage.get();
    if (!key) return false;

    const validation = validateUserLocalKey(key);
    return validation.isValid;
  },

  /**
   * Get the storage key name (useful for debugging)
   */
  getStorageKey: (): string => USER_LOCAL_KEY_STORAGE_KEY,
};
