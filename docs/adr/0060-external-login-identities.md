# ADR-0060: External login identities reuse the canonical Nexus session

- Status: Proposed
- Date: 2026-10-13

## Decision

Nexus supports optional Google and GitHub login through OAuth 2.0 Authorization Code with PKCE. Provider configuration is environment-specific; the public provider endpoint exposes only fully configured providers, so an incomplete Preview keeps the password flow intact instead of showing broken actions.

Every flow uses a cryptographically random, single-use server-side state with a ten-minute expiry and a validated local return path. The callback URL is derived from the exact `OAUTH_CALLBACK_ORIGIN`, falling back to `WEB_APP_ORIGIN` for a shared edge. Wildcard callbacks and caller-provided origins are not accepted. Provider access and refresh tokens are never persisted or returned to Web.

An external identity is the stable `(provider, subject)` pair. A new pair may link to an existing Nexus user only when the provider supplies a verified email; otherwise the login fails. If no user owns that normalized verified email, Authentication creates an ordinary Identity user. Suspended or deleted users cannot start a session. Google identity comes from its UserInfo endpoint. GitHub identity is revalidated through `/user` and a primary verified address from `/user/emails` (falling back to another verified address).

Successful external login issues the existing opaque, host-only, Secure, HttpOnly, SameSite=Strict Nexus cookie backed by `identity.sessions`. It does not create a second session authority, membership, enrollment, role, progress, evidence or completion state. Provider tokens do not cross the Authentication boundary.

The Web login and registration modes share the same provider actions because the first successful external login creates an account and later logins reuse it. Errors return to the login page with a generic recoverable message; provider and database details are not exposed.

## Consequences

Deployments must register exact callback URLs `/v1/auth/oauth/google/callback` and `/v1/auth/oauth/github/callback` under `OAUTH_CALLBACK_ORIGIN` and provide the matching client ID/secret pairs. Social login on arbitrary Preview hostnames is intentionally unavailable unless that environment has a stable configured origin and dedicated provider callbacks.

Email-based automatic linking is limited to provider-verified addresses. Account unlinking, multiple identities from the same provider per user, organization-managed SSO and cross-device preference synchronization remain separate reviewed changes.
