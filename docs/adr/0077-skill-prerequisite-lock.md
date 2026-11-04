# ADR-0077: Confirming a skill requires active prerequisite skills

- Status: Proposed (depends on ADR-0078)
- Date: 2026-11-05

## Context

The owner's rule: to pass anything, you must first study and confirm the skills it stands on. Stage 1 shows the lock in the interface only (ADR-0074, point 4).

## Decision

1. The skill map defines prerequisites per skill and per branch (ADR-0078). A skill is **lockable** when any prerequisite is not active by `skill-freshness@1` (ADR-0076).
2. Starting a skill test (ADR-0075) or a branch fight for a lockable skill returns `409 prerequisites_not_confirmed` with the list of missing skill keys.
3. **What is not locked:**
   - reading lessons;
   - in-browser practice;
   - existing lesson quizzes, which are practice.
   Knowledge is never hidden; only confirmation is gated.
4. **This is not access control.** Enrollment and Entitlement still decide who may open a course or a character. The lock is a learning rule on confirmation.
5. Branch tests (extern) are allowed when the branch's required branches are at least half active, as in Web.

## Consequences

- A learner who forgot a foundation skill must recall it before confirming what stands on it. This is intentional.
- The rule needs the map on the server (ADR-0078) before it can be enforced.
