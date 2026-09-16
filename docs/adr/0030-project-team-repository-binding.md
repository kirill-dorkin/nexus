# ADR-0030: Project, Team, and trusted repository binding

- Status: Accepted
- Date: 2026-09-16

## Context

ADR-0028 established trusted GitHub installation/repository mappings and ADR-0029 established durable Integration-owned lifecycle processing. F6 can now introduce Nexus Project state without treating GitHub external identities or webhook facts as Project aggregates.

The Projects module must remain independent from Git hosting details. It needs a minimal Team and Project model, plus an explicit relationship to one trusted repository mapping, before later PR/check/review facts can be attributed to Project state.

## Decision

### 1. Projects owns internal Project and Team identities

`Projects` owns `Project`, `Team`, `TeamMembership`, and repository-binding history. These use Nexus UUID identities. GitHub installation, repository, organization, user, team, pull-request, and check identifiers remain external Integration identities and are never reused as Project or Team ids.

A Team is a project collaboration concept. It is not a Learning Delivery `Group`, does not require an Enrollment, and creating Team membership never creates or changes Delivery Group membership.

### 2. Team membership requires active Organization membership

A Team belongs to exactly one Organization. Its members are Organization users with active memberships at the time they are added. Team membership is persisted independently and may later support Project-specific learner access policy.

The first vertical deliberately does not expose learner/mentor Project reads. Organization-wide Project operations are limited to organization owners, organization admins, and instructors. Existing exact `team` and `project` role-assignment scopes may also authorize those operator roles.

### 3. Projects depends on a public Integrations repository-reference query

Projects application code never queries `integrations.*` tables or repositories directly. `Integrations` exports a narrow application query that resolves an exact repository mapping inside the current tenant transaction and returns only:

- internal repository-mapping reference id;
- external GitHub repository id;
- repository full name;
- current availability: `active`, `suspended`, or `removed`.

This query composes repository and installation lifecycle state inside the owning Integrations module.

### 4. Repository binding is one-to-one while active

A Project may have at most one active repository binding. A trusted repository mapping may belong to at most one active Project binding.

This one-to-one active relationship is required so a later trusted GitHub delivery can resolve to at most one Project without ambiguous fan-out.

Connecting the exact same active repository mapping to the same Project is idempotent and returns the existing binding. Competing or conflicting bindings fail rather than silently moving repository ownership between Projects.

### 5. Connect requires current trusted availability

A new binding may be created only when the Integrations public query reports the repository mapping as currently `active` for the same Organization.

PostgreSQL independently defends this invariant with a binding trigger that checks the referenced repository and installation are active and tenant-consistent. This database integrity check does not authorize Projects application code to query Integration tables; it is defense in depth at the persistence boundary.

### 6. Integration lifecycle does not rewrite Project history

After a binding exists, later GitHub suspension, repository removal, or installation removal does not delete or silently disconnect the Project binding. Project reads compose the binding with current Integrations availability, so the same stable binding may report `suspended` or `removed`.

This preserves historical Project identity while making current external availability explicit.

A local disconnect is non-destructive: it closes the active binding with actor and timestamp metadata. Project, Team, prior binding history, and Integration mappings remain intact. Repeating disconnect is idempotent.

### 7. No Project event or learning consequence yet

This slice introduces no PR/check/review Project facts, LearningEvent, Evidence, Mastery mutation, grading policy, or instructor analytics.

No new outbox event is defined because there is not yet a concrete asynchronous consumer contract for Project creation/binding changes. A later slice that materializes normalized GitHub Project facts must define its Integrations -> Projects delivery contract explicitly and may then introduce the necessary durable processor/outbox semantics.

## Consequences

- Projects can safely own stable collaboration state without becoming a GitHub adapter.
- Team and Delivery Group remain distinct concepts with independent membership models.
- Repository-backed Projects have unambiguous active repository ownership.
- Cross-tenant, suspended, and removed mappings cannot be newly connected.
- Existing Projects survive external repository lifecycle changes and expose current availability without falsifying binding history.
- The next F6 slice can normalize PR/check/review inputs into Projects-owned facts through an explicit Integrations boundary before any learning Evidence policy is introduced.
