# Studio authoring

Open `/studio`, sign in using the existing account, then select an active Organization. The course list is filtered by current `course.manage` + `activity.manage`; a learner Membership does not grant authoring. An explicit “Создать организацию” action uses the normal owner bootstrap. Creating a course or applying an import also requires organization-level `skill.manage`, as established by manifest authoring.

1. Open an available course or choose “Создать курс”. Fill the title/description and stable slug. Add Skills, quiz Activities and Lessons as needed.
2. Manual fields cover manifest v1 completely. Use ↑/↓ to order Skills, Activities, Lessons, blocks, options and accepted text answers. Blocks accept YouTube URL/ID, Markdown or an Activity reference, including practice/homework, optional title and required flag. Correct answers/explanations are protected author data.
3. JSON mode accepts a UTF-8 file up to 900 KB or textarea input. Unknown fields, invalid shapes/references and duplicate keys produce errors with element paths. Invalid JSON stays in the textarea until corrected. Manual mode edits every imported field.
4. “Предпросмотр” displays the validated working document safely. It neither saves nor performs learner checks. “Проверить документ” performs the existing read-only server plan. “Сохранить черновик” applies that exact plan/document atomically.
5. “Скачать сохранённый JSON” exports the server draft. “Скачать рабочую копию” downloads current valid unsaved edits; these are labelled separately. No draft/session/answer material is written to Web storage.
6. A conflict or ambiguous save/publication response preserves edits. Download a working copy if needed, then explicitly “Отбросить изменения и загрузить сохранённое” before checking/saving again. A fresh plan cannot bypass a loaded-base mismatch. For an ambiguous new-course save, return to the course list to find the created course before repeating creation.
7. Preview the saved unchanged draft, then publish its exact revision. A published version is immutable. “Создать следующий черновик” creates the next version through the same importer; the old release stays intact. Content publication does not make an Offering public or move an existing Offering to the new version.

New authenticated API surfaces (all reads `Cache-Control: no-store`):

| Route | Meaning |
|---|---|
| `GET /v1/me/organizations?after=<uuid>` | At most 100 own active membership Organization locators and next cursor |
| `POST /v1/me/organizations` | Explicit strict `{slug,name}` create under existing session/Origin/owner-bootstrap rules |
| `GET /v1/organizations/:org/studio/courses?after=<uuid>` | Capability-filtered author course metadata, next cursor and create hint |
| `GET /v1/organizations/:org/studio/courses/:course` | Protected canonical manifest + exact revision/version and apply/publish hints |
| `POST /v1/organizations/:org/studio/courses/:course/draft` | Strict empty command; explicit revision-fenced next draft |
| `POST /v1/organizations/:org/studio/courses/:course/publish` | Strict `{draftVersionId,expectedRevision}`; publication under Content lock/outbox |

Manual and JSON edits reuse the existing `/courses/manifest/validate`, `/courses/manifest/apply` and draft `/manifest` export. Ordinary tenant RLS remains enabled; migration 000043 exposes only actor-owned Organization locator discovery.

Focused local gate after full exact-head GitHub CI:

```bash
pnpm db:migrate
pnpm test:integration apps/api/src/studio-http.integration.test.ts
```

The full CI browser gate now checks canonical Studio with real registration/session/HTTPS and PostgreSQL. `pnpm test:browser-launch` requires built API/Web, PostgreSQL and Chrome, as documented by the existing browser gate. Slice F still owns the complete canonical learner browser loop plus deployment.
