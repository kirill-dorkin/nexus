# Development workflow

This document defines the required delivery process for architectural work in Nexus. It applies to humans and coding agents unless a repository maintainer explicitly overrides a step for a specific change.

## Principles

- `main` is the integration source of truth and must remain releasable.
- One branch and one PR should represent one coherent architectural slice.
- Design and invariants come before implementation.
- Two gates: the local `pnpm check` before every push and GitHub CI on the PR head. The maintainer verifies only what the PR marks as owner-only.
- A red existing PR is repaired in place rather than replaced with a second PR.
- Small causal fixes are preferred over speculative refactors.
- Architecture documentation changes with the architecture, not later.

## Standard architectural slice

### 1. Re-establish current truth

Before writing code:

- inspect the current `main` head;
- read the bootstrap set from `AGENTS.md`;
- inspect the roadmap and current architectural checkpoint;
- read the ADRs relevant to the slice;
- inspect the existing code, migrations, tests, authorization, public module interfaces, and event/outbox behavior that the slice will touch.

Do not design from conversation memory or an old PR snapshot.

### 2. Design the slice

Define the smallest coherent vertical change that advances the roadmap while preserving existing invariants. State explicitly:

- the domain boundary and owner module;
- what is in scope and deliberately out of scope;
- authorization and tenant-isolation impact;
- persistence/migration impact;
- event/outbox impact;
- backward-compatibility or transition behavior;
- tests that prove the changed invariants;
- whether an ADR is required.

Avoid giant branches that combine multiple independent policy decisions.

### 3. Create a short-lived feature branch

Create the branch from the verified current `main`. Never implement directly on `main`.

Use a descriptive branch name tied to the slice, for example `foundation/f4-validator-registry` or `docs/agent-context-bootstrap`.

### 4. Implement through the repository

Keep changes inside the owning module and established boundaries. Add or update migrations, tests, ADRs, and documentation in the same branch when the slice requires them.

For canonical business mutations, business state and its canonical outbox event must commit atomically when an event is part of the contract.

### 4a. Take ADR and migration numbers only after checking parallel work

Several sessions work in parallel, so the next free number on `main` may already be taken. Before you add an ADR or a migration, check `main`, the open PRs and the `wip/*` branches. Then write the number into the «Reserved numbers» table in `docs/engineering/current-state.md`. When two branches have the same number, the one that merges later renumbers.

### 5. Open a Draft PR

Open a Draft PR as soon as the slice is reviewable. The PR description should include:

- why the slice exists;
- architectural decisions and important invariants;
- migrations and compatibility windows;
- security/authorization impact;
- verification performed or still pending;
- explicitly deferred follow-up work.

Keep the PR Draft while CI or required local verification is unresolved.

### 5a. Run the local gate before every push

Run `pnpm check` (brand isolation, formatting, lint, typecheck, unit and component tests, Web coverage floors) on the developer machine before pushing. Type-aware lint holds every package's TypeScript program in memory (about 3 GB), so it runs locally rather than on GitHub-hosted runners; GitHub CI keeps the database, integration, launch and browser gates. Record the local result in the PR test plan.

### 5b. End-to-end tests

GitHub CI runs them on every PR. To run them locally (Docker with the development PostgreSQL from `pnpm dev:infra`):

```sh
PGPASSWORD=local_postgres_admin psql -h 127.0.0.1 -U postgres -f tests/e2e/local-database.sql  # once
pnpm turbo build --filter=@platform/api...
NEXT_PUBLIC_API_ORIGIN=/ pnpm --filter @platform/web build
pnpm exec playwright install chromium   # or E2E_BROWSER_CHANNEL=chrome where Playwright has no Chromium build
pnpm test:e2e
```

The local run uses its own `platform_e2e` database, never the development one.

### 6. Make GitHub CI green

Inspect the workflow for the exact PR head. If CI fails:

1. identify the failing job and step;
2. extract the exact failing test/error/annotation whenever GitHub exposes it;
3. inspect the PR diff and code around the failure;
4. determine the causal mismatch before changing code;
5. make the minimum causal fix in the same branch/PR;
6. rerun and inspect CI again.

Do not ask the maintainer to run local tests merely to discover a failure that GitHub CI can diagnose.

### 7. Owner-only verification

The author runs the local gate (5a), so the maintainer does not rerun it. Ask the maintainer only for what the author cannot do: production secrets, course publishing with the owner password, and owner decisions. List these as exact steps in the PR.

Production migrations are applied automatically before each deploy of `main` (ADR-0079), so a merged migration reaches production within minutes: keep it additive and compatible with the release that is still running. A docs-only change needs only text and link checks: CI skips Markdown.

### 8. Mark Ready only after both gates are green

The PR may move from Draft to Ready only when:

- GitHub CI is green on the current head; and
- `pnpm check` passed locally on that head and is recorded in the test plan.

If the head changes after either gate, decide whether the changed files need the gate again.

### 9. Squash merge

The author may squash merge their own PR once it is Ready. A PR that waits on an owner decision stays Draft and is not merged. Use squash merge so the architectural slice lands on `main` as one coherent commit. Protect the merge with the expected PR head SHA when the tooling supports it.

Do not merge a red PR or bypass unresolved architecture/security concerns merely because the diff is small.

### 10. Synchronize local main

After merge, the maintainer should return to and fast-forward local `main` before the next slice:

```bash
git switch main
git pull --ff-only
git status
```

The next slice starts from the new verified `main`, not from the merged feature branch.

## Bug and CI-repair mode

A narrow bug or red CI on an existing PR is not a new architectural slice by default. Stay on the existing PR, establish the exact failure, preserve its intended architecture, and make the smallest causal correction. Create a separate ADR or follow-up slice only when the failure reveals a genuinely new long-lived design decision.

## Documentation maintenance

`docs/engineering/current-state.md` is a checkpoint, not live GitHub telemetry. Update it in the same PR when a slice changes any of these:

- Foundation completion/frontier;
- durable implemented capabilities;
- active compatibility windows or deprecations;
- latest architectural decision frontier;
- the recommended next slice.

Do not record transient PR status, temporary CI state, or feature-branch SHAs there. Those must always be queried from GitHub.
