import {
  CURRENT_LEGAL_DOCUMENT_VERSIONS,
  LEGAL_DOCUMENTS,
  type LegalConsent,
  type LegalDocument
} from "@platform/contracts";

/**
 * Registration needs a consent to the current version of every legal document. A stale version
 * means the person saw an older text, so they must reload and accept the current one.
 */
export function documentsWithoutCurrentConsent(
  consents: readonly LegalConsent[]
): LegalDocument[] {
  return LEGAL_DOCUMENTS.filter(
    (document) =>
      !consents.some(
        (consent) =>
          consent.document === document &&
          consent.version === CURRENT_LEGAL_DOCUMENT_VERSIONS[document]
      )
  );
}
