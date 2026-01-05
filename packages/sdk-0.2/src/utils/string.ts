/**
 * Converts the given byte array to a string
 */
export function bufferToString(buffer: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * Converts the given string to a byte array
 */
export function stringToBuffer(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}
