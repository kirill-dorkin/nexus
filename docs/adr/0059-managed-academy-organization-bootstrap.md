# ADR-0059: Managed-academy Organization provisioning (proposed)

- Status: **Proposed** (preparatory operator implementation only; not an accepted replacement for ADR-0057)
- Date: 2026-10-16
- Relates to: issue #99, frontend master spec v1.2 §§2.5, 3.1, 7.4 and Phase 7

## Context and security decision

The managed-academy product permits ordinary registration to create only an Identity user. It must not issue Organization ownership. On current main, both POST /v1/me/organizations and POST /v1/organizations delegate to OrganizationsApplicationService.createOrganization, which bootstraps owner Membership, organization_owner assignment and an outbox event for any active authenticated user. An Origin guard prevents some CSRF, not unauthorized tenant creation. The existing behavior is explicitly described in ADR-0057, so changing it requires a separate accepted security decision.

The initial Academy and later additional Organizations need a trusted operational path independent of browser cookies, public registration, a user-controlled email value and tenant membership. Server-issued platform authority must not be inferred from an existing Organization role.

## Proposed two-stage transition

**Stage A (this PR):** introduce the offline owner-provisioning operation executed with an existing migration-role database connection. It is not an HTTP endpoint, API/Worker import, signup step or runtime feature flag. The operator selects the *existing active Identity UUID*, desired Organization slug and name, then explicitly confirms with --apply. The operation requires the current database role to equal platform_migrator and writes one Organization, active owner Membership, exact organization-scoped organization_owner assignment and canonical organization.created v1 outbox event atomically. Duplicate exact replay verifies all four existing facts and returns already_provisioned without another event; inconsistent/mismatched state fails closed. Dedicated migrator credentials remain outside persistent runtime services.

**Stage B (separate coherent security PR):** after Stage A verification, disable both user-session-based Organization creation HTTP routes for normal accounts. A platform-owner-only future ability to create additional Organizations must use an independently authenticated operations policy or the same offline operator path; do not implement an email/allowlist/client-supplied UUID bypass. Remove the learner-facing Studio self-create form, adapt Studio and real Chrome fixtures to provision test Organizations via trusted database test setup, and add negative direct HTTP tests covering new learners, members, foreign principals and anonymous requests. No externally accessible test-only bootstrap endpoint is permitted.

Stage A **does not make current public Organization creation safe**. Do not ship managed-academy claims or treat issue #99 as fixed until Stage B is merged and verified.

## Ownership and invariant boundaries

Organizations continues to own Organization and Membership creation. Authorization continues to own role meaning; the operational SQL selects only the canonical seeded system role. Event/outbox contracts are unchanged. A migration-role operation is an exception to ordinary app-tier RLS because it is performed outside runtime, using dedicated credentials and exact parameterized SQL. It grants no extra database or runtime privileges. User Identity must already exist and be active. This operator action never issues an Enrollment, Entitlement, Purchase or course content change.

No schema migration, API response contract, public query, frontend behavior, environment-controlled HTTP bypass or production runtime dependencies are introduced in Stage A. Failure at any SQL step rolls back the whole provision; the slug uniqueness constraint serializes competing creations. Concurrent identical invocation may produce a unique-constraint error and requires a read-only exact replay rather than a blind retry.

## Verification and release gate

- CLI argument tests reject missing --apply, invalid UUID/slug/name, duplicates and unknown switches.
- Real PostgreSQL integration verifies exact role/Membership/outbox atomic result, exact replay, mismatched owner/name rejection, inactive owner rejection and runtime app-role refusal.
- Operational invocation requires DATABASE_MIGRATION_URL. Never copy migration credentials into Web, API, Worker, CI public variables or logs.
- Stage B must separately verify **both** HTTP create endpoints fail closed, including their compatibility callers and visual Studio states, before closing issue #99.

## Rollback

The Stage A command is additive and does not run until invoked explicitly. Revert code without mutating provisioned Organizations. Actual data rollback, if required, is a separate audited operator action respecting existing foreign keys, ownership history and event semantics.
