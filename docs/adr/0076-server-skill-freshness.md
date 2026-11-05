# ADR-0076: Skill freshness `skill-freshness@1` as a server policy

- Status: Accepted (owner, 2026-11-05)
- Date: 2026-11-05

## Context

ADR-0074, as amended, computes freshness in Web from the confirmation days returned by `GET /v1/me/skills/{org}`. That is enough for display. However, ADR-0077 must refuse a test when its prerequisites are forgotten, and that refusal has to be decided on the server from the same rule.

## Decision

1. Learning Progress owns `skill-freshness@1` as a pure, versioned policy:
   - terms of 3, 7, 21, 60, 180 and 365 days;
   - 7 days of grace;
   - a confirmation in the second half of the term or in grace steps up;
   - an earlier confirmation only restarts the term;
   - relearning after forgetting steps down.
   Inputs are the distinct UTC days with passing Evidence for the skill.
2. One implementation, so the API and Web cannot drift: `packages/contracts/src/skill-freshness.ts`. It is zod-free and exported from `@platform/contracts` and `@platform/contracts/browser`.
3. `GET /v1/me/skills/{org}` adds `freshness: { policy, state, step, dueOn, forgottenAfter }` per skill.
   - The API computes it over **every** confirmation day; `confirmedDays` in the response stays capped at the latest 30.
   - Web prefers the API value and recomputes from the days only when it is absent.
4. Nothing is stored. Changing the policy means a new version (`skill-freshness@2`) chosen explicitly, never silent recomputation of old meanings.

## Consequences

- No migration.
- A policy change is visible in history: states are always recomputable from Evidence.
