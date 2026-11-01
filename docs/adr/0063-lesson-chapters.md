# ADR-0063: Lesson chapters

- Status: Accepted
- Date: 2026-11-02

## Context

A course with 70 lessons was shown as one flat list on the course page and in the lesson sidebar. Learners could not see the shape of the program, and there was no structure for "where am I" beyond a lesson number.

## Decision

- Manifest v1 Lessons get an optional `chapter`: trimmed, 1–80 characters. It stays a manifest v1 field, because it is optional and old manifests remain valid.
- `learning_content.course_version_lessons.chapter` stores it. It is part of the published graph, so the existing draft-only trigger makes it immutable after publication. Import, export and draft cloning carry it.
- The public course projection includes `chapter` on a lesson summary only when it is set.
- Web groups **consecutive** lessons with the same chapter:
  - on the course page, each chapter is a section with a heading, lesson count and duration;
  - in the lesson sidebar, chapters are collapsed and only the current one is open.

  A course without chapters renders exactly as before, and numbering stays global.
- Studio's manual editor edits the chapter per lesson. The JSON path accepts it as part of the manifest.

## Consequences

- Chapters are presentation of the curriculum. They carry no progress, gating or completion semantics.
- Making non-consecutive lessons share a chapter name creates two groups. Authors order lessons by chapter.
