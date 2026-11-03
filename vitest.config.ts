import { defineConfig } from "vitest/config";

const ignored = [
  "**/*.integration.test.ts",
  "**/*.launch-performance.test.ts",
  "**/node_modules/**",
  "**/dist/**",
  "**/.next/**"
];

export default defineConfig({
  // Next preserves JSX for its compiler; unit tests render actual Web components.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    passWithNoTests: false,
    clearMocks: true,
    // Measured for Web and @platform/ui by `pnpm test:web-coverage`. The floors are the
    // values reached so far; each web-quality phase raises them (never lowers them).
    coverage: {
      provider: "v8",
      include: ["apps/web/src/**/*.{ts,tsx}", "packages/ui/src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "**/*.test-utils.ts", "**/src/test/**"],
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "coverage/web",
      thresholds: {
        statements: 43,
        branches: 47,
        functions: 39,
        lines: 44,
        // Learner- and buyer-facing components with behaviour suites stay well covered.
        "**/{quiz-form,challenge,course-navigator,course-progress,learner-entry,my-learning,purchase-status,checkout-panel,learning-auth}.tsx":
          { statements: 80, branches: 55, functions: 75, lines: 80 }
      }
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: [
            "apps/**/*.test.ts",
            "packages/**/*.test.ts",
            "tests/**/*.test.ts"
          ],
          exclude: ignored
        }
      },
      {
        extends: true,
        test: {
          name: "web-components",
          environment: "happy-dom",
          include: ["apps/web/**/*.test.tsx"],
          exclude: ignored,
          setupFiles: ["apps/web/src/test/setup-dom.ts"]
        }
      },
      {
        extends: true,
        test: {
          name: "ui-components",
          environment: "happy-dom",
          include: ["packages/ui/**/*.test.tsx"],
          exclude: ignored,
          setupFiles: ["packages/ui/src/test/setup-dom.ts"]
        }
      }
    ]
  }
});
