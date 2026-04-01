import { defineConfig } from "vitest/config";
import { resolve } from "path";

const pkgRoot = resolve(__dirname);

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: [
      { find: "@", replacement: resolve(pkgRoot, "src") },
    ],
  },
});
