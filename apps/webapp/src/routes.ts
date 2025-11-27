/**
 * Definitions to handle protected routes, used by the middleware (utils/supabase/middleware.ts).
 * "protected" means the user must be "authenticated" (not authorized) to access the route.
 * Use path-to-regexp format to define routes. Use the exact path that needs to be protected.
 *
 * More info about path-to-regexp:
 * https://github.com/pillarjs/path-to-regexp
 */
export const protectedRoutes = [
  "/reset-password",
  "/benchmark",
  "/compare",
  "/myActivity",
  "/profile",
  "/prompt-sets/create",
  "/prompt-sets/view/:id/edit",
  "/prompts/create",
  "/prompts/review",
  "/settings",
  "/stats",
  "/supporting-documents",
  "/upload",
] as const;

export type RedirectRouteRule = {
  from: string;
  to: string;
  when: "authenticated" | "unauthenticated";
};

export const redirectRoutes: RedirectRouteRule[] = [
  { from: "/forgot-password", to: "/", when: "authenticated" },

  { from: "/login", to: "/", when: "authenticated" },
  { from: "/signup", to: "/", when: "authenticated" },
  { from: "/signup/confirm/:code", to: "/", when: "authenticated" },
] as const;
