function createRegistry<TEntries extends Record<string, unknown>>(
  entries: TEntries,
  options?: {
    validate?: (name: string, entry: unknown) => void;
    aliases?: Record<string, string>;
  },
): Registry<TEntries> {
  if (options?.validate) {
    for (const [name, entry] of Object.entries(entries)) {
      options.validate(name, entry);
    }
  }

  const names = Object.keys(entries) as Array<keyof TEntries & string>;
  const aliasMap = options?.aliases ?? {};

  return {
    get<K extends keyof TEntries & string>(name: K): TEntries[K] {
      return entries[name];
    },

    find(name: string, throwIfNotFound: boolean | undefined = true) {
      if (name in entries) {
        return entries[name as keyof TEntries & string];
      }
      const resolved = aliasMap[name];
      if (resolved && resolved in entries) {
        return entries[resolved as keyof TEntries & string];
      }
      if (throwIfNotFound !== false) {
        throw new Error(`Entry not found: ${name}`);
      }
      return undefined as never;
    },

    has(name: string): name is keyof TEntries & string {
      return (
        name in entries ||
        (name in aliasMap && aliasMap[name]! in entries)
      );
    },

    list(): Array<keyof TEntries & string> {
      return names;
    },

    getAll(): Array<{
      name: keyof TEntries & string;
      definition: TEntries[keyof TEntries & string];
    }> {
      return names.map((name) => ({
        name,
        definition: entries[name],
      }));
    },

    names,
  };
}

interface Registry<TEntries extends Record<string, unknown>> {
  get<K extends keyof TEntries & string>(name: K): TEntries[K];
  find<T = TEntries[keyof TEntries & string]>(
    name: string,
    throwIfNotFound?: boolean,
  ): T;
  find<T = TEntries[keyof TEntries & string]>(
    name: string,
    throwIfNotFound: false,
  ): T | undefined;
  has(name: string): name is keyof TEntries & string;
  list(): Array<keyof TEntries & string>;
  getAll(): Array<{
    name: keyof TEntries & string;
    definition: TEntries[keyof TEntries & string];
  }>;
  names: Array<keyof TEntries & string>;
}

export { createRegistry, type Registry };
