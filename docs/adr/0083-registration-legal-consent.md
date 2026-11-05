# ADR-0083: Recorded legal consent at registration

- Status: Accepted
- Date: 2026-11-05

## Context

Registration created an account without any agreement or consent to personal-data processing, and the site had no privacy policy or user agreement. The owner approved the texts of both documents on 2026-11-05 (WP-7, PR #174).

## Decision

1. **Two documents, versioned in code.** `terms` (user agreement, `/terms`) and `personal_data`: the separate consent to processing (`/consent`, required as a separate document by 152-ФЗ since 2025-09-01) together with the privacy policy that explains it (`/privacy`). Both pages show the `personal_data` version. Their current versions live in `packages/contracts/src/legal-documents.ts` (`CURRENT_LEGAL_DOCUMENT_VERSIONS`, zod-free so browser pages can import it). A substantive text change bumps the version.
2. **Consent is part of registration.** `POST /v1/auth/register` requires `consents: [{ document, version }]`. Identity checks that every document is accepted in its **current** version (missing field → 400; stale or missing document → 409 `legal_consent_required`) and inserts the consent rows in the same transaction as the user, so there is never an account without recorded consent.
3. **Append-only evidence.** `identity.legal_consents (user_id, document, version, accepted_at)` is global identity state without tenant RLS, like `identity.sessions`. The runtime role has only `SELECT, INSERT`; a new version adds a row and earlier consents stay. Rows are deleted with the user (`ON DELETE CASCADE`).
4. **Web.** Both registration forms show two required checkboxes linking to the documents (opened in a new tab); there is no marketing consent. The footer links both documents.

## Consequences

- Every new password account has recorded consent to the exact versions it saw.
- Accounts created by the first Google/GitHub login (ADR-0060) do not record consent yet; closing that gap needs a consent step before the external account is created.
- Accounts registered before this change have no consent rows.
- The texts disclose that hosting (Vercel) and the database (Neon) are outside Russia and Kyrgyzstan. Disclosure does not satisfy 152-ФЗ data-localisation (art. 18 part 5); that needs a separate hosting decision and legal review.
- Edition 2026-11-06 adapts the texts to the operator's jurisdiction: the operator is a natural person in Bishkek, Kyrgyzstan; the Kyrgyz law «Об информации персонального характера» applies, and 152-ФЗ for users from Russia; the supervisory authorities are named; the user agreement is governed by Kyrgyz law. Resend is listed as the email processor ahead of password reset. The operator's street address is not published (city only); if a regulator requires it, that is a new edition.
