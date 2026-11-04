# ADR-0074: Characters and the skill map are presentation over Mastery

- Status: Accepted (stage 1). Spec v3 (2026-11-05) refines the progress rules: level 0–100 from **active** confirmed skills, skill confirmation by test, decay `skill-freshness@1`, and confirmation gated by prerequisite skills. These land as ADR-0075–0078; until then the stage-1 rules below apply
- Date: 2026-11-05

## Context

The owner wants learning to feel like levelling up characters on a skill map: ПК, Браузер, HTML, CSS, JavaScript, SQL and so on. Today it is a list of courses.

What already exists:
- Skills are organization-wide identities (`learning_content.skills`, unique `(organization_id, skill_key)`).
- Mastery is a current projection per `(organization, learner, skill)` derived from normalized Evidence (ADR-0005, ADR-0023). It does not depend on the course in which the Evidence was earned.
- Every skill of the published courses is checked by at least one quiz or assignment, so every skill can be mastered.

So a learner's level in a subject can be read from existing Mastery. No new learner state is needed.

## Decision

1. **Character.**
   - A Character is a learner-facing subject. It groups organization Skills into ordered **branches**; stage 1 takes these from course chapters.
   - Each skill belongs to exactly one character.
   - A Character is not a story character: the content rule against storylines stays.
2. **Requirements.**
   - A branch may require other branches, also in other characters, for example CSS «Старт» requires HTML «Основы HTML». Inside a character every branch requires the previous one.
   - A branch is unlocked when each required branch is at least `unlockShare` (0.5) mastered.
   - The graph must have no cycles.
3. **Progress is derived, never stored.**
   - A skill is `mastered` when its Mastery score is at least `masteredScore`: 0.8, the readiness target of ADR-0041.
   - It is `progress` when it has Evidence and is not mastered yet.
   - Otherwise it is `open` or `locked` according to its branch.
   - XP = Σ mastery score × 100.
   - Level = ⌊mastered share × 10⌋.
4. **Advice, not access.** `locked` is a recommendation shown in the interface. It never grants or denies access: Enrollment and Entitlement still decide that, and the learner can open any public lesson.
5. **Stage 1: a versioned file.**
   - The map (`skill-map@1`) is built from the course manifests and `docs/examples/skill-map/characters.mjs` by `docs/examples/skill-map/build.mjs`.
   - It is committed as `apps/web/src/lib/skill-map/skill-map.json`, and a test fails if it is stale.
   - Web uses it for presentation only, like the learning route of ADR-0066.
   - The test also checks that every skill of every manifest belongs to exactly one character and that the graph has no cycles.
6. **Learner progress API.**
   - `GET /v1/me/skills/{organizationSlug}` returns the caller's own Mastery for every skill of the organization that has Evidence, keyed by `skillKey`.
   - It has the same authority as other own-learner reads: only the caller's own data, no role needed.
   - It is assembled in Learning Progress from `MasteryQuery` and the Learning Content public interface, without new persistence.
7. **Stage 2 (later, by the owner's decision).**
   - The map becomes a published immutable version inside Learning Content: import `skill-map@1` and an editor in Studio, with a migration.
   - Web then reads it from the API.

## Consequences

- Characters cost no migration and no new projection. The history of every learner already counts towards their levels.
- Courses stay the content source. A course page can show which characters it levels up.
- A skill added to a manifest must be placed in a character, otherwise the build fails. A course republish therefore also needs the map rebuilt.
- Pricing by character needs its own decision: Products and Entitlements still grant Offerings, not characters (see `docs/roadmap/characters-spec.md`, section 6).
