# ADR-0055: Self-only free learner entry and derived course progress

- Status: Accepted
- Date: 2026-10-06

## Decision

Learner Learning is a stateless authenticated composition boundary over public Organization, Content, Delivery and Progress application ports. It owns no tables. Anonymous curriculum reads remain ADR-0054. The existing API session cookie, exact-origin credentialed browser transport and explicit ADR-0047 Organization entry remain unchanged. Web registration/login returns only to an allowlisted local learning address; neither the return target nor a public response grants authority.

Membership and Enrollment remain separate explicit actions. Role-less active customer members may enroll themselves in an open/public/self-paced/membership Offering on an active Organization/Course with the exact published manifest release. This relationship-based command does not grant RBAC roles, reuse privileged enrollment.manage, weaken administrative enrollment creation, or bypass paid access. Browser input contains public slugs and an empty strict command only. The actor is always the authenticated principal.

Delivery's narrow read-only actor-bound route capability resolves only eligible public free Offering context, including before Membership exists, for authenticated active users. Its separate own-list capability returns only active/completed Enrollments with current active Membership and public free Offering gates. Internal UUIDs stay in server composition; the list has keyset pagination with an actor-bound Enrollment cursor. Ordinary tables retain tenant RLS. Both capabilities are revoked from PUBLIC, fixed-search-path SECURITY DEFINER reads granted only to platform_app; no bypass role or anonymous write capability is added.

After route resolution, the composition establishes transaction-local tenant context and revalidates through owner ports. Enrollment writes serialize current identity, Organization, Membership, Offering and Course gates with row locks in one READ COMMITTED transaction. Delivery inserts with the existing unique (offering,user) identity, returns an active/completed duplicate predictably and rejects withdrawn/cancelled lifecycle state. Only a newly inserted row emits canonical enrollment.created@1, atomically with the row. It creates no Membership, role or Entitlement. Existing terminal immutability and readiness-gated Enrollment completion are unchanged.

Authenticated state and list reads use one read-only REPEATABLE READ snapshot and no-store. They disclose only public presentation, the actor's Membership/Enrollment lifecycle hints and derived progress. Inactive membership exposes no progress; unknown/private/paid/closed/cohort/inactive curriculum fails closed. A closed customerEntryPolicy prevents new self-entry but does not revoke an already-active Membership's enrollment authority.

The versioned derived policy required-activity-passes@1 counts distinct required ActivityVersions referenced by the pinned Lesson blocks. Only validation-derived normalized Evidence with passed outcome for the exact own Enrollment/ActivityVersion counts. Manual Evidence, raw ValidationResult, advisory/review/system errors and work from another Enrollment/release/user do not count. Any historical passing Attempt remains passed after a later failed retry. This is task completion, not organization-wide Mastery or readiness. Shared references count once per course and once per Lesson. Informational Lessons do not fabricate task completion; a zero-task course has null percentage and is not automatically complete. Continue selects the first Lesson with outstanding required work (or the first informational Lesson when there are no required tasks), with last action derived from Attempt time.

No progress table, watched-video state, mutable completion flag, completion event or automatic Enrollment.completed transition is added. All required tasks passed is a UI statement only. Quiz execution remains Slice D; Studio and full real-session PostgreSQL learner browser verification/deployment remain E/F. Production grader stays disabled.

## Verification

PostgreSQL HTTP coverage proves session/Origin/self ownership, lifecycle gates, idempotency/concurrency/rollback, role-less entry without privilege escalation, pagination/tenant isolation, normalized Evidence attribution and unchanged terminal completion. Production browser verification covers auth return-to and explicit entry/enrollment/returning learner UX through non-canonical read/write projections alongside the existing real session/CORS boundary; this does not substitute for the Slice F canonical browser path.

## Amendment — 2026-11-01: one learner gesture for course start

The maintainer chose to remove the extra click between Organization entry and free Enrollment. Web may compose both commands behind one explicit "Начать курс" action when the learner has no Membership and the Organization's `customerEntryPolicy` is `open`. The adjacent copy names the Organization the learner joins.

The domain contract is unchanged: entry (ADR-0047) and self-enrollment remain separate server commands with their own authorization, transactions, idempotency and events. Web always sends entry first and enrollment second. If entry succeeds but enrollment fails, the refreshed state offers the existing separate enrollment action. No API combines the two commands, and registration still creates neither Membership nor Enrollment.

## Amendment — 2026-11-01: checking an answer starts the course

If a signed-in learner who is not yet enrolled checks a quiz answer, Web runs the same two commands as "Начать курс" (Organization entry, then free self-enrollment) and retries the same attempt key once. The quiz hint states that checking enrolls the learner in the free course. Closed self-entry still fails with an explanatory message. Anonymous learners see sign-up and sign-in actions that return to the same activity. Domain commands and authorization are unchanged.
