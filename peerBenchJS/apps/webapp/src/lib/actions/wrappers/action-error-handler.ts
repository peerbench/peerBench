/**
 * Wraps a server action and handles the thrown errors by converting them to a
 * plain object that can be interpreted on the client side.
 */
export function actionErrorHandler<T>(f: (...args: any[]) => Promise<T>) {
  return async (...args: any[]) => {
    try {
      return await f(...args);
    } catch (error) {
      console.error("Error in action", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };
}
