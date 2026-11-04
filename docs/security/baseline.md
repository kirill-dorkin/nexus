# Security Baseline

Ориентир для требований: OWASP ASVS + отдельная threat model для untrusted code execution.

## Authorization and tenancy

- Authentication != Authorization.
- Decision = Actor + Organization + RoleAssignment + Permission + Resource relationship + Policy.
- Проверка resource-level authorization на каждом request/command.
- Tenant-owned records имеют `organization_id` или строгую ownership chain.
- PostgreSQL RLS — defense-in-depth; runtime roles не superuser/BYPASSRLS.
- Cache keys, background jobs и outbox payload сохраняют tenant context.

## Sessions and web

- HttpOnly/Secure/SameSite cookies;
- CSRF protection для cookie auth;
- strict CSP;
- validation на trust boundaries;
- upload restrictions;
- request bodies limited to 1 MiB; only the manifest validate/apply routes allow 4 MiB (`apps/api/src/http/body-limits.ts`), below the 4.5 MB Vercel Functions cap;
- rate limits по risk profile;
- security headers;
- MFA/passkeys для privileged accounts.

## Secrets and data

- secrets only in secret manager/CI environment;
- structured logs без tokens/source bundles/PII by default;
- private object storage + signed URLs;
- encryption in transit;
- tested backups/restores;
- retention/deletion lifecycle.

## Webhooks

Verify signature -> validate type/action -> deduplicate delivery -> persist inbox -> respond fast -> async processing.

## Grader

Grader has no production DB role. Student execution has no production network path or secrets. Infrastructure failure produces system failure, never negative learning evidence.

## Public curriculum presentation

ADR-0054 public reads require explicit Offering visibility and the active/open/free/self-paced/published gate. Anonymous bypass uses narrow schema-owned read functions; private tenant/version helpers are not runtime capabilities and base-table RLS is unchanged. Public lesson data is an allowlist, never raw Activity.config or protected quiz definitions. Markdown renders without HTML, events, remote images or unsafe links; iframe host/attributes are renderer-owned. Visibility changes and their redacted outbox event commit atomically under manage/session/Origin authority.

## Free learner entry

ADR-0055 preserves API-owned session authority and exact-Origin writes. Role-less own free enrollment consumes only public slugs and an empty strict command, with active identity/membership and locked public/open/self-paced/membership/published gates. It cannot create Membership, RBAC role or Entitlement. Narrow authenticated actor-bound Delivery locator reads do not widen ordinary RLS. Own progress omits private curriculum/result payloads and is derived from exact-enrollment validation Evidence; no percentage grants canonical completion. Learning login return targets are allowlisted local paths, never arbitrary redirects.


Deterministic free quiz checks (ADR-0056) use principal-owned active Membership/Enrollment relationships and locked current public free gates, never caller outcomes or validation.record grants. Protected Content answers/explanations remain server-only; raw result/Evidence/feedback are explicit allowlists. Attempt keys are immutable retry locators scoped by own exact Enrollment/ActivityVersion, not authority. Separate work/raw/normalization commits preserve operational failure semantics and idempotent recovery. No SQL privileges or grader activation are added.


## Studio authoring

ADR-0057 uses current capability-filtered tenant reads and existing manifest import authority. The own Organization locator function is principal-bound and read-only; normal RLS is unchanged. Protected drafts/keys enter only the authorized author browser and explicit JSON downloads, never public HTML, preview markup, outbox or Web storage. New writes require exact Origin. Publication checks the loaded revision under the Content version lock; stale tabs cannot overwrite/publish concurrent changes. Studio login returns only to strict local UUID routes.
