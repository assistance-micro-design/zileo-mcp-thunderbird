import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  // ---------------------------------------------------------------------------
  // TypeScript (server)
  // ---------------------------------------------------------------------------
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["server/src/**/*.ts"],
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
  // ---------------------------------------------------------------------------
  // WebExtension JS (extension/) — eslint:recommended only, no TS rules.
  // `console.*` is allowed here: extension scripts run in Thunderbird and are
  // not bound to the MCP stdio protocol.
  // ---------------------------------------------------------------------------
  {
    files: ["extension/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        messenger: "readonly",
        browser: "readonly",
      },
    },
    rules: {
      ...eslint.configs.recommended.rules,
      // typescript-eslint rules don't apply to plain JS — turn them off so the
      // base no-unused-vars rule (with ^_ ignore pattern) takes over.
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // ---------------------------------------------------------------------------
  // Global ignores
  // ---------------------------------------------------------------------------
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.cjs",
      "**/*.mjs",
      "**/*.sys.mjs",
      "extension/experiments/**",
      "server/vitest.config.ts",
    ],
  },
);
