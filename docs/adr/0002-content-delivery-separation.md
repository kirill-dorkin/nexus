# ADR-0002: Content is independent from delivery

- Status: Accepted

## Decision

Published curriculum versions describe what is learned. Offering/Run/Enrollment/Group/Session/Assignment describe how learning is delivered. Self-paced and instructor-led are policy/capability configurations of the same learning core.

## Consequences

One CourseVersion can be reused across delivery models without duplication or `if mode === ...` business logic.
