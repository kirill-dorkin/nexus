// One lint policy for the whole workspace: TypeScript with type information,
// React hooks, accessibility and Next.js rules for Web, plain-JS rules for
// scripts and course builders.
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const typeScriptFiles = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"];
const webFiles = ["apps/web/**/*.{ts,tsx}", "packages/ui/**/*.{ts,tsx}"];
const testFiles = [
  "**/*.test.{ts,tsx}",
  "**/*.spec.{ts,tsx}",
  "tests/**/*.{ts,mjs}"
];

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/next-env.d.ts",
      ".tmp/**",
      // Playwright output, including copies of built pages in traces.
      "test-results/**",
      "playwright-report/**",
      "apps/grader-runner/**"
    ]
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: "error"
    }
  },

  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node }
    }
  },

  {
    files: typeScriptFiles,
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true }
      ],
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: true }
      ],
      // The codebase models data with `type` aliases.
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      // `onClick={() => setOpen(false)}` is idiomatic React.
      "@typescript-eslint/no-confusing-void-expression": [
        "error",
        { ignoreArrowShorthand: true }
      ],
      // NestJS modules are decorated empty classes by design.
      "@typescript-eslint/no-extraneous-class": [
        "error",
        { allowWithDecorator: true }
      ],
      // `||` on strings and booleans deliberately treats "" and false as absent.
      "@typescript-eslint/prefer-nullish-coalescing": [
        "error",
        { ignorePrimitives: { string: true, boolean: true } }
      ],
      // React event props accept async handlers; the handlers own their errors.
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } }
      ],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-console": ["error", { allow: ["warn", "error"] }]
    }
  },

  {
    files: webFiles,
    plugins: {
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      "@next/next": nextPlugin
    },
    languageOptions: {
      globals: { ...globals.browser }
    },
    settings: {
      next: { rootDir: "apps/web" }
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // @platform/ui renders native controls under these names.
      "jsx-a11y/label-has-associated-control": [
        "error",
        {
          assert: "either",
          controlComponents: ["Input", "Select", "Textarea", "PasswordInput"],
          depth: 3
        }
      ],
      // A scrollable region must be keyboard-focusable (WCAG 2.1.1).
      "jsx-a11y/no-noninteractive-tabindex": [
        "error",
        { roles: ["region", "tabpanel"] }
      ]
    }
  },

  {
    files: testFiles,
    rules: {
      // Tests assert on shapes they just built; a failed `!` fails the test.
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/require-await": "off",
      // Tests feed deliberately malformed input to validators.
      "@typescript-eslint/no-explicit-any": "off",
      // `expect(mock.method).toHaveBeenCalled()` reads a vitest mock, not a bound method.
      "@typescript-eslint/unbound-method": "off",
      // Tests restore the `process.env` keys they changed.
      "@typescript-eslint/no-dynamic-delete": "off",
      // Stub HTTP servers use async listeners; a rejection fails the test run.
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: false }
      ],
      "no-console": "off"
    }
  },

  {
    files: [
      "scripts/**",
      "docs/examples/**",
      "infra/**",
      "apps/*/ops/**",
      "tests/public-launch-browser/**"
    ],
    rules: {
      "no-console": "off"
    }
  },

  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked]
  }
);
