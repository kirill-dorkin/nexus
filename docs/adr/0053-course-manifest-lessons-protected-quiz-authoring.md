# ADR-0053: CourseVersion Lessons, manifest v1 and protected quiz authoring

- Status: Accepted
- Date: 2026-10-06

## Context

The F0-F9 core has immutable CourseVersion Skill/Activity snapshots, but no executable Lesson model or whole-course authoring workflow. YouTube visitors need ordered video, notes and practice within the same published curriculum. The existing learner runner returns Activity.config, so storing quiz answers there would disclose them before a learner submits anything.

## Decision

Content owns stable Lesson identities scoped by Course and slug. `course_version_lessons` and ordered typed `course_version_lesson_blocks` snapshot their presentation inside the existing CourseVersion publication lifecycle. There is no independent Lesson release or second CourseVersion payload. Blocks are YouTube ID, Markdown source, or a same-version Activity reference with practice/homework kind and required flag. Markdown source is inert authoring text; the later Web renderer must disable raw HTML and unsafe links.

`CourseManifestV1` is a strict, versioned transport format, never a separately persisted source of truth. Array index defines position. Skill references use organization-stable keys included in this course; Activity and Lesson references use course-local slugs. Video locators normalize to one canonical 11-character ID. Actor, user, tenant and arbitrary iframe authority cannot be supplied by the document.

V1 supports only the three deterministic quiz authoring shapes. Immutable protected answers and explanations live in Content-owned `quiz_validation_configs`, pinned by exact ActivityVersion and CourseVersion. Learner-visible Activity.config carries only presentation and a non-secret `(validatorKey = activityType, validatorVersion = 1, config = {})` binding. This extends ADR-0020's binding without making its private configuration public, following ADR-0025's protected-content precedent. No public/learner query joins the protected table. Export requires `course.manage` plus `activity.manage`, never the learner-visible `course.read`. The legacy generic Activity create command rejects the reserved `quiz.*` namespace to prevent bypassing protected authoring.

This slice authors quiz definitions, not their execution. Registry implementations and the learner-owned check command remain a subsequent Validation slice. Until then these new bindings fail closed as unsupported by the runtime registry; no grader activation, ValidationResult, Evidence or Mastery is fabricated.

Import validates the entire schema before opening a mutation transaction. A read-only repeatable-read dry-run performs authorization, detects draft/retired-Skill conflicts, and returns an import plan with optimistic concurrency tokens. Apply revalidates authority and current state, serializes the course slug/identity and CourseVersion, and compares the tokens. It creates a Course plus draft, replaces a compatible current draft, or creates the next draft when no draft exists. Graph replacement is atomic, including canonical outbox records. Retry after a changed revision returns an explicit conflict and requires a fresh preview rather than silently overwriting edits.

Stable Skill identities are reused, never replaced or edited globally by import. Imported labels belong to CourseVersion snapshots. Content retains stable Activity slug bindings and Lesson identities across removal/re-addition and ordinary next-version cloning. Historical Activity slug ambiguity fails closed rather than guessing identity. Export reconstructs the format from canonical snapshots. Unrepresentable existing draft features (legacy activity config, Guided Build, supporting mappings, remediation) cause a conflict instead of silent data loss. A new imported revision can replace a published legacy course by creating its own new draft without altering the old release.

Ordinary next-draft creation clones Lessons and protected quiz definitions together with the existing graph. Manifest-managed publication reconstructs and validates the complete graph, including at least one Lesson and valid quiz config. Legacy versions without the additive marker retain their established publication behavior; the MVP's stricter structural requirements apply when opting into manifest authoring.

## Transactions, events and security

All new tables have tenant RLS under the normal runtime role. No anonymous policy, SECURITY DEFINER, worker privilege or new role is introduced. New draft-only DELETE privileges on existing snapshot tables are paired with restored DELETE immutability triggers. The shared graph guard locks the owning CourseVersion to serialize writes against publication. Row-level changes advance its authoring revision, including existing graph commands. A dry-run cannot generate UUIDs, content, revisions or outbox writes.

The migration role retains operational hard-purge authority, as established by migration 000005. Only DELETE under a non-API database role bypasses the draft-only guard/revision update; API cannot assume that role and has no DELETE privilege on stable identities or CourseVersions.

Creation reuses `course.created`, `course_version.created` and `skill.created`. `course_version.manifest_imported@1` records aggregate identity, schema version, revision and counts, atomically with graph replacement. It never carries Markdown, learner answers, protected explanations, full manifest or validator payloads. Bulk snapshot replacement is represented by this aggregate event, not a parallel per-row learner lifecycle. No downstream learner consequence is defined by import.

Browser POST endpoints use the existing exact-Origin session guard. Import/export use existing capability rules and active identity/membership checks. Published snapshots are immutable, cross-course/version references are database-constrained, and public learners receive no authoring/answer-key access.

## Consequences and next slices

Content can be prepared externally and imported/exported using the same canonical draft that Studio will later edit. Public visibility, rendering, self-enrollment, non-code validation, Studio and production deployment remain separate coherent slices. The first release does not require Commerce changes or production learner-code execution.
