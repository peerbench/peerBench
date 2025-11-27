/**
 * Formats the given milliseconds into a human-readable time string.
 * @param ms The time in milliseconds
 */
export function formatMs(
  ms: number,
  options?: {
    /**
     * When true, includes all time units (days, hours, minutes, seconds, ms) in the output
     */
    full?: boolean;

    /**
     * Indicates which time units to include in the output. Defaults to ["millisecond", "second", "minute", "hour", "day"]. Only used if `full` option is true.
     */
    include?: ("millisecond" | "hour" | "second" | "minute" | "day")[];
  }
) {
  const {
    full = false,
    include = ["millisecond", "second", "minute", "hour", "day"],
  } = options ?? {};
  const totalSeconds = ms / 1000;

  if (full) {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = ms % 1000;

    const parts: string[] = [];

    if (days > 0 && include.includes("day")) {
      parts.push(days + (days === 1 ? " day" : " days"));
    }
    if (hours > 0 && include.includes("hour")) {
      parts.push(hours + (hours === 1 ? " hour" : " hours"));
    }
    if (minutes > 0 && include.includes("minute")) {
      parts.push(minutes + (minutes === 1 ? " minute" : " minutes"));
    }
    if (seconds > 0 && include.includes("second")) {
      parts.push(seconds + (seconds === 1 ? " second" : " seconds"));
    }
    if (milliseconds > 0 && include.includes("millisecond")) {
      parts.push(milliseconds + "ms");
    }

    return parts.join(", ");
  }

  if (totalSeconds >= 86400) {
    const days = Math.floor(totalSeconds / 86400);
    return days.toFixed(2) + (days === 1 ? " day" : " days");
  }
  // Otherwise, if there are at least 3600 seconds, show hours only.
  else if (totalSeconds >= 3600) {
    const hours = Math.floor(totalSeconds / 3600);
    return hours.toFixed(0) + (hours === 1 ? " hour" : " hours");
  }
  // Otherwise, if there are at least 60 seconds, show minutes only.
  else if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    return minutes.toFixed(0) + (minutes === 1 ? " minute" : " minutes");
  }
  // Otherwise, if there is at least 1 second, show seconds.
  else if (totalSeconds >= 1) {
    return (
      totalSeconds.toFixed(0) + (totalSeconds === 1 ? " second" : " seconds")
    );
  }
  // Otherwise, show milliseconds.
  else {
    return ms.toFixed(0) + "ms";
  }
}

/**
 * Converts a byte array to a string using the TextDecoder
 * @param buffer - The byte array to convert
 * @returns The string representation of the byte array
 */
export function bufferToString(buffer: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * Converts a string to a byte array using the TextEncoder
 * @param str - The string to convert
 * @returns The byte array representation of the string
 */
export function stringToBuffer(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Python like string formatter. Replaces the `{key}` with the value from the `values` object.
 */
export function formatString(str: string, values: Record<string, string>) {
  return str.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);
}
