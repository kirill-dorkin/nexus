import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.launch-performance.test.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    passWithNoTests: false,
    clearMocks: true,
    testTimeout: 120_000,
    hookTimeout: 120_000
  }
});
