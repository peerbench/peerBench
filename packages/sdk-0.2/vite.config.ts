import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use the same path aliases as tsconfig.json
    alias: {
      "@/": new URL("./src/", import.meta.url).pathname,
    },
  },
});
