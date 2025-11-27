import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist/**/*.js", "examples/**/*.ts"],
  },
  ...tseslint.config({
    extends: [eslint.configs.recommended, tseslint.configs.recommended],
    files: ["src/**/*.ts", "scripts/**/*.ts"],

    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  }),
];
