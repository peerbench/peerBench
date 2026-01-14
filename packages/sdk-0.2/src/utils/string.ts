/**
 * Converts the given byte array to a string
 */
export function bufferToString(
  buffer: Uint8Array,
  encoding: BufferEncoding = "utf-8"
): string {
  const decoder = new TextDecoder(encoding);
  return decoder.decode(buffer);
}

/**
 * Converts the given string to a byte array
 */
export function stringToBuffer(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}
