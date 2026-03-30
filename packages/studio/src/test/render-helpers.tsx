import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { ReactElement } from "react";

export function renderWithRouter(
  element: ReactElement,
  options?: RenderWithRouterOptions,
) {
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

  return render(
    <MemoryRouter initialEntries={entries}>{content}</MemoryRouter>,
  );
}

interface RenderWithRouterOptions {
  route?: string;
  path?: string;
  searchParams?: Record<string, string>;
}
