import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/benchmarks/index.ts",
    "src/providers/index.ts",
    "src/schemas/index.ts",
    "src/scorers/index.ts",
    "src/catalogs/index.ts",
    "src/schemas/llm/index.ts",
    "src/schemas/extensions/index.ts",
  ],
  target: "node20",
  format: ["esm"],
  platform: "node",
  dts: true,
  clean: true,
  outDir: "dist",
  bundle: true,
  splitting: true,
  sourcemap: true,
  skipNodeModulesBundle: true,
});
