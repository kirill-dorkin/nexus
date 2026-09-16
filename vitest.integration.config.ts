import { existsSync } from "node:fs";
import path from "node:path";

import { defineConfig } from "vitest/config";

const localEnvFile = path.resolve(".env");
if (existsSync(localEnvFile)) {
  process.loadEnvFile(localEnvFile);
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["apps/api/src/github-project-fact-processor.integration.test.ts"],
    passWithNoTests: false,
    clearMocks: true,
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 15_000,
    hookTimeout: 30_000
  }
});
