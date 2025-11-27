export function replaceEntities(
  text: string,
  entities: string[],
  placeholder = "{}"
) {
  if (!entities || entities.length === 0) return text;

  // Escape regex specials
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Longer first so "foo bar" wins over "foo"
  const pattern = entities
    .map(esc)
    .sort((a, b) => b.length - a.length)
    .join("|");

  // Whole-word only (ASCII word chars); add "i" for case-insensitive
  const re = new RegExp(`\\b(?:${pattern})\\b`, "g");

  return text.replace(re, placeholder);
}
