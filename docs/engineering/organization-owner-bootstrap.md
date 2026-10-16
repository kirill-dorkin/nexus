# Operator bootstrap: Organization and owner

This is a **trusted, offline operational command**, not an account signup or Studio feature. Use it only from an authorized workstation or controlled run environment with the dedicated `platform_migrator` credential.

> **Important:** Both legacy Organization-create HTTP routes now reject ordinary authenticated users with 403 (anonymous: 401). This command is the only currently supported provisioning path for the initial Academy or additional Organizations. Never copy migration credentials into an API/Web/Worker runtime.

## Prerequisites

1. Apply the existing ordered migrations using the approved deployment procedure.
2. Register the intended owner as an ordinary Identity user, using the normal email or OAuth flow. Confirm that the user's canonical Identity status is `active` and obtain their server-side UUID through an authorized operations read. Do not use an email string or an OAuth provider identity as the bootstrap argument.
3. Retrieve `DATABASE_MIGRATION_URL` securely. It must connect as exactly `platform_migrator`; the normal `DATABASE_URL` (`platform_app`) and worker credentials are intentionally refused. Never commit or print connection strings.

Run from the repository root with Node 24 and repository-pinned pnpm:

```sh
# DATABASE_MIGRATION_URL is supplied via a protected secret manager.
pnpm run org:bootstrap-owner \
  --owner-user-id '<existing-active-identity-uuid>' \
  --slug 'nexus-academy' \
  --name 'Nexus Academy' \
  --apply
```

The command returns a small JSON result with `id`, `slug`, and `outcome` (`created` or `already_provisioned`). It never prints credentials or the owner's email. Missing `--apply` or invalid input fails before any database write.

## Guarantees

- Active Identity is required; direct typed email or session data cannot confer owner authority.
- Uses a transaction to create the Organization, active owner Membership, organization-scoped `organization_owner` assignment and `organization.created` outbox event together.
- A repeat of the *exact same* owner, slug and name validates all existing facts and returns `already_provisioned` without duplicate events or grants.
- A slug owned by someone else, changed name, missing event/role or suspended owner fails closed. Operators must reconcile conflicting state manually; never bypass this check.
- No schema migration, public API grant or production runtime dependency is added.

## Verification

```sh
pnpm test -- apps/api/ops/provision-owner-organization.test.ts
pnpm test:integration -- apps/api/ops/provision-owner-organization.integration.test.ts
```

The integration test requires both `DATABASE_MIGRATION_URL` and `DATABASE_URL` and uses isolated disposable users/Organization under PostgreSQL 18.

## Rollout sequence

The operator command landed in Stage A (#105). Stage B removes the user-session routes and Studio form, with real PostgreSQL HTTP negatives and Chrome fixtures that invoke the operator command only from the test runner. A deployed platform without an initial Organization must be provisioned by trusted operations, not by relaxing browser-side authorization. No HTTP test-only bootstrap exists.

Do not delete existing Organizations merely to retry bootstrap. Record the resulting Organization id through the authorized operational runbook.
