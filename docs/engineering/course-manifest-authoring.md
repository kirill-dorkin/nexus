# Manifest v1 authoring

See ADR-0053 and `docs/examples/computer-basics.manifest.json`. This is authoring infrastructure; learner pages and quiz execution are delivered by later MVP slices.

## Contract

`CourseManifestV1` contains strict `course`, `skills`, `activities`, `lessons` objects and `schemaVersion: 1`. Unknown fields/versions, duplicate slugs/keys/option IDs, broken references, unknown Activity types and malformed video locators fail with an element path. Array order is the only position field. All Skill references must be declared in this course; all Activity block references must be declared in this version. Quiz types are `quiz.single_choice`, `quiz.multiple_choice`, `quiz.short_text`.

YouTube `videoId` accepts a canonical ID, HTTPS youtube.com watch/embed/shorts link, or youtu.be link. It exports a canonical ID. Raw iframe HTML, arbitrary hosts, credentials and custom ports are rejected. Markdown is source text; public rendering must disable raw HTML and unsafe URL protocols.

## API

All routes use the existing authenticated session. Browser POSTs require the exact configured WEB_APP_ORIGIN. Identity/tenant authority comes from session and route, never manifest fields.

1. `POST /v1/organizations/:organizationId/courses/manifest/validate` with the manifest itself. This is a read-only transaction. It returns `mode`, optional course locator, `expectedDraftVersionId`, `expectedRevision`, and counts. No content is changed or published.
2. `POST /v1/organizations/:organizationId/courses/manifest/apply` with `{ manifest, expectedDraftVersionId, expectedRevision }`, copying both concurrency tokens from the preview. The command revalidates current authority/state. A changed draft returns 409 and requires another preview.
3. `GET /v1/organizations/:organizationId/courses/:courseId/versions/:versionId/manifest` exports the canonical draft. This protected authoring endpoint requires course/activity manage capability and does not accept a published version.
4. Existing `POST .../versions/:versionId/publish` publishes a valid manifest-managed draft. Existing `POST .../versions` creates a new draft and clones its full authored Lesson/quiz graph.

Import requires course/activity manage at the existing course scope (organization scope for a new course) and organization-scoped skill manage because it can create shared Skills. Active existing Skills are reused by key without changing their global presentation. Retired Skills fail closed. Imported labels are version-local.

`expectedRevision` is the draft's authoring revision when a draft exists; otherwise it is the latest version number (0 for a new course). The token is an opaque comparison value for clients. Draft graph changes from existing commands also advance the revision.

## Safety and compatibility

Import changes only the draft. Published snapshots, historical Attempts and Delivery state are preserved. Manifest-managed versions require at least one valid Lesson and safe supported quiz definitions before publishing. Existing legacy publication remains compatible until the author explicitly adopts manifest v1.

V1 cannot represent legacy config, Guided Build, supporting Skill mappings or remediation. Replacing such a current draft is rejected, rather than deleting unrepresentable content. A published legacy course can receive a new complete manifest draft; its older release stays immutable.

Correct answers, accepted answers and private explanations live separately from learner-visible Activity.config. A learner/mentor with course.read cannot export them. Outbox messages contain only identifiers/revision/counts, never authored content or answer material. Reserved quiz.* activities cannot be created through the generic legacy Activity command.

## Focused verification

After applying migration 000040 with normal local migration credentials:

```bash
pnpm db:migrate
pnpm exec vitest run packages/contracts/src/course-manifest.test.ts
pnpm test:integration apps/api/src/course-manifest-http.integration.test.ts
```

The integration suite uses real PostgreSQL 18, API authentication/principal and authorization, normal runtime RLS, the actual learner runner projection, and operational fixture cleanup. Fixtures never become deployed learning content.
