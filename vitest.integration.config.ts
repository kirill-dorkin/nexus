import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "apps/**/*.integration.test.ts",
      "packages/**/*.integration.test.ts",
      "tests/**/*.integration.test.ts"
    ],
    passWithNoTests: false,
    clearMocks: true,
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 15_000,
    hookTimeout: 30_000
  }
});
