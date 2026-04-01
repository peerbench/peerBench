import {
  formatTimeAgo,
  formatDate,
  formatDuration,
  formatScore,
  getScoreColor,
  formatInterval,
} from "@/lib/format-utils";

describe("formatTimeAgo", () => {
  it("returns 'Never' for null", () => {
    expect(formatTimeAgo(null)).toBe("Never");
  });

  it("returns 'Just now' for less than a minute ago", () => {
    const now = new Date();
    expect(formatTimeAgo(now.toISOString())).toBe("Just now");
  });

  it("returns minutes for < 60 minutes", () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatTimeAgo(date.toISOString())).toBe("5m ago");
  });

  it("returns hours for < 24 hours", () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatTimeAgo(date.toISOString())).toBe("3h ago");
  });

  it("returns days for >= 24 hours", () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(formatTimeAgo(date.toISOString())).toBe("2d ago");
  });
});

describe("formatDate", () => {
  it("returns em dash for null", () => {
    expect(formatDate(null)).toBe("\u2014");
  });

  it("returns 'Today' for today", () => {
    const now = new Date();
    expect(formatDate(now.toISOString())).toBe("Today");
  });

  it("returns 'Yesterday' for 1 day ago", () => {
    const date = new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000);
    expect(formatDate(date.toISOString())).toBe("Yesterday");
  });

  it("returns 'X days ago' for 2-6 days", () => {
    const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatDate(date.toISOString())).toBe("3 days ago");
  });

  it("returns locale date string for >= 7 days", () => {
    const date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const result = formatDate(date.toISOString());
    expect(result).not.toBe("\u2014");
    expect(result).not.toContain("days ago");
  });
});

describe("formatDuration", () => {
  it("returns em dash for null", () => {
    expect(formatDuration(null)).toBe("\u2014");
  });

  it("returns ms for < 1000", () => {
    expect(formatDuration(500)).toBe("500ms");
  });

  it("returns seconds for >= 1000", () => {
    expect(formatDuration(1500)).toBe("1.50s");
  });

  it("rounds ms values", () => {
    expect(formatDuration(123.456)).toBe("123ms");
  });

  it("formats zero correctly", () => {
    expect(formatDuration(0)).toBe("0ms");
  });
});

describe("formatScore", () => {
  it("returns em dash for null", () => {
    expect(formatScore(null)).toBe("\u2014");
  });

  it("formats as percentage", () => {
    expect(formatScore(0.85)).toBe("85.0%");
  });

  it("formats perfect score", () => {
    expect(formatScore(1.0)).toBe("100.0%");
  });

  it("formats zero score", () => {
    expect(formatScore(0)).toBe("0.0%");
  });

  it("formats with one decimal place", () => {
    expect(formatScore(0.123)).toBe("12.3%");
  });
});

describe("getScoreColor", () => {
  it("returns muted for null", () => {
    expect(getScoreColor(null)).toBe("text-muted-foreground");
  });

  it("returns green for >= 0.9", () => {
    expect(getScoreColor(0.95)).toContain("text-green-600");
  });

  it("returns blue for >= 0.7 and < 0.9", () => {
    expect(getScoreColor(0.75)).toBe("text-blue-600");
  });

  it("returns yellow for >= 0.5 and < 0.7", () => {
    expect(getScoreColor(0.55)).toBe("text-yellow-600");
  });

  it("returns red for < 0.5", () => {
    expect(getScoreColor(0.3)).toBe("text-red-600");
  });

  it("returns green with font-semibold at boundary 0.9", () => {
    expect(getScoreColor(0.9)).toBe("text-green-600 font-semibold");
  });
});

describe("formatInterval", () => {
  it("formats seconds < 60", () => {
    expect(formatInterval(30)).toBe("30s");
  });

  it("formats 1 minute", () => {
    expect(formatInterval(60)).toBe("1 min");
  });

  it("formats multiple minutes", () => {
    expect(formatInterval(300)).toBe("5 min");
  });

  it("formats 1 hour", () => {
    expect(formatInterval(3600)).toBe("1 hour");
  });

  it("formats multiple hours", () => {
    expect(formatInterval(7200)).toBe("2 hours");
  });

  it("formats 1 day as 'Daily'", () => {
    expect(formatInterval(86400)).toBe("Daily");
  });

  it("formats multiple days", () => {
    expect(formatInterval(172800)).toBe("2 days");
  });
});
