import { useState, useEffect, useCallback } from "react";
import { userLocalKeyStorage } from "@/utils/user-local-key-storage";
import { validateUserLocalKey } from "@/validation/user-local-key";

export const useUserLocalKey = () => {
  const [userLocalKey, setUserLocalKey] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadKey = () => {
      const key = userLocalKeyStorage.get();
      setUserLocalKey(key);

      if (key) {
        const validation = validateUserLocalKey(key);
        setIsValid(validation.isValid);
      } else {
        setIsValid(false);
      }

      setIsLoading(false);
    };

    loadKey();
  }, []);

  const setKey = useCallback((key: string) => {
    const result = userLocalKeyStorage.set(key);
    if (result.success) {
      setUserLocalKey(key);
      setIsValid(true);
      return { success: true };
    } else {
      return { success: false, error: result.error };
    }
  }, []);

  const removeKey = useCallback(() => {
    const success = userLocalKeyStorage.remove();
    if (success) {
      setUserLocalKey(null);
      setIsValid(false);
    }
    return success;
  }, []);

  const refreshKey = useCallback(() => {
    const key = userLocalKeyStorage.get();
    setUserLocalKey(key);

    if (key) {
      const validation = validateUserLocalKey(key);
      setIsValid(validation.isValid);
    } else {
      setIsValid(false);
    }
  }, []);

  return {
    userLocalKey,
    isValid,
    isLoading,
    setKey,
    removeKey,
    refreshKey,
    hasKey: !!userLocalKey && isValid,
  };
};
