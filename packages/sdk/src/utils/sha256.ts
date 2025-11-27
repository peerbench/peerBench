/**
 * Calculates the SHA-256 hash of the given text or byte array.
 * @param input - The text or byte array to calculate the hash of.
 * @returns The SHA-256 hash of the given input.
 */
export async function calculateSHA256(
  input: string | Uint8Array
): Promise<string> {
  if (typeof window !== "undefined" && window.crypto) {
    // Browser environment
    let data: Uint8Array;
    if (input instanceof Uint8Array) {
      data = input;
    } else {
      const encoder = new TextEncoder();
      data = encoder.encode(input);
    }
    const buffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } else {
    // Node.js environment
    const { createHash } = await import("crypto");
    if (input instanceof Uint8Array) {
      return createHash("sha256").update(Buffer.from(input)).digest("hex");
    }
    return createHash("sha256").update(input).digest("hex");
  }
}
