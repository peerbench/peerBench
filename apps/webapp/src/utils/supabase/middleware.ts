import { protectedRoutes, redirectRoutes } from "@/routes";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { pathToRegexp } from "path-to-regexp";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Check if there is a redirection rule for the current route
    const redirectTo = checkRedirectionPath(
      request.nextUrl.pathname,
      "authenticated"
    );

    if (redirectTo) {
      const url = request.nextUrl.clone();
      url.pathname = redirectTo;
      return NextResponse.redirect(url);
    }
  } else {
    const redirectTo = checkRedirectionPath(
      request.nextUrl.pathname,
      "unauthenticated"
    );
    if (redirectTo) {
      const url = request.nextUrl.clone();
      url.pathname = redirectTo;
      return NextResponse.redirect(url);
    }

    const isProtected = protectedRoutes.some((route) => {
      const { regexp } = pathToRegexp(route);
      const match = request.nextUrl.pathname.match(regexp);

      return match !== null;
    });

    // User is trying to access a protected route without being authenticated.
    if (isProtected) {
      const url = request.nextUrl.clone();
      const originalUrl = request.nextUrl.pathname + request.nextUrl.search;
      url.pathname = "/login";

      // Add the original URL as a redirect parameter so we can send them back after login
      url.searchParams.set("redirect", originalUrl);
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}

// Check if there is a redirection rule for the pathname of the given request
function checkRedirectionPath(
  pathname: string,
  when: (typeof redirectRoutes)[number]["when"]
) {
  return redirectRoutes.find((route) => {
    const { regexp } = pathToRegexp(route.from);
    const match = pathname.match(regexp);

    return match !== null && route.when === when;
  })?.to;
}
