# ADR-0028: GitHub App trusted setup and mapping lifecycle

- Status: Accepted
- Date: 2026-09-15

## Context

ADR-0027 established HMAC-authenticated webhook ingress plus durable installation/repository mapping tables, but intentionally exposed no command that could write those mappings. An authenticated Nexus administrator can prove authority over a Nexus Organization, but that alone does not prove authority over a GitHub App installation.

GitHub's setup URL documentation explicitly warns that the `installation_id` query parameter can be spoofed and must not be treated as proof that the caller owns or may use an installation. GitHub recommends authenticating the user through the GitHub App user authorization flow and checking that the installation is accessible to that user.

F6 therefore needs a setup lifecycle that binds both sides of the trust decision before tenant routing may depend on a mapping:

1. Nexus Organization authorization;
2. GitHub-authenticated user access to the exact GitHub App installation.

## Decision

### 1. Integrations owns setup and mapping management

The `Integrations` module owns GitHub App setup sessions, user authorization with GitHub, installation/repository mapping synchronization, and mapping suspension. `Projects` and learning modules do not write Integration mappings and never receive GitHub OAuth/user tokens.

### 2. Mapping management requires `integration.manage`

A dedicated `integration.manage` capability is organization-scoped. `organization_owner` and `organization_admin` receive it by default. Instructor, mentor, and learner roles do not.

Setup initiation and final mapping mutation both re-check the authenticated Nexus user and `integration.manage`. Losing authorization while the browser is away at GitHub prevents final binding even when the setup state is otherwise valid.

### 3. Setup state is server-side, short-lived, user-bound, and single-use

Setup initiation creates a cryptographically random 256-bit state value with a ten-minute lifetime. Only SHA-256 of that state is stored in PostgreSQL. The raw state is a temporary bearer value carried through the GitHub installation URL.

The setup callback requires the same authenticated Nexus user that initiated the setup. A narrow `SECURITY DEFINER` function atomically consumes the installation state while recording the candidate external installation id and a newly generated OAuth state hash.

The OAuth state is also cryptographically random, stored only as SHA-256, bound to the initiating Nexus user, and atomically consumed before GitHub token exchange. Network or GitHub failures after state consumption require a new setup session rather than permitting ambiguous replay.

### 4. `installation_id` is a candidate, never proof

The `installation_id` returned to the configured GitHub App setup URL is treated only as an untrusted candidate identifier.

After the setup state is consumed, Nexus redirects the same browser into the GitHub App web authorization flow. The OAuth callback exchanges the authorization code using runtime-only GitHub App client credentials and receives a short-lived GitHub App user access token.

The GitHub adapter then:

- lists installations accessible to that user access token;
- requires the exact candidate installation to be present;
- requires the installation to belong to the configured GitHub App id;
- requires the F6 minimum repository permissions;
- lists repositories accessible to that user for the exact installation.

The user access token is used only inside the adapter for this verification/synchronization step. It is never persisted, returned to product code, written to logs/events, or copied into outbox/inbox state.

### 5. Least-privilege GitHub App registration for the current F6 surface

The current F6 integration requires only the permissions necessary to observe the accepted project-review webhook surface:

- repository **Pull requests: read**;
- repository **Checks: read**;
- GitHub's required/implicit repository metadata access.

The app subscribes to the event families already accepted by ADR-0027: `installation`, `installation_repositories`, `pull_request`, `pull_request_review`, `check_run`, and `check_suite` (plus GitHub's `ping` webhook handshake).

This slice does not request repository Contents, Issues, Members, Administration, or Checks write permissions. A later slice must justify any permission increase against a concrete API operation.

`GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_ID`, app slug, OAuth callback URL, private key, and webhook secret are runtime configuration. Secrets/private keys are never stored in canonical PostgreSQL business tables.

### 6. Trusted setup synchronizes mappings idempotently

After both Nexus and GitHub authority checks succeed, one tenant transaction:

- activates or refreshes the exact installation mapping when it already belongs to that Organization;
- stores the GitHub account identity and repository-selection mode as external metadata;
- marks repositories no longer present in the verified GitHub repository set as `removed`;
- inserts or reactivates current repository mappings by exact GitHub repository id;
- records the Nexus user who linked the installation and the last synchronization time;
- completes the setup session.

Re-running trusted setup for the same Organization/installation is idempotent with respect to mapping identity. Exact external installation/repository ids cannot be claimed by another Nexus Organization; such attempts fail as ownership conflicts rather than reassigning rows.

### 7. Suspension is non-destructive

A Nexus integration manager may suspend a mapped installation. Suspension marks the installation `suspended` and its repository mappings `removed`, which immediately prevents ADR-0027 webhook routing from treating them as active.

Suspension does not delete installation rows, repository rows, setup history, or historical `github_webhook_inbox` facts.

A GitHub-originated uninstall (`installation.deleted`) and repository add/remove webhooks remain durable inbox inputs. Applying those external lifecycle events belongs to the next idempotent inbox-processor slice; webhook ingress itself remains side-effect free beyond inbox persistence.

### 8. No Project state, Evidence, or outbox contract is created here

Trusted setup changes only Integration-owned canonical state. It creates no Nexus Project/Team state, LearningEvent, Evidence, or Mastery mutation.

No integration outbox event is introduced yet because there is no downstream event contract in this slice. Later Project or processor slices may introduce transactional outbox events when a concrete consumer boundary exists.

## Consequences

- Knowing or spoofing a GitHub `installation_id` is insufficient to create a trusted tenant mapping.
- Setup CSRF/replay protection is server-side, expiring, user-bound, and fail-closed.
- GitHub user tokens remain ephemeral adapter credentials rather than platform state.
- Organization admins can safely link installations without granting instructors or learners integration-management authority.
- Mapping resynchronization can reflect GitHub repository selection without changing internal Project identity.
- Historical webhook facts remain auditable across disconnect/suspend operations.
- External uninstall/repository-change processing, retained-inbox rerouting, installation access tokens/private-key API calls, Project/Team modeling, and PR/check/review-derived Evidence remain later F6 slices.
