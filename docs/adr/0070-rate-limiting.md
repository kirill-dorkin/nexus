# ADR-0070: Rate limiting of unauthenticated writes

- Status: Accepted
- Date: 2026-11-04

## Context

`docs/security/baseline.md` asks for rate limits by risk profile, but no route had one. Password login could be tried without limit (online guessing and credential stuffing), registration could be scripted, and the quiz check and Web telemetry endpoints accept writes from anyone.

The API runs as Vercel functions: many short-lived instances, so counters in memory do not limit anything. PostgreSQL is the only shared state.

## Decision

- **Store.** Fixed-window counters in `platform_internal.rate_limit_buckets` (migration 000048). The application role can only call `platform_internal.hit_rate_limit(key, window_seconds)`, which counts one hit atomically and returns the window total; it cannot read or change rows. About one call in a hundred deletes windows older than a day.
- **Keys.** `HMAC-SHA-256(RATE_LIMIT_KEY, rule ‖ scope ‖ value)`. The database never sees an IP address or an email, and digests are useless without the key.
- **Client address.** On Vercel (`VERCEL=1`) the edge sets `x-vercel-forwarded-for`, `x-real-ip` and `x-forwarded-for`, so they are trusted there. Elsewhere only the socket address counts, so a caller cannot choose its own bucket.
- **Limits** (`apps/api/src/http/rate-limit.ts`):

  | Rule | Scope | Limit |
  |---|---|---|
  | `auth.login` | address | 20 per 10 min |
  | `auth.login` | normalized email | 10 per 10 min |
  | `auth.register` | address | 5 per hour |
  | `learning.quiz_check` | address | 120 per 10 min |
  | `telemetry.web` | address | 60 per min |

- **Answer.** Over the limit: `429` with `Retry-After` until the window ends, and the operational event `public_launch.security` / `rate_limit` / `rejected` / `rate_limit_exceeded` (ADR-0052: no address, email or route parameters).
- **Failure.** Without `RATE_LIMIT_KEY` the limiter is off. If the counter cannot be reached (database error, migration not applied) the request goes through and `rate_limiter_unavailable` is logged. Availability of sign-in wins over the limit.
- Web shows «Слишком много попыток…» on sign-in and registration and keeps the same quiz attempt for a later retry.

## Consequences

- Online password guessing is bounded per address and per account; registration spam per address; noisy clients on quiz and telemetry.
- Each limited request costs one or two small writes. That is acceptable for these routes; read routes are not limited.
- Users behind one shared address (a school network) share the address limits. The values leave room for a class; they are changed in one place with a reason.
- Turning it on needs the migration applied and `RATE_LIMIT_KEY` (a long random secret) set in production. Rotating the key resets all counters.

## Alternatives

- **In-memory counters.** Rejected: each Vercel instance would count separately.
- **Vercel Firewall rules.** Possible later as an outer layer. It is configured outside the repository and cannot limit per account (email).
- **Account lockout.** Rejected: it lets anyone lock a learner out by guessing badly on purpose.
