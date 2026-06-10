import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    // vitest 4: the "basic" reporter was removed; this is its equivalent
    reporters: [["default", { summary: false }]],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/__tests__/**"],
      reporter: ["text", "lcov"],
    },
  },
});
