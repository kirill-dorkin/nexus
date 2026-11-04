# ADR-0078: The skill map becomes a published version in Learning Content

- Status: Proposed (owner decision and a migration needed)
- Date: 2026-11-05

## Context

Stage 1 keeps the map as a file built into Web (`skill-map@1`, ADR-0074). The server needs the map to enforce prerequisites (ADR-0077). Authors need it to add characters without a code release. Characters will number in the dozens (spec v3, section 3.2).

## Decision

1. A **SkillMap** is a Learning Content aggregate with immutable published versions, like Course:
   - characters with name, role, accent and technology version;
   - branches with requires;
   - skill membership, skill prerequisites and story references;
   - coverage indexes per character.
2. It is authored as a manifest `skill-map@2` (JSON). It is validated and applied through `organizations/:org/skill-maps/manifest/{validate,apply}` and published like a course version. The current builder output becomes the first version.
3. Validation rules:
   - every referenced skill exists in the organization;
   - each skill belongs to exactly one character;
   - the requirement graph has no cycles;
   - every coverage index entry is covered.
4. `GET /v1/public/skill-map/{org}` serves the current published version. Web reads it instead of the bundled file once it exists; the file stays as a fallback for a release.
5. Learning Progress reads prerequisites through a Learning Content public interface (`SkillMapQuery`), never through its tables.

## Consequences

- One migration: tables `skill_maps` and `skill_map_versions` with the document as checked JSON, plus normalized `skill_prerequisites`, with RLS. The owner applies it.
- `launch-course.mjs` gains a step to publish the map after the courses.
