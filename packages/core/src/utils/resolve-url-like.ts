function resolveUrlLike(value: string): string | null {
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

export { resolveUrlLike };
