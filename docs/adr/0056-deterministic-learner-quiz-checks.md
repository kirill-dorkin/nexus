# ADR-0056: Deterministic learner-owned quiz checks

- Status: Accepted
- Date: 2026-10-06

## Decision

Validation registers quiz.single_choice@1, quiz.multiple_choice@1 and quiz.short_text@1 as trusted deterministic_quiz definitions. This authority is distinct from authorized_user manual results and system grader execution. Neither administrative result recording nor grader dispatch can impersonate these definitions. Exact immutable ActivityVersion binds type/key/version and its separate Content-owned protected definition. Private answers and author explanation are never copied into ValidationResult config/payload, Evidence, HTTP feedback or browser state.

Single-choice uses exact option identity. Multi-choice requires exact set equality, rejects duplicate/unknown selections and gives no partial credit. Short text implements the already published ADR-0053 rule: NFC, trim, then locale-independent toLowerCase when caseSensitive=false. No fuzzy/LLM matching or code execution is introduced. Unsupported versions fail closed. Each decisive result scores 0 or 1.

Learner Learning exposes an exact-origin, principal-owned check command addressed by public Organization/Offering/Activity slugs. It revalidates and locks active identity, Organization, Membership, current public/open/self-paced/membership Offering, active published manifest Course and own active Enrollment. The Activity must occur in the exact pinned Lesson structure. It consumes public application ports; no foreign repository/table access is introduced. Role-less active customer members need this narrow relationship authority, never RBAC role grants or validation.record. Existing privileged/manual and grader paths remain unchanged.

The strict command contains only a UUID attemptKey and typed answer. A key identifies one immutable Attempt/Submission pair; it is a retry locator, never authority. Progress serializes the key, asserts own Enrollment/ActivityVersion and appends separate canonical Attempt and Submission rows plus their existing LearningEvents/outbox events atomically. Same-key replay must match the immutable answer; a changed answer requires a new key/new normal Attempt. Multi-select order is canonicalized as a set before submission. Keys cannot cross learner, Enrollment, ActivityVersion or tenant boundaries.

The orchestration commits learner work first, then commits the server-computed ValidationResult and its canonical event in a separate transaction after rechecking current access. Validation checks exact own Submission attribution before evaluating. A stable server-owned quiz-check@1 result key prevents duplicate results for this Submission. After raw commit, the existing TrustedValidationEvidenceSink normalizes in a third tenant transaction as ADR-0021 requires. A result/Evidence operational failure returns an error and same-key replay repairs the incomplete stage without resetting learner work, fabricating a failed answer, or double-counting Evidence/Mastery. Each stage's business rows, journal and outbox remain atomic.

Feedback is an explicit allowlist of attempt number, passed/failed, score and fixed safe learner guidance. Private author explanation remains protected under the current manifest contract. The UI retains the pending key/answer in component memory for ambiguous network retries and freezes the answer until that try resolves; explicit retry starts a fresh key. No outcome/key/config authority comes from Web. Progress refresh uses authenticated canonical reads and all-task completion still never completes Enrollment automatically.

No migration, new table, SQL capability, runtime grant, canonical event name, Mastery algorithm, readiness policy, Completion lifecycle or production grader activation is introduced. Studio and canonical browser/deployment verification remain E/F.
