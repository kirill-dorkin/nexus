import { z } from "zod";

import { LEGAL_DOCUMENTS } from "./legal-documents";

export {
  CURRENT_LEGAL_DOCUMENT_VERSIONS,
  LEGAL_DOCUMENTS,
  currentRegistrationConsents,
  type LegalDocument
} from "./legal-documents";

export const legalDocumentSchema = z.enum(LEGAL_DOCUMENTS);

export const legalDocumentVersionSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9.-]{0,63}$/);

export const legalConsentSchema = z
  .object({
    document: legalDocumentSchema,
    version: legalDocumentVersionSchema
  })
  .strict();

export const registrationConsentsSchema = z
  .array(legalConsentSchema)
  .min(1)
  .max(LEGAL_DOCUMENTS.length);

export type LegalConsent = z.infer<typeof legalConsentSchema>;
