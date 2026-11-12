// Plain constants without zod, so browser pages can import them through `@platform/contracts/client`.

/** Legal documents a person accepts at registration. */
export const LEGAL_DOCUMENTS = ["terms", "personal_data"] as const;
export type LegalDocument = (typeof LEGAL_DOCUMENTS)[number];

/**
 * The published version of each document. Bump it whenever a text changes in substance; earlier
 * consents stay recorded with their own version.
 */
export const CURRENT_LEGAL_DOCUMENT_VERSIONS: Readonly<
  Record<LegalDocument, string>
> = Object.freeze({
  terms: "2026-11-13",
  personal_data: "2026-11-06"
});

/** The consents the registration form sends for the documents it showed. */
export function currentRegistrationConsents(): {
  document: LegalDocument;
  version: string;
}[] {
  return LEGAL_DOCUMENTS.map((document) => ({
    document,
    version: CURRENT_LEGAL_DOCUMENT_VERSIONS[document]
  }));
}
