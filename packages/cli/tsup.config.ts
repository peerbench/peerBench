import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  target: "node20",
  format: ["esm"],
  platform: "node",
  dts: true,
  clean: true,
  outDir: "dist",
  bundle: true,
  sourcemap: true,
  skipNodeModulesBundle: true,
});
