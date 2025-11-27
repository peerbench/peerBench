import { useCallback, useEffect, useRef, useState } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useDebouncedCallback<Callback extends (...args: any[]) => any>(
  fn: Callback,
  delay: number,
  dependencies?: React.DependencyList
): (
  ...args: Parameters<Callback>
) => ReturnType<Callback> extends Promise<any>
  ? ReturnType<Callback>
  : Promise<ReturnType<Callback>> {
  const timeout = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<Callback>) => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }

      return new Promise((resolve) => {
        timeout.current = setTimeout(async () => {
          resolve(await fn(...args));
        }, delay);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn, delay, ...(dependencies || [])]
  ) as Callback;
}
