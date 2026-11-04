import { z } from "zod";

/**
 * Legal documents a person accepts at registration. The texts and versions come from the owner;
 * until then the versions are placeholders and the pages show placeholder text.
 */
export const legalDocumentSchema = z.enum(["terms", "personal_data"]);

export const legalDocumentVersionSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9.-]{0,63}$/);

/** Bump a version whenever the owner publishes a changed text; old consents stay recorded. */
export const CURRENT_LEGAL_DOCUMENT_VERSIONS: Readonly<
  Record<LegalDocument, string>
> = Object.freeze({
  terms: "placeholder-2026-11-04",
  personal_data: "placeholder-2026-11-04"
});

export const legalConsentSchema = z
  .object({
    document: legalDocumentSchema,
    version: legalDocumentVersionSchema
  })
  .strict();

export const registrationConsentsSchema = z
  .array(legalConsentSchema)
  .min(1)
  .max(legalDocumentSchema.options.length);

/** The consents the registration form sends for the documents it showed. */
export function currentRegistrationConsents(): LegalConsent[] {
  return legalDocumentSchema.options.map((document) => ({
    document,
    version: CURRENT_LEGAL_DOCUMENT_VERSIONS[document]
  }));
}

export type LegalDocument = z.infer<typeof legalDocumentSchema>;
export type LegalConsent = z.infer<typeof legalConsentSchema>;
