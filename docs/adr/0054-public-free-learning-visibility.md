# ADR-0054: Explicit public free learning visibility and safe published reads

- Status: Accepted
- Date: 2026-10-06

## Decision

Delivery owns `LearningOffering.visibility = private | public`. Existing and new Offerings default to private. Creation cannot opt in through an incidental extra field; a separate authenticated, tenant-authorized `offering.manage` command changes visibility under the existing exact browser Origin boundary. Visibility changes and `learning_offering.visibility_changed@1` commit atomically. Repeating the same current intent succeeds without another event. Visibility is public curriculum presentation, not Membership, Enrollment, Entitlement or a promise of self-entry. Commerce Product sellability remains the separate ADR-0046 paid boundary; this flag does not change that existing contract.

The v1 public free learning gate is an active Organization, an explicitly public/open/self-paced/membership Offering, and its exact published manifest-managed CourseVersion on an active Course. Legacy releases without Lessons are not fabricated into learning courses. An Offering pins its release; creating or publishing another draft does not silently retarget it. Closing/hiding an Offering, suspending its Organization or archiving its Course removes public reads on the next request.

The stable visitor address is Organization slug + Offering slug + optional Lesson slug. Public Learning is a stateless composition module using Organization, Delivery and Content public application query ports, in a single read-only REPEATABLE READ transaction. It owns no canonical tables and queries no other module's tables. One transaction observes one coherent snapshot; a concurrent withdrawal takes effect for subsequent requests, not an already started consistent read. HTTP and Next server reads use no-store; public content is deliberately disclosed once opted in and cannot be recalled from an already downloaded copy.

Anonymous RLS bypass follows ADR-0046: schema-owned STABLE read-only SECURITY DEFINER functions, fully qualified relations, `search_path=pg_catalog`, revoked from PUBLIC, explicit minimal platform_app grants. Delivery exposes only eligible public addresses/presentation. Private helpers resolve active Organization slugs and gated CourseVersion identity, are not executable by platform_app, and cannot be used as arbitrary tenant/version resolvers. Content calls the private Delivery gate by public address before reading its own exact published snapshots. No broad public table policy, anonymous write capability, new role or worker privilege is introduced. The normal tenant runtime gains UPDATE on the visibility column only; ADR-0012/000012 column restrictions and immutable Offering identity remain intact.

Content's public lesson function builds an explicit allowlist: canonical YouTube ID, inert Markdown, and referenced quiz slug/type/title/instructions/question plus option IDs/text. It never selects protected quiz_validation_configs, raw Activity.config, bindings, author metadata or UUIDs. Strict public contracts reject accidental expansion. Raw Activity config is not a public contract, even when a future caller claims it is safe.

Discovery is deterministic and bounded to 100 eligible Delivery addresses per request, sorted by Organization/Offering slug; Content filters unsupported/archived releases. This is the small first-launch directory, not an exhaustive arbitrary-scale catalog. Pagination and batched summary query optimization require a later measured need. Detailed blocks are loaded only for the selected Lesson, not sent with directory/course summaries.

Web uses server-rendered `/`, `/courses`, `/learn/:organizationSlug/:offeringSlug`, and `/learn/:organizationSlug/:offeringSlug/:lessonSlug`. The renderer constructs YouTube embeds only on the fixed youtube-nocookie host with the canonical ID. react-markdown is pinned; raw HTML is skipped, plugins/raw HTML parsing and images are absent, and link URLs permit only explicit HTTP(S)/mailto without credentials. No dangerouslySetInnerHTML or author-controlled iframe attributes are used. Long code is contained and scrollable, navigation has visible focus, and a skip link targets the main landmark.

## Verification and follow-up

Real PostgreSQL HTTP tests prove default privacy, lifecycle/tenant fail-closed behavior, safe quiz shapes, no protected disclosure, draft isolation, RLS, restricted function grants, idempotent visibility changes and transactional rollback. The production-build Chrome gate uses non-canonical public read fixtures for page/mobile/keyboard/navigation/XSS/empty/404 behavior; it does not claim Enrollment or progress persistence. Canonical public reads are covered by the separate real-database tests.

This slice is public reading. Authentication return-to, self-only free Enrollment, progress and executable quiz checks remain subsequent slices C/D. Practice is displayed as a reading prompt without a fake check or fabricated result. Studio and the complete real-session learner/database browser path remain E/F. Production grader execution remains disabled.
