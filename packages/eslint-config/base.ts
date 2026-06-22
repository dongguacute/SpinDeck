import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import type { Linter } from "eslint";

/**
 * A shared ESLint configuration for the repository.
 */
export const config: Linter.Config[] = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
  {
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "build/**", ".turbo/**"],
  },
);
