import { tryReadResponse } from "../try-read-response";
import { convertToQueryParams } from "./convert-to-query-params";

/**
 * Creates a function that calls the given URL with the parameters using `fetch`.
 */
export function createApiCaller<
  Params extends Record<string, any | any[] | undefined | null>,
  ResponseType,
>(
  url: string,
  options: {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    errorMessagePrefix?: string;
  }
) {
  return async (params?: Params, overrideURL?: string) => {
    const queryParams =
      options.method === "GET" ? convertToQueryParams(params) : "";
    const fullURL = queryParams
      ? `${overrideURL ?? url}?${queryParams}`
      : (overrideURL ?? url);

    const headers: Record<string, string> = {};
    const body = options.method !== "GET" ? JSON.stringify(params) : undefined;

    if (options.method !== "GET") {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(fullURL, {
      method: options.method,
      headers: options.method !== "GET" ? headers : undefined,
      body,
    });

    if (!response.ok) {
      throw new Error(
        `${options.errorMessagePrefix || "Something went wrong"}: ${await tryReadResponse(response, "Unknown Error")}`
      );
    }

    return response.json() as Promise<ResponseType>;
  };
}
