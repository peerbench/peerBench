import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import type { ReactNode } from "react";

function createWrapper(initialEntries = ["/"]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    );
  };
}

describe("useUrlFilters", () => {
  it("setFilter sets a URL param", () => {
    const { result } = renderHook(() => useUrlFilters(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setFilter("status", "completed");
    });

    expect(result.current.searchParams.get("status")).toBe("completed");
  });

  it("setFilter removes param when value is null", () => {
    const { result } = renderHook(() => useUrlFilters(), {
      wrapper: createWrapper(["/?status=completed"]),
    });

    act(() => {
      result.current.setFilter("status", null);
    });

    expect(result.current.searchParams.has("status")).toBe(false);
  });

  it("setFilter resets page param by default", () => {
    const { result } = renderHook(() => useUrlFilters(), {
      wrapper: createWrapper(["/?page=3&status=running"]),
    });

    act(() => {
      result.current.setFilter("status", "completed");
    });

    expect(result.current.searchParams.has("page")).toBe(false);
  });

  it("setFilter preserves page when resetPageOnChange is false", () => {
    const { result } = renderHook(
      () => useUrlFilters({ resetPageOnChange: false }),
      { wrapper: createWrapper(["/?page=3"]) },
    );

    act(() => {
      result.current.setFilter("runner", "test");
    });

    expect(result.current.searchParams.get("page")).toBe("3");
  });

  it("clearAllFilters resets all params", () => {
    const { result } = renderHook(() => useUrlFilters(), {
      wrapper: createWrapper(["/?status=completed&runner=test&page=2"]),
    });

    act(() => {
      result.current.clearAllFilters();
    });

    expect(result.current.searchParams.toString()).toBe("");
  });

  it("goToPage sets page param", () => {
    const { result } = renderHook(() => useUrlFilters(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.goToPage(5);
    });

    expect(result.current.searchParams.get("page")).toBe("5");
  });

  it("goToPage removes page param for page 1", () => {
    const { result } = renderHook(() => useUrlFilters(), {
      wrapper: createWrapper(["/?page=3"]),
    });

    act(() => {
      result.current.goToPage(1);
    });

    expect(result.current.searchParams.has("page")).toBe(false);
  });
});
