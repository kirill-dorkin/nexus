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
