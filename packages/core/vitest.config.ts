import { defineConfig } from "vitest/config";
import { resolve, dirname } from "path";
import { existsSync } from "fs";

const pkgRoot = resolve(__dirname);

function findZod(): string {
  const candidates = [
    resolve(pkgRoot, "node_modules/zod"),
    resolve(pkgRoot, "../../node_modules/zod"),
    resolve(pkgRoot, "../../../node_modules/zod"),
  ];
  for (const c of candidates) {
    if (existsSync(resolve(c, "package.json"))) return c;
  }
  throw new Error("Cannot find zod");
}

function findPeerbenchDist(): string {
  const candidates = [
    resolve(pkgRoot, "node_modules/peerbench/dist"),
    resolve(pkgRoot, "../../node_modules/peerbench/dist"),
    resolve(pkgRoot, "../../../node_modules/peerbench/dist"),
  ];
  for (const c of candidates) {
    if (existsSync(resolve(c, "index.js"))) return c;
  }
  throw new Error("Cannot find peerbench dist");
}

const zodPath = findZod();
const peerbenchDist = findPeerbenchDist();

export default defineConfig({
  test: {
    globals: true,
    server: {
      deps: {
        inline: ["peerbench"],
      },
    },
  },
  resolve: {
    alias: [
      { find: "@", replacement: resolve(pkgRoot, "src") },
      { find: "zod", replacement: zodPath },
      {
        find: /^peerbench\/schemas\/llm$/,
        replacement: resolve(peerbenchDist, "schemas/llm/index.js"),
      },
      {
        find: /^peerbench\/schemas$/,
        replacement: resolve(peerbenchDist, "schemas/index.js"),
      },
      {
        find: /^peerbench\/providers$/,
        replacement: resolve(peerbenchDist, "providers/index.js"),
      },
      {
        find: /^peerbench\/scorers$/,
        replacement: resolve(peerbenchDist, "scorers/index.js"),
      },
      {
        find: /^peerbench\/storages$/,
        replacement: resolve(peerbenchDist, "storages/index.js"),
      },
      {
        find: /^peerbench$/,
        replacement: resolve(peerbenchDist, "index.js"),
      },
    ],
  },
});
