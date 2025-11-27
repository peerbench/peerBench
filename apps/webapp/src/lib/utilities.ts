import { NextResponse } from "next/server";

export type UnpackPromise<T> = T extends Promise<any> ? Awaited<T> : T;

export type NextResponseType<T> = T extends
  | NextResponse<infer U>
  | Promise<NextResponse<infer U>>
  ? UnpackPromise<U>
  : T extends (...args: any) => NextResponse | Promise<NextResponse>
    ? NextResponseType<ReturnType<T>>
    : never;

export type ClientSideResponseType<T> =
  T extends Record<string, any>
    ? {
        [K in keyof T]: T[K] extends Date
          ? string
          : ClientSideResponseType<T[K]>;
      }
    : T extends Array<infer U>
      ? Array<ClientSideResponseType<U>>
      : T extends Date
        ? string
        : T;
