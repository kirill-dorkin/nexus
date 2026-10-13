# ADR-0020: Validator registry and immutable ValidationResult

- Status: Accepted
- Date: 2026-09-15

## Context

F4 has a durable Attempt/Submission lifecycle and append-only Evidence, but the validation step between immutable learner work and normalized Evidence is not yet modeled. ADR-0018 deliberately left validator/grader policy for a later slice, while ADR-0007 requires untrusted learner code to execute outside the API/worker production trust boundary.

A validator must be attributable and reproducible. Published `ActivityVersion` already owns an immutable `config` snapshot, and the domain glossary defines an `ActivityVersion` as the concrete activity version together with its validators/policies. A mutable validator configuration detached from that snapshot could change the meaning of historical submissions after publication.

Raw validator output is also not LearningEvidence. Infrastructure failure must never be interpreted as learner failure, and only explicitly trusted result sources may become inputs to later Evidence normalization.

## Decision

### 1. Validation is a separate application boundary

Introduce a `learning-validation` module. It owns validator registry semantics and persisted `learning_validation.validation_results` state.

The module does not read Learning Progress or Learning Content repositories/tables directly. It obtains Submission/Attempt context and ActivityVersion snapshots through public application query interfaces. Database foreign keys and integrity triggers may enforce cross-schema referential invariants, as PostgreSQL remains the canonical business-state integrity layer.

### 2. Validator bindings are pinned by immutable ActivityVersion configuration

The conventional ActivityVersion configuration namespace is:

```json
{
  "validation": {
    "validatorKey": "manual-review",
    "validatorVersion": 1,
    "config": {}
  }
}
```

`validatorKey`, `validatorVersion`, and validator-specific `config` together define the binding. The generic Activity config remains extensible; activities without this namespace remain valid and simply have no configured validation path.

Published ActivityVersion immutability therefore pins the validator binding without creating a second mutable source of curriculum meaning.

### 3. Validator identity/version is code-registered and versioned

The application keeps a code-backed registry of supported validator definitions. A definition has a stable key and positive integer version plus application-owned metadata such as recording authority and Evidence trust.

A validator implementation or protocol must not change meaning incompatibly under the same `(key, version)`. Breaking semantic/protocol changes require a new version. Versions referenced by published ActivityVersions must remain supported for as long as those historical snapshots can be validated or revalidated.

The first registered definition is `manual-review@1`, recorded by an authorized organization user. This proves the result boundary without executing learner code. Future grader-backed definitions may use system/service recording authority, but grader execution and service authentication are not introduced by this slice.

### 4. ValidationResult is append-only and attributable

Each ValidationResult pins at least:

- tenant organization;
- exact immutable `Submission`;
- exact `ActivityVersion` used by the Submission's Attempt;
- validator key and version;
- the validator-specific config snapshot from that ActivityVersion;
- caller-supplied idempotency key for one validation execution/result publication;
- result status and learner outcome, when one exists;
- optional normalized score and raw result payload;
- registry-derived Evidence trust;
- recording actor when the result is user-recorded;
- recorded timestamp.

ValidationResult rows are never updated or deleted by the runtime application role. Revalidation creates another result with a new idempotency key.

### 5. Idempotency is scoped to exact validation identity

For one organization, the tuple

`(submissionId, validatorKey, validatorVersion, idempotencyKey)`

identifies one result publication. Retrying the same command returns the already-recorded result and must not append another lifecycle event. Reusing the same key with a materially different result is rejected as a conflict.

This is the F4 application-level idempotency boundary. Queue/grader inbox mechanics remain governed by ADR-0006 and can be added when asynchronous execution exists.

### 6. System failure is not learner failure

A result has one of two statuses:

- `completed`: it carries a learner outcome (`passed`, `failed`, or `needs_review`) and may carry a score;
- `system_error`: it carries no learner outcome and no score.

The database enforces this distinction. A grader/sandbox/infrastructure failure therefore cannot be persisted as a negative learner outcome by accident.

### 7. Evidence trust is registry-owned, not caller-owned

Each registered validator version declares whether its completed result is `trusted` or `advisory` for future Evidence normalization. The caller cannot submit or override this value; it is copied from the exact registry definition into the immutable ValidationResult.

This slice does not generate Evidence. A later slice will define the normalization policy and may consume only suitable completed trusted results.

### 8. Authorization is capability-based and offering-scoped

User-recorded validation requires `validation.record` on the parent LearningOffering. Organization owners, organization admins, and instructors receive this capability; learners and mentors do not.

The user-facing recording endpoint only accepts validator definitions whose registry recording authority is `authorized_user`. It cannot be used to impersonate a future system/grader validator.

### 9. Canonical event

Creating a new result appends `validation.result_recorded` version 1 to the transactional outbox in the same transaction. The event includes stable attribution fields and status/trust metadata, not arbitrary raw result payload.

An idempotent replay that returns an existing result does not emit a duplicate event.

## Consequences

- Historical validation is reproducible against the exact Submission, ActivityVersion, validator version, and config snapshot.
- Raw validator/grader output remains distinct from normalized Evidence and Mastery.
- The API does not execute learner code and does not pull F7 sandbox hardening into F4.
- The future Grader Gateway can integrate through an explicit application/protocol boundary rather than receiving production database credentials.
- Course authoring can remain generic while validation-aware activities opt into a conventional immutable config namespace.
- Validator availability/authoring UX and publish-time registry validation may be hardened later without changing the historical result model.

## Out of scope

- executing learner code or starting sandbox jobs;
- worker/queue processors and grader service authentication;
- automated Evidence production from ValidationResult;
- changing Mastery projection semantics;
- retry/lateness policy or strict Assignment-to-Attempt association;
- a learner-facing validation history/read model;
- dynamic tenant-defined executable validator code.
