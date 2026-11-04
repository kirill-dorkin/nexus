import {
  CURRENT_LEGAL_DOCUMENT_VERSIONS,
  currentRegistrationConsents
} from "@platform/contracts";
import { describe, expect, it } from "vitest";

import { documentsWithoutCurrentConsent } from "./legal-consent";

describe("registration legal consent", () => {
  it("accepts consents to the current version of every document", () => {
    expect(
      documentsWithoutCurrentConsent(currentRegistrationConsents())
    ).toEqual([]);
  });

  it("reports a missing document", () => {
    expect(
      documentsWithoutCurrentConsent([
        { document: "terms", version: CURRENT_LEGAL_DOCUMENT_VERSIONS.terms }
      ])
    ).toEqual(["personal_data"]);
  });

  it("treats a consent to an older version as missing", () => {
    expect(
      documentsWithoutCurrentConsent([
        { document: "terms", version: "old-1" },
        {
          document: "personal_data",
          version: CURRENT_LEGAL_DOCUMENT_VERSIONS.personal_data
        }
      ])
    ).toEqual(["terms"]);
  });
});
