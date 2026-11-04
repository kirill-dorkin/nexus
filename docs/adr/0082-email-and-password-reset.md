# ADR-0082: Transactional email and password reset

- Status: Proposed
- Date: 2026-11-04
- Decision owner: product owner (open questions at the end)

> Draft prepared by WP-7 of `docs/roadmap/product-development-spec.md`. The number is reserved for the draft and may change on acceptance. Nothing in this ADR is implemented.

## Context

Nexus sends no email. A learner who forgets the password has no way back into a password account: there is no reset flow, no support channel in the product and no email verification. OAuth login (ADR-0060, Proposed) helps only learners who used Google or GitHub.

Current authentication facts (`apps/api/src/modules/authentication/`):

- passwords are hashed with scrypt; passwords are 15–128 characters without composition rules;
- sessions are opaque 32-byte tokens; only their SHA-256 hash is stored in `identity.sessions`;
- email addresses are unique by `lower(btrim(email))` and are **not verified** for password accounts;
- rate limiting of auth routes is being added in WP-1.3 (PostgreSQL counters keyed by HMAC of IP/email, `RATE_LIMIT_KEY`).

The spec (§5) forbids merging anything mail-related without the owner.

## Decision (proposed)

### 1. A narrow mail port, one provider adapter

A new **Notifications** module exposes one application port, `TransactionalMailer.send(template, to, variables)`, with fixed server-owned templates (Russian, plain text + simple HTML, no tracking pixels, no remote images, no click tracking). The first template is `password_reset`. Authentication depends on the port, never on a vendor SDK. Provider credentials live only in Vercel environment variables.

### 2. Provider options

| Option | Fit | Trade-offs |
|---|---|---|
| **Yandex Cloud Postbox** (SES-compatible API) | Data processed in Russia; pay per email; SES API is well known | Requires a Yandex Cloud account and billing; domain verification (DKIM) |
| **Unisender Go** | Russian provider, simple HTTP API, free tier for small volume | Smaller ecosystem; its marketing features are not needed |
| **Postmark / Resend / Mailgun** | Excellent deliverability and developer tools | Foreign processor: sending learners' addresses abroad is a cross-border transfer under 152-ФЗ (notification to Roskomnadzor, mention in the privacy policy); payment from Russia may be difficult |
| **SMTP of a mailbox service** (e.g. Yandex 360 for business) | Cheapest start, no new vendor | Low sending limits, weaker deliverability, SMTP from serverless functions is slow and fragile |

Recommendation: **Yandex Cloud Postbox** or **Unisender Go**, chosen by the owner (question 1). Both need a sending subdomain with SPF, DKIM and DMARC records.

### 3. Password reset flow

1. `POST /v1/auth/password-reset/request` `{ email }` (exact Origin). The response is **always 202** with the same body and no-store, whether or not the account exists, has a password, or is suspended.
2. If an active user owns the normalized email: generate 32 random bytes (base64url), store only `SHA-256(token)` with `expires_at = now() + 30 minutes`, mark earlier unused tokens of that user as superseded, commit. Then send the email **after** the commit, outside the transaction.
3. The email links to `{WEB_APP_ORIGIN}/reset-password#token=…`. The token is in the URL **fragment**, so it is never sent to a server, written to access logs or leaked through `Referer`.
4. The Web page reads the fragment, removes it from the address bar (`history.replaceState`) and shows a new-password form.
5. `POST /v1/auth/password-reset/confirm` `{ token, password }` (exact Origin). In one transaction: look up by hash with a row lock; require unused, not superseded, not expired, user active; set the new scrypt hash (creating a password credential if the account had only OAuth, see question 4); mark the token used; **revoke all sessions** of the user; create a fresh session cookie. Any failure returns one generic error.
6. Optional notification email: "your password was changed".

### 4. Threat model

| Threat | Control |
|---|---|
| Token guessing | 256-bit random token; 30-minute life; rate limit on confirm (by IP) |
| Database leak exposes usable tokens | only SHA-256 hashes are stored (high-entropy token, so a fast hash is enough, as for sessions) |
| Token reuse or replay | single use (`used_at`), row lock, earlier tokens superseded by a new request |
| Token leak through logs, Referer, analytics | token in URL fragment; removed from the address bar; never logged; not in outbox payloads or operational events (ADR-0052); `Referrer-Policy` from WP-1.2 |
| Account enumeration | identical 202 response; the email is sent after the response path does equal work (insert/no-op), or the send is deferred so that response time does not depend on account existence |
| Mail bombing a victim / provider cost abuse | rate limits: request — 5 per hour per email (HMAC key) and 20 per hour per IP; confirm — 20 per 10 minutes per IP; reuse the WP-1.3 counters |
| Attacker keeps a session after the victim resets | all sessions revoked on successful reset |
| Phishing look-alike emails | fixed templates, sender domain with SPF/DKIM/DMARC `p=quarantine` or stricter, no links other than the reset link |
| Suspended/deleted user regains access | reset is a no-op for non-active users |
| Provider outage | request still answers 202; an operational event `auth.mail_failed` (no address, no token) is logged; the learner can request again |

### 5. Storage

Migration: `identity.password_reset_tokens (id uuid, user_id uuid, token_hash bytea unique, created_at, expires_at, used_at null, superseded_at null)`, global identity state without tenant RLS (like `identity.sessions`), runtime grants `SELECT, INSERT, UPDATE` to `platform_app`. Rows older than 7 days are deleted by the request path (every N-th call) or a later cleanup job. No outbox event carries the token.

### 6. Not in this decision

Email verification at registration, email change, marketing or course emails, and notification preferences are separate decisions. They can reuse the mail port.

## Consequences

- Learners regain access without support; all sessions are revoked on reset.
- One migration and provider secrets are required; the owner applies the migration and configures DNS and Vercel variables.
- With a foreign provider, the privacy policy and the Roskomnadzor notification must mention the cross-border transfer.

## Alternatives considered

- **Support-only reset** (learner writes, operator resets manually) — no code, but slow, needs identity proof and operator tooling, and does not scale.
- **Magic-link login instead of passwords** — also requires email and the same token model; a larger product change.
- **Storing the token in the query string** — simpler, but leaks through logs and `Referer`.

## Scope estimate

M, about 3 days after the provider is chosen: Notifications module and adapter with tests against a fake; migration; request/confirm use cases with PostgreSQL integration tests (enumeration-safe responses, expiry, single use, supersede, session revocation, rate limits); Web pages «Забыли пароль?» and «Новый пароль» with e2e and axe. Plus owner time for the provider account and DNS.
