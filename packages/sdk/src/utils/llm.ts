import { jsonrepair } from "jsonrepair";

/**
 * Tries to repair and parse LLM response as a JSON object. LLM must
 * be configured to return a JSON object. This function only helps to
 * get rid out of some additional formatting (e.g. ```json) and repair
 * the JSON syntax (e.g missing comma, single quotes instead double).
 */
export function parseResponseAsJSON<T>(response: string) {
  try {
    return JSON.parse(jsonrepair(response)) as T;
  } catch (e) {
    if (process?.env?.PB_SDK_DEBUG) {
      console.log("Original response", JSON.stringify(response));
      console.error("Error parsing response as JSON", e);
    }
  }
}
