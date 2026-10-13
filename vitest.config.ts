import { defineConfig } from "vitest/config";

export default defineConfig({
  // Next preserves JSX for its compiler; unit tests render actual Web components.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: [
      "apps/**/*.test.ts",
      "packages/**/*.test.ts",
      "tests/**/*.test.ts"
    ],
    exclude: [
      "**/*.integration.test.ts",
      "**/*.launch-performance.test.ts",
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**"
    ],
    passWithNoTests: false,
    clearMocks: true
  }
});
