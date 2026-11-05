import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { currentRegistrationConsents } from "../packages/contracts/src/legal";

describe("operator registration consents", () => {
  it("launch-course.mjs sends the current version of every legal document", () => {
    const script = readFileSync(
      new URL("../scripts/launch-course.mjs", import.meta.url),
      "utf8"
    );
    for (const { document, version } of currentRegistrationConsents()) {
      expect(script).toContain(
        `{ document: "${document}", version: "${version}" }`
      );
    }
  });
});
