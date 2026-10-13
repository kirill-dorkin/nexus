# ADR-0010: LearningOffering is required for every Enrollment

- Status: Accepted

## Context

Two enrollment paths — direct self-paced enrollment into `CourseVersion` and instructor-led enrollment through an offering — create parallel authorization, progress, assignment and policy models.

## Decision

Every `Enrollment` belongs to exactly one `LearningOffering`. An offering can target a program/course version and can be extremely lightweight. Self-paced is represented by an offering whose effective capabilities disable grouping, attendance/live sessions and teacher pacing while enabling learner pacing as needed.

`CourseRun` is created when a delivered course needs its own execution lifecycle; it is not required merely to make self-paced enrollment possible.

## Consequences

- one enrollment context for all delivery modes;
- capabilities/policies, not separate applications, distinguish self-paced/instructor-led/hybrid;
- authorization and analytics always have an offering context;
- grouping remains optional;
- migrations/imports must create a valid offering rather than bypass delivery context.
