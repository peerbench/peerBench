function extractTagContent(text: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = text.match(regex);
  const content = match?.[1];
  if (!content) return null;

  const trimmed = content.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export { extractTagContent };
