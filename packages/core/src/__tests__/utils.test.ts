import { describe, it, expect } from "vitest";
import { escapeRegex } from "@/utils/escape-regex";
import { extractTagContent } from "@/utils/extract-tag-content";
import { isNonEmptyString } from "@/utils/is-non-empty-string";
import { isNonNullRecord } from "@/utils/is-non-null-record";
import { normalizeWhitespace } from "@/utils/normalize-whitespace";
import { readString } from "@/utils/read-string";
import { readNullableString } from "@/utils/read-nullable-string";
import { readRequiredString } from "@/utils/read-required-string";
import { readStringArray } from "@/utils/read-string-array";
import { readRecord } from "@/utils/read-record";
import { resolveUrlLike } from "@/utils/resolve-url-like";
import { sha256 } from "@/utils/sha256";
import { uniqueStrings } from "@/utils/unique-strings";

describe("escapeRegex", () => {
  it("escapes special regex characters", () => {
    expect(escapeRegex("hello.world")).toBe("hello\\.world");
    expect(escapeRegex("a+b*c?")).toBe("a\\+b\\*c\\?");
    expect(escapeRegex("[test]")).toBe("\\[test\\]");
    expect(escapeRegex("(a|b)")).toBe("\\(a\\|b\\)");
  });

  it("leaves plain strings unchanged", () => {
    expect(escapeRegex("hello")).toBe("hello");
  });
});

describe("extractTagContent", () => {
  it("extracts content between tags", () => {
    expect(extractTagContent("<answer>hello</answer>", "answer")).toBe("hello");
  });

  it("handles multiline content", () => {
    const text = "<result>\n  line1\n  line2\n</result>";
    expect(extractTagContent(text, "result")).toBe("line1\n  line2");
  });

  it("returns null for missing tags", () => {
    expect(extractTagContent("no tags here", "answer")).toBeNull();
  });

  it("returns null for empty tag content", () => {
    expect(extractTagContent("<answer>   </answer>", "answer")).toBeNull();
  });

  it("is case-insensitive for tag names", () => {
    expect(extractTagContent("<ANSWER>hello</ANSWER>", "answer")).toBe("hello");
  });
});

describe("isNonEmptyString", () => {
  it("returns true for non-empty strings", () => {
    expect(isNonEmptyString("hello")).toBe(true);
    expect(isNonEmptyString(" ")).toBe(true);
  });

  it("returns false for empty strings", () => {
    expect(isNonEmptyString("")).toBe(false);
  });

  it("returns false for non-strings", () => {
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(42)).toBe(false);
    expect(isNonEmptyString({})).toBe(false);
  });
});

describe("isNonNullRecord", () => {
  it("returns true for plain objects", () => {
    expect(isNonNullRecord({})).toBe(true);
    expect(isNonNullRecord({ key: "value" })).toBe(true);
  });

  it("returns false for null", () => {
    expect(isNonNullRecord(null)).toBe(false);
  });

  it("returns false for arrays", () => {
    expect(isNonNullRecord([])).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isNonNullRecord("string")).toBe(false);
    expect(isNonNullRecord(42)).toBe(false);
    expect(isNonNullRecord(undefined)).toBe(false);
  });
});

describe("normalizeWhitespace", () => {
  it("collapses multiple spaces", () => {
    expect(normalizeWhitespace("hello   world")).toBe("hello world");
  });

  it("converts CRLF to LF", () => {
    expect(normalizeWhitespace("line1\r\nline2")).toBe("line1\nline2");
  });

  it("trims leading/trailing whitespace", () => {
    expect(normalizeWhitespace("  hello  ")).toBe("hello");
  });

  it("collapses tabs", () => {
    expect(normalizeWhitespace("hello\t\tworld")).toBe("hello world");
  });
});

describe("readString", () => {
  it("returns string for non-empty strings", () => {
    expect(readString("hello")).toBe("hello");
  });

  it("returns undefined for empty strings", () => {
    expect(readString("")).toBeUndefined();
  });

  it("returns undefined for non-strings", () => {
    expect(readString(42)).toBeUndefined();
    expect(readString(null)).toBeUndefined();
    expect(readString(undefined)).toBeUndefined();
  });
});

describe("readNullableString", () => {
  it("returns null for null", () => {
    expect(readNullableString(null)).toBeNull();
  });

  it("returns string for non-empty strings", () => {
    expect(readNullableString("hello")).toBe("hello");
  });

  it("returns null for empty/invalid values", () => {
    expect(readNullableString("")).toBeNull();
    expect(readNullableString(42)).toBeNull();
  });
});

describe("readRequiredString", () => {
  it("returns string for non-empty strings", () => {
    expect(readRequiredString("hello", "field")).toBe("hello");
  });

  it("throws for empty strings", () => {
    expect(() => readRequiredString("", "myField")).toThrow(
      "Missing required field: myField",
    );
  });

  it("throws for non-strings", () => {
    expect(() => readRequiredString(null, "myField")).toThrow(
      "Missing required field: myField",
    );
  });
});

describe("readStringArray", () => {
  it("returns array of strings", () => {
    expect(readStringArray(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("filters out empty strings", () => {
    expect(readStringArray(["a", "", "c"])).toEqual(["a", "c"]);
  });

  it("filters out non-strings", () => {
    expect(readStringArray(["a", 42, null, "b"])).toEqual(["a", "b"]);
  });

  it("returns empty array for non-arrays", () => {
    expect(readStringArray("not-an-array")).toEqual([]);
    expect(readStringArray(null)).toEqual([]);
  });
});

describe("readRecord", () => {
  it("returns record for plain objects", () => {
    const obj = { key: "value" };
    expect(readRecord(obj)).toBe(obj);
  });

  it("returns undefined for non-objects", () => {
    expect(readRecord(null)).toBeUndefined();
    expect(readRecord("string")).toBeUndefined();
    expect(readRecord([])).toBeUndefined();
  });
});

describe("resolveUrlLike", () => {
  it("returns valid URL as string", () => {
    expect(resolveUrlLike("https://example.com")).toBe("https://example.com/");
  });

  it("returns null for invalid URLs", () => {
    expect(resolveUrlLike("not-a-url")).toBeNull();
  });
});

describe("sha256", () => {
  it("produces consistent hashes", () => {
    const hash = sha256("test");
    expect(hash).toBe(
      "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    );
  });

  it("produces different hashes for different inputs", () => {
    expect(sha256("a")).not.toBe(sha256("b"));
  });
});

describe("uniqueStrings", () => {
  it("removes duplicates", () => {
    expect(uniqueStrings(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  });

  it("preserves order", () => {
    expect(uniqueStrings(["c", "a", "b", "a"])).toEqual(["c", "a", "b"]);
  });

  it("handles empty arrays", () => {
    expect(uniqueStrings([])).toEqual([]);
  });
});
