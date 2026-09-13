# Architecture Overview

## Shape

```text
Browser
  |
  v
Next.js Web
  |
  v
NestJS API (modular monolith)
  |---- PostgreSQL 18 (transactional source of truth)
  |---- Redis/BullMQ (jobs; behind a port)
  |---- S3-compatible object storage
  |---- transactional outbox/inbox
  |
  +--> Worker pool
  |      |-- mastery/recommendations/projections
  |      |-- GitHub processing
  |      |-- notifications/assets
  |
  +--> Grader Gateway
           |
           v
       HOSTILE sandbox pool
```

## Core learning flow

```text
Student action
  -> canonical LearningEvent
  -> Evidence normalization
  -> immutable LearningEvidence
  -> versioned Mastery Engine
  -> StudentSkillState projection
  -> Recommendation / Review / Gate / Intervention
```

## Content vs delivery

```text
ProgramVersion -> exact CourseVersion -> exact Lesson/Activity versions

LearningOffering
  -> CourseRun
  -> Enrollment/participants
  -> optional GroupSets/Groups
  -> Sessions/Assignments
```

Ни `CourseVersion`, ни `Skill`, ни `ActivityVersion` не должны знать, как именно проходит обучение.

## Why modular monolith

Bounded context — ownership boundary, а не deployment boundary. Сначала один API deployable с дисциплинированными модулями; выделять сервис только из-за независимого scaling, security boundary или отдельной команды. Grader — исключение с первого дня из-за другого threat model.

## Data classes

Не смешивать:

- business records;
- learning events/evidence;
- audit events;
- product analytics;
- operational telemetry.

## Inter-process reliability

Состояние домена и `OutboxEvent` фиксируются одной PostgreSQL transaction. Worker читает outbox и идемпотентно публикует последствия в job queue. External webhooks сначала попадают в durable inbox и дедуплицируются.
