import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { ReactElement } from "react";

/**
 * Creates a fresh QueryClient configured for testing.
 * - Disabled retries (tests should fail fast)
 * - Disabled refetch on window focus
 * - No garbage collection during test
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Renders a component with both QueryClientProvider and MemoryRouter.
 * Creates a fresh QueryClient per render for test isolation.
 */
export function renderWithQueryClient(
  element: ReactElement,
  options?: RenderWithQueryClientOptions
) {
  const queryClient = options?.queryClient ?? createTestQueryClient();
  const route = options?.route ?? "/";
  const entries = options?.searchParams
    ? [`${route}?${new URLSearchParams(options.searchParams).toString()}`]
    : [route];

  const content = options?.path ? (
    <Routes>
      <Route path={options.path} element={element} />
    </Routes>
  ) : (
    element
  );

  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={entries}>{content}</MemoryRouter>
    </QueryClientProvider>
  );

  return {
    ...result,
    queryClient,
  };
}

interface RenderWithQueryClientOptions {
  route?: string;
  path?: string;
  searchParams?: Record<string, string>;
  queryClient?: QueryClient;
}
