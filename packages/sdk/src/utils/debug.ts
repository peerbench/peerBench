/**
 * Only for internal usage. Logs the arguments only if
 * a certain environment variable is set.
 */
export function debugLog(...args: any[]) {
  if (process?.env?.PB_SDK_DEBUG) {
    console.log(`[${new Date().toISOString()}] PB_SDK_DEBUG:`, ...args);
  }
}
