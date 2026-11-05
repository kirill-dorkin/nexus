# Nexus agent bootstrap

This file is the mandatory entry point for coding agents working in this repository. It is a navigation and process document, not a replacement for the architecture docs, ADRs, tests, migrations, or current GitHub state.

## Source-of-truth order

When sources disagree, use this order:

1. the current `main` branch, migrations, tests, and executable code;
2. accepted ADRs and architecture/security documentation;
3. `docs/engineering/current-state.md` as a maintained architectural checkpoint;
4. roadmap and planning documents;
5. conversation history, issue/PR prose, or agent memory.

Never treat a remembered branch, PR, CI result, commit SHA, schema shape, or implementation detail as current without checking GitHub.

## Required bootstrap before an architectural slice

Before designing or changing an architectural slice:

1. inspect the current `main` head and repository state;
2. read `docs/engineering/current-state.md`;
3. read `docs/roadmap/foundation.md`;
4. read `docs/architecture/module-boundaries.md`;
5. read `CONTRIBUTING.md` and `docs/engineering/development-workflow.md`;
6. identify and read every ADR relevant to the slice in `docs/adr/`;
7. inspect the existing implementation, migrations, tests, public application interfaces, authorization policy, and outbox behavior that the slice touches;
8. design the smallest coherent slice before writing code.

Do not reread every repository document mechanically. Read the mandatory bootstrap set above, then follow links and inspect only the domain/security/ADR material relevant to the change.

## Required bootstrap for a bug or red CI

For a narrow bug or CI failure, do not redesign the system. First inspect the exact branch/PR head, changed files, failing workflow/job/step, error or annotation, relevant test, and code around the failure. Read architecture/ADR documents only where they constrain the fix. Prefer the smallest causal fix and preserve established invariants.

## Development workflow

Follow `docs/engineering/development-workflow.md` exactly. In particular:

- never develop directly on `main`;
- use one short-lived branch per coherent slice;
- open a Draft PR before treating the slice as complete;
- run `pnpm check` locally before every push, and diagnose and fix GitHub CI in the same PR;
- check open PRs and `wip/*` branches before you take an ADR or migration number, then reserve it in `current-state.md`;
- mark the PR Ready only after CI and the local gate are green;
- squash merge your own PR only after those gates pass; a PR that waits on an owner decision stays Draft;
- never do owner-only actions yourself (production secrets, course publishing with the owner password); list the exact steps in the PR instead;
- after merge, synchronize local `main` before starting the next slice.

If an existing PR is red, fix that PR in place unless there is an explicit architectural reason to replace it. Do not create a second PR merely to repair the first one.

## Architecture guardrails

These are navigation-level reminders. The linked ADRs and code remain authoritative.

- Nexus is a modular monolith; module boundaries are real ownership boundaries.
- PostgreSQL is the source of truth for canonical business state.
- Tenant isolation is enforced in both application authorization and PostgreSQL/RLS; organization and actor context are transaction-local.
- Migrations are ordered, append-only, backward-aware changes. Never edit an already-applied migration to change history.
- A module does not reach into another module's repository/table as its integration mechanism. Synchronous cross-module work goes through public application interfaces; deferred consequences use events/outbox.
- Business state and its canonical outbox event are committed atomically in the same transaction.
- Published curriculum is immutable and describes what is learned; Delivery describes how/when/to whom it is delivered.
- Purchase, Entitlement, and Enrollment are distinct concepts.
- Group and Team are distinct concepts.
- Assignment schedules/targets work; it does not itself grant access, enrollment, or membership.
- Attempts pin the exact immutable `ActivityVersion`.
- Attempt and Submission are separate lifecycles. A Submission is immutable learner work committed for an Attempt; Evidence evaluates a Submission.
- Mastery is derived from normalized Evidence, not raw grading payloads.
- Grader/sandbox hardening is a separate security boundary and must not be casually collapsed into the application process.

## Documentation discipline

When a merged slice changes a durable architectural decision, update or add the appropriate ADR in the same slice. When it changes the Foundation frontier, completed capabilities, compatibility windows, or next recommended slice, update `docs/engineering/current-state.md` in the same PR.

Do not duplicate detailed architecture into `AGENTS.md`. Keep this file stable, short enough to reread at the start of work, and focused on where truth lives and how work proceeds.
