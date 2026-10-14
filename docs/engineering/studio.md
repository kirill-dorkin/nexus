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

## Быстрый старт с первым учебным курсом

Для первого бесплатного запуска есть полностью редактируемый пример **«Как устроен компьютер — от деталей до программ»**: `docs/examples/computer-basics-first-course.manifest.json`. Он содержит 4 коротких текстовых урока и 8 автоматически проверяемых заданий, без фиктивных YouTube-видео. В Studio выберите «Создать курс» → «JSON» → загрузите файл → «Проверить документ» → «Сохранить черновик» → «Опубликовать». Затем отдельно откройте Offering и при необходимости самостоятельное вступление организации. Подробности и правила приёмки: `docs/examples/README-first-course.md`.

Импорт и merge этого репозитория **не меняют production PostgreSQL** и не публикуют курс автоматически. Новые видео добавляйте с собственными реальными YouTube ID в редакторе (для опубликованного курса потребуется новая версия). Не обещайте ученикам видеокурс, пока собственные ролики не сняты и не добавлены.

## Managing a published course's learner access

After publishing a course, open its **«Доступ и ссылка»** action from the Studio course list. This is a **Delivery Offering** control, separate from editing/publishing Content. The first version supports the **currently published** Studio version, not historic releases after a newer draft has become current. An Offering still pins its immutable CourseVersion; later drafts and releases never retarget it.

- The list calls `GET /v1/organizations/:org/offerings?courseVersionId=:version`, using the authorized cursor until `nextCursor` is null. It never lists arbitrary Organizations or versions, and the cursor grants no rights.
- **«Создать приватный доступ»** sends a fixed `self_paced` + `membership` Offering command. Visibility is always server-default `private`, not a field in the creation request. A possibly committed failed request requires reloading canonical list before retrying.
- **«Открыть публичный доступ»** requires a separate on-screen confirmation and calls `PATCH /v1/organizations/:org/offerings/:id/visibility`. **«Скрыть публичный доступ»** reverses it. Authorization, RLS, visibility eligibility, publication status and event/outbox rules remain API-owned.
- The copyable address is the canonical `/learn/:organizationSlug/:offeringSlug`, built from the current browser origin and authenticated own-Organization slug. It is only displayed for a public/open/self-paced/membership Offering. This is a locator, not proof of availability: an inactive Organization/Course or changed eligibility can make the public route unavailable.
- Public content reading does not enroll anyone. New learners still need an explicit Organization-entry policy, active Membership and separate free Enrollment. Studio Offering management **does not** silently open Customer Entry, create Membership, grant a role, or enroll students.

The Web is a thin authenticated adapter. No new database, migration, API, event or access policy is introduced. The applicable ADRs remain 0054, 0055 and 0057. Helper tests cover safe URL construction, visibility eligibility, release-scoped cursor accumulation, duplicate-page prevention and readable public link criteria.


## Organization customer entry policy

An organization administrator with `organization.manage` can open **«Вступление учеников · настройки организации»** in Studio. The new `/studio/:organizationId/entry-policy` route presents the **current policy** from `GET /v1/organizations/:org/customer-entry-policy` (strict `{policy:"closed"|"open"}`, `Cache-Control: no-store`). The GET runs an existing tenant/RLS transaction, requires an active actor and `organization.manage`, and does not expose Organization IDs or the policy to unaffiliated visitors. The read reuses the Organizations repository; it adds no migration, data copy or denormalized public authority.

Changes continue through the existing `PUT /v1/organizations/:org/customer-entry-policy` command, subject to `organization.manage`, tenant RLS and exact Origin checks. The UI requires a separate confirmation for opening **and** closing. A failed or ambiguous PUT disables further writes until the administrator explicitly reloads canonical state, avoiding incorrect visual claims about a possibly committed request. It never silently opens policy when publishing an Offering.

This is an **Organization-wide** opt-in for future self-entry; it does not create Memberships, grant roles, accept existing invitations, restore suspended/left memberships, create Enrollments or activate paid access. Closing self-entry does not revoke already-active Memberships. Public learning visibility remains Delivery-owned and independent. ADR-0047/0054/0055 apply.
