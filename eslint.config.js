import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: ["./server/tsconfig.json"],
      },
    },
    rules: {
      // Forbid console.log/error (use logger)
      "no-console": "error",

      // Forbid any type
      "@typescript-eslint/no-explicit-any": "error",

      // Forbid @ts-ignore
      "@typescript-eslint/ban-ts-comment": "error",

      // Require explicit return types
      "@typescript-eslint/explicit-function-return-type": "warn",

      // Allow unused vars with underscore prefix
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.js",
      "**/*.cjs",
      "**/*.mjs",
      "**/*.sys.mjs",
      "extension/**",
      "server/vitest.config.ts",
    ],
  },
);
