# ADR-0082: Transactional email and password reset

- Status: Accepted (implementation); goes live when the owner configures the mail provider
- Date: 2026-11-06
- Supersedes: the proposed draft in #172 (same number)

## Context

A learner who forgets the password of a password account has no way back in: Nexus sends no email. The open launch on `dorkin.academy` makes this the first support request we would get. Passwords are scrypt-hashed, sessions are opaque 32-byte tokens stored as SHA-256 hashes, and auth routes are rate limited by HMAC-keyed PostgreSQL counters (ADR-0070).

## Decision

1. **Mail port.** A new module `notifications` exposes `TransactionalMailer` (`isEnabled()`, `send({ template, to, variables })`). Templates are fixed on the server, in Russian, plain text plus simple HTML, without images, tracking pixels or click tracking. The only template is `password_reset`. Authentication depends on the port, never on a vendor.
2. **Provider: Resend over its HTTP API.** Configured only by environment: `MAIL_PROVIDER=resend`, `RESEND_API_KEY`, `MAIL_FROM` (for example `Dorkin Academy <noreply@dorkin.academy>`; its display name is the product name in the email). Missing or incomplete settings select `DisabledMailer`: nothing is sent and reset is reported unavailable. The privacy policy (#174) lists Resend as a processor. Switching to another provider is one adapter.
3. **Flow.**
   - `GET /v1/auth/password-reset` → `{ available }`. Web shows «Забыли пароль?» only when it is true.
   - `POST /v1/auth/password-reset/request { email }` → always `202` with no body, no sooner than 1.2 s, whatever the account state. For an active user it stores `SHA-256(token)` of a 256-bit token with a 30-minute expiry, supersedes the user's earlier open tokens, deletes rows older than 7 days, commits, and only then sends the email. A provider failure is logged without the address or token.
   - The link is `{WEB_APP_ORIGIN}/reset-password#token=…`: the token is in the fragment, so it never reaches a server log or a `Referer`. The page removes it from the address bar at once.
   - `POST /v1/auth/password-reset/confirm { token, password }` → in one transaction: mark the token used (only if open and unexpired), require an active user, set the password (creating the credential for an external-only account), revoke **all** sessions, create a new session cookie. Any failure is one generic `400`.
4. **Rate limits.** Request: 20 per hour per address and 5 per hour per email. Confirm: 20 per 10 minutes per address.
5. **Storage.** Migration 000055 adds `identity.password_reset_tokens` (global identity state without tenant RLS, like `identity.sessions`; deleted with the user).

## Consequences

- Learners recover access without support; a reset signs out every other device.
- Until the owner configures Resend (account, DNS records for the sending domain, the three variables in Vercel Production), the feature is invisible and the endpoints do nothing.
- Not in this decision: email verification at registration, email change, course or marketing emails.

## Alternatives

- Yandex Cloud Postbox or Unisender Go (data processed in Russia). Kept as options if Russia becomes the main market and 152-ФЗ localisation is required; the port makes the switch local.
- Token in the query string: leaks into logs and `Referer`.
