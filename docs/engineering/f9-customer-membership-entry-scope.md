# F9.4 scope: visitor/customer Organization entry

F9.4 is the smallest coherent bridge between the already-existing authentication
vertical and the already-existing authenticated Purchase checkout vertical.

Included:

- explicit Organization-owned `closed | open` customer entry policy;
- authorized tenant command to change that policy;
- public catalog presentation hint for the policy;
- authenticated self-entry by Organization slug;
- atomic, retry-safe active Membership creation without role grants;
- preservation of invited/suspended/left lifecycle states;
- contract, HTTP integration, RLS/capability, and concurrency-oriented verification;
- ADR/current-state/roadmap/module-boundary updates.

Not included:

- a second registration/login implementation;
- automatic Organization membership inferred from a sellable Product;
- combined join-and-checkout mutations;
- public checkout UI or return pages;
- automatic learner role assignment;
- Purchase, Entitlement, or Enrollment creation during membership entry;
- invitation email delivery or email verification/recovery;
- distributed registration/login rate limiting;
- refunds, subscriptions, tax, discounts, or marketing CMS;
- F7 production grader activation.

The next commercial command continues to revalidate current server-side Membership and
commercial state; a public catalog response is never checkout authority.
