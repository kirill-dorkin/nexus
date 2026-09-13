# ADR-0005: Events and evidence are immutable; mastery is a versioned projection

- Status: Accepted

## Decision

Canonical LearningEvents and normalized LearningEvidence are append-only. StudentSkillState is derived and tagged with MasteryModelVersion/source watermark.

## Consequences

Mastery algorithms can be replaced/replayed without losing learning history. Product analytics and operational telemetry cannot be treated as mastery evidence.
