import { ApiError } from "@/errors/api-error";
import { MaybePromise } from "peerbench";
import { NextRequest, NextResponse } from "next/server";
import { NextResponseType } from "@/lib/utilities";

/** Route context = Next.js params + whatever middlewares add */
export type RouteContext<
  CustomParams extends Record<string, string> = Record<string, string>,
  AdditionalContext extends Record<string, any> = Record<string, any>,
> = { params: Promise<CustomParams> } & AdditionalContext;

/** A middleware consumes the current context and adds fields to it (or returns a NextResponse to short-circuit). */
export type Middleware<
  CIn extends RouteContext<any, any>,
  CAdd extends Record<string, any>,
  TResponse = any,
> = (
  req: NextRequest,
  ctx: CIn
) => MaybePromise<CAdd | NextResponse<TResponse>>;

/** Final handler consumes the fully-built context. */
export type FinalHandler<C extends RouteContext<any, any>, TResponse = any> = (
  req: NextRequest,
  ctx: C
) => MaybePromise<NextResponse<TResponse>>;

export class HandlerBuilder<C extends RouteContext<any, any>, TResponse = any> {
  private middlewares: Middleware<any, any, any>[] = [];

  /** Add a middleware that widens the context by CAdd. */
  use<CAdd extends Record<string, any>>(
    mw: Middleware<C, CAdd, TResponse>
  ): HandlerBuilder<C & CAdd, TResponse> {
    this.middlewares.push(mw);
    // Type-safe at runtime; we just widen the generic type for the builder
    return this as unknown as HandlerBuilder<C & CAdd, TResponse>;
  }

  /** Build a Next.js route handler (GET/POST/etc.). */
  handle<TFinal extends FinalHandler<C, any>>(final: TFinal) {
    type ResponsePayload = NextResponseType<TFinal>;

    return async (
      req: NextRequest,
      nextCtx: unknown
    ): Promise<NextResponse<ResponsePayload>> => {
      // nextCtx is Next's raw ctx (e.g., { params })
      let acc = nextCtx as C;

      try {
        for (const mw of this.middlewares) {
          const added = await mw(req, acc);

          // Short-circuit if middleware returned a response
          if (added instanceof NextResponse) {
            return added as NextResponse<ResponsePayload>;
          }

          // Merge newly added fields into the context
          acc = { ...((acc as object) || {}), ...added } as C;
        }

        return (await final(req, acc)) as NextResponse<ResponsePayload>;
      } catch (e) {
        if (e instanceof ApiError) {
          return NextResponse.json(
            { message: e.message, ...(e.body || {}) },
            { status: e.status }
          ) as NextResponse<ResponsePayload>;
        }

        // Allow throwing NextResponse from final or middlewares
        if (e instanceof NextResponse)
          return e as NextResponse<ResponsePayload>;

        console.error(
          `Error in route handler ${req.url}: ${e instanceof Error ? e.stack : "Unknown error"}`
        );
        return NextResponse.json(
          { message: "Internal server error" },
          { status: 500 }
        ) as NextResponse<ResponsePayload>;
      }
    };
  }
}

/** Convenience creator with initial ctx = { params: CustomParams } */
export const createHandler = <
  CustomParams extends Record<string, string> = Record<string, string>,
  AdditionalContext extends Record<string, any> = Record<string, any>,
>() => new HandlerBuilder<RouteContext<CustomParams, AdditionalContext>>();
