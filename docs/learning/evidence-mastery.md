# Learning Evidence & Mastery

## Principle

Events are history; evidence is normalized history; mastery is a recomputable projection.

```text
Action -> LearningEvent -> LearningEvidence -> MasteryModelVersion -> StudentSkillState
```

## Evidence minimum

- skillId;
- sourceType/sourceId;
- activityVersionId/attemptId where applicable;
- outcome;
- difficulty;
- independence/assistance;
- transfer level;
- reliability/evidence strength;
- occurredAt.

## Never infer strong mastery from

- page/video completion;
- raw time-on-page;
- number of commits/LOC;
- solution reveal;
- one repeated easy task.

## State

`unknown -> introduced -> practicing -> proficient -> retained`, with `needs_review` as a derived review state.

`proficient` should require not only a score threshold, but sufficient confidence, independent successes, distinct activities/context variation, and no blocking confirmed misconception. `retained` requires delayed evidence.

## Separate dimensions

Store separately:

- mastery estimate;
- confidence/evidence mass;
- retention risk;
- review due date.

Do not reduce historical mastery merely because time passed without a new observation.

## Guided Build

Brief -> Plan -> Independent Attempt -> Checkpoint -> Automated Feedback -> Hint ladder -> Retry -> Professional walkthrough -> Compare -> Transfer challenge.

Solution exposure is recorded and weakens independence evidence. Transfer challenge is the mechanism to re-establish independent evidence.
