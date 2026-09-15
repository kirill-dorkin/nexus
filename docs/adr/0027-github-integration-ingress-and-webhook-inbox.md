# ADR-0027: GitHub integration ingress and durable webhook inbox

- Status: Accepted
- Date: 2026-09-15

## Context

F6 introduces GitHub-backed project workflows. GitHub is an external retried event source, not Nexus canonical learning state. Before Nexus can derive project/review intelligence from pull requests, checks, or reviews, it needs a trustworthy ingress boundary that authenticates GitHub, preserves deliveries durably, and routes them to the correct Nexus tenant without allowing external identifiers to become Nexus domain identities.

ADR-0006 already requires durable inbox + idempotency for retried external inputs. The security baseline requires webhook processing in the order: verify signature, validate type/action, deduplicate delivery, persist inbox, respond quickly, then process asynchronously.

## Decision

### 1. Integrations owns GitHub ingress

GitHub App installation/repository identity, webhook authentication, delivery deduplication, and the durable webhook inbox belong to the `Integrations` module. `Projects` owns Nexus projects/teams/milestones and must not call GitHub SDKs or query integration tables directly.

GitHub repository, installation, pull request, check, and review identifiers remain external identifiers. They must never be reused as Nexus `Project`, `Team`, learning, or other internal aggregate identifiers.

### 2. Signed raw bytes are the authentication boundary

The API retains the raw request body for webhook requests and validates `X-Hub-Signature-256` with HMAC-SHA256 before trusting event headers or parsed payload content.

The webhook secret comes from runtime secret configuration (`GITHUB_WEBHOOK_SECRET`); it is never persisted in PostgreSQL, copied into the inbox, or emitted in logs/events.

Invalid signatures are rejected before any durable inbox state is created.

### 3. Accepted event surface is explicit

The first F6 ingress slice accepts only the event families required for the planned GitHub project vertical:

- `ping`;
- `installation`;
- `installation_repositories`;
- `pull_request`;
- `pull_request_review`;
- `check_run`;
- `check_suite`.

Action-bearing events require a valid non-empty action and event families that operate on a repository require exact installation and repository identifiers. Unsupported or malformed webhook shapes are rejected before inbox persistence.

Extending the event allowlist is an explicit integration-contract change rather than silently accepting arbitrary webhook traffic.

### 4. Durable inbox is append-only source input

Each accepted GitHub delivery is persisted once in `integrations.github_webhook_inbox` using the GitHub delivery UUID as the idempotency identity. The inbox retains only replay/audit material needed by later processors:

- delivery UUID;
- event name and action;
- external installation/repository ids where present;
- resolved organization id where safely known;
- routing status;
- SHA-256 of the raw payload;
- parsed JSON payload;
- receive timestamp.

The GitHub signature and webhook secret are not stored.

A retry of the same delivery UUID with the same raw body is idempotent. Reuse of the same delivery UUID with different signed content is treated as an integrity conflict and does not replace the original inbox fact.

Processing state, retries, dead-letter state, derived project facts, and learning Evidence are not encoded into this append-only source row. Later worker/process-state models may reference the inbox delivery without mutating the received fact.

### 5. Tenant routing uses trusted mappings only

`integrations.github_installations` maps an external GitHub App installation to exactly one Nexus Organization. `integrations.github_repositories` maps an external repository to exactly one mapped installation/Organization.

Webhook tenant routing never trusts owner/name strings from the payload. It uses exact numeric GitHub installation/repository identities and a narrow PostgreSQL ingress function. The normal API runtime receives no direct cross-tenant table read privileges for these mappings.

Routing outcomes are explicit:

- `mapped` — the trusted installation/repository mapping is consistent;
- `unmapped_installation` — no active installation mapping exists;
- `unmapped_repository` — the installation is mapped but the repository is not;
- `repository_mismatch` — the repository is mapped to another installation/tenant and must not be cross-routed;
- `not_applicable` — the event has no tenant routing identity, such as `ping`.

A verified but unmapped/mismatched delivery may be retained for audit/replay; persistence does not grant it authority to affect tenant business state.

### 6. Mapping writes are intentionally not public yet

This slice creates the durable mapping model but exposes no user-facing endpoint that accepts arbitrary GitHub installation or repository ids. A Nexus administrator proving organization authorization is not by itself proof that they control a GitHub App installation.

The next installation-lifecycle slice must establish a trusted GitHub App setup/callback flow (including anti-CSRF/state binding and GitHub-authenticated installation ownership) before application commands may create or change these mappings.

### 7. Inbox acceptance does not emit learning Evidence or integration outbox events

The durable inbox is already the canonical boundary for the external input. Accepting a webhook does not create learning Evidence, Mastery changes, Project facts, or a second outbox event.

Later idempotent processors may turn accepted deliveries into Integrations/Projects facts and emit transactional outbox events where those new canonical state transitions require them. Redis/BullMQ remains execution infrastructure behind a port and is not the source of truth.

## Consequences

- GitHub retries are safe and auditable before asynchronous processing exists.
- Invalid signatures cannot create inbox state.
- A repository mapping mismatch cannot silently route an event into another tenant.
- Normal API code does not gain broad cross-tenant access to GitHub mappings merely to receive webhooks.
- GitHub App installation setup, token generation/API calls, Project/Team domain modeling, worker/dead-letter processing, and PR/check/review Evidence remain separate F6 slices.
- The inbox payload has a retention/privacy cost; a later operational policy must define retention/deletion rules before production launch.
