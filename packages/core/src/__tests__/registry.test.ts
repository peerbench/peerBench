import { describe, it, expect } from "vitest";
import { createRegistry } from "@/registry/create-registry";

describe("createRegistry", () => {
  const entries = {
    alpha: { description: "Alpha entry", value: 1 },
    beta: { description: "Beta entry", value: 2 },
    gamma: { description: "Gamma entry", value: 3 },
  };

  it("should create a registry with all entries", () => {
    const registry = createRegistry(entries);
    expect(registry.names).toEqual(["alpha", "beta", "gamma"]);
  });

  it("should get an entry by name", () => {
    const registry = createRegistry(entries);
    expect(registry.get("alpha")).toEqual({
      description: "Alpha entry",
      value: 1,
    });
  });

  it("should find an entry by name", () => {
    const registry = createRegistry(entries);
    expect(registry.find("beta")).toEqual({
      description: "Beta entry",
      value: 2,
    });
  });

  it("should throw when finding a non-existent entry", () => {
    const registry = createRegistry(entries);
    expect(() => registry.find("nonexistent")).toThrow(
      "Entry not found: nonexistent",
    );
  });

  it("should return undefined for non-existent entry with throwIfNotFound=false", () => {
    const registry = createRegistry(entries);
    const result = registry.find("nonexistent", false);
    expect(result).toBeUndefined();
  });

  it("should check if an entry exists", () => {
    const registry = createRegistry(entries);
    expect(registry.has("alpha")).toBe(true);
    expect(registry.has("nonexistent")).toBe(false);
  });

  it("should list all entry names", () => {
    const registry = createRegistry(entries);
    expect(registry.list()).toEqual(["alpha", "beta", "gamma"]);
  });

  it("should get all entries with names", () => {
    const registry = createRegistry(entries);
    const all = registry.getAll();
    expect(all).toHaveLength(3);
    expect(all[0]).toEqual({
      name: "alpha",
      definition: { description: "Alpha entry", value: 1 },
    });
  });

  describe("aliases", () => {
    it("should resolve aliases when finding entries", () => {
      const registry = createRegistry(entries, {
        aliases: { AlphaClass: "alpha", BetaClass: "beta" },
      });
      expect(registry.find("AlphaClass")).toEqual({
        description: "Alpha entry",
        value: 1,
      });
    });

    it("should check aliases with has()", () => {
      const registry = createRegistry(entries, {
        aliases: { AlphaClass: "alpha" },
      });
      expect(registry.has("AlphaClass")).toBe(true);
      expect(registry.has("UnknownClass")).toBe(false);
    });

    it("should prefer direct entries over aliases", () => {
      const registry = createRegistry(entries, {
        aliases: { alpha: "beta" },
      });
      expect(registry.find("alpha")).toEqual({
        description: "Alpha entry",
        value: 1,
      });
    });
  });

  describe("validation", () => {
    it("should call validate for each entry", () => {
      const validated: string[] = [];
      createRegistry(entries, {
        validate: (name) => validated.push(name),
      });
      expect(validated).toEqual(["alpha", "beta", "gamma"]);
    });

    it("should throw if validate throws", () => {
      expect(() =>
        createRegistry(entries, {
          validate: (name) => {
            if (name === "beta") throw new Error("Invalid entry");
          },
        }),
      ).toThrow("Invalid entry");
    });
  });
});
