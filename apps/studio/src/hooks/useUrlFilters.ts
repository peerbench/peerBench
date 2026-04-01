import { useSearchParams } from "react-router-dom";
import { useCallback } from "react";

function useUrlFilters({ resetPageOnChange = true }: UseUrlFiltersOptions = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const setFilter = useCallback(
    (key: string, value: string | null | undefined) => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (resetPageOnChange) {
        params.delete("page");
      }
      setSearchParams(params);
    },
    [searchParams, setSearchParams, resetPageOnChange],
  );

  const clearAllFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  const goToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams);
      if (page <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(page));
      }
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  return { searchParams, setSearchParams, setFilter, clearAllFilters, goToPage };
}

export { useUrlFilters };

interface UseUrlFiltersOptions {
  resetPageOnChange?: boolean;
}
