-- Learner feedback reports for the open beta (ADR-0083). Additive: a new
-- schema and table; the running release never reads them.
-- Stores no IP address, user agent, cookies, screenshots, answers or URLs:
-- page context is a route template plus course and lesson slugs set by the API.

CREATE SCHEMA feedback;
REVOKE ALL ON SCHEMA feedback FROM PUBLIC;
GRANT USAGE ON SCHEMA feedback TO platform_app;

CREATE TABLE feedback.reports (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('problem', 'unclear', 'idea')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 4000),
  expected text CHECK (char_length(expected) BETWEEN 1 AND 2000),
  actual text CHECK (char_length(actual) BETWEEN 1 AND 2000),
  page_route text NOT NULL CHECK (
    char_length(page_route) BETWEEN 1 AND 100
    AND page_route ~ '^(/[a-z0-9/\[\]-]*|other)$'
  ),
  course_slug text CHECK (
    char_length(course_slug) BETWEEN 2 AND 63
    AND course_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  lesson_slug text CHECK (
    char_length(lesson_slug) BETWEEN 2 AND 63
    AND lesson_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  release text NOT NULL CHECK (release ~ '^[A-Za-z0-9._-]{1,40}$'),
  device text CHECK (device IN ('mobile', 'desktop')),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'accepted', 'duplicate', 'rejected', 'done')),
  owner_note text CHECK (char_length(owner_note) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind = 'problem' OR (expected IS NULL AND actual IS NULL))
);

CREATE INDEX reports_organization_newest
  ON feedback.reports (organization_id, id DESC);

ALTER TABLE feedback.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY reports_tenant_read ON feedback.reports
  FOR SELECT TO platform_app
  USING (organization_id = platform_internal.current_organization_id());

-- A user id may be written only for the user of the transaction.
CREATE POLICY reports_tenant_insert ON feedback.reports
  FOR INSERT TO platform_app
  WITH CHECK (
    organization_id = platform_internal.current_organization_id()
    AND (user_id IS NULL OR user_id = platform_internal.current_user_id())
  );

CREATE POLICY reports_tenant_update ON feedback.reports
  FOR UPDATE TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

GRANT SELECT, INSERT ON feedback.reports TO platform_app;
GRANT UPDATE (status, owner_note, updated_at) ON feedback.reports TO platform_app;

-- Anonymous reports need the Organization id of a public page.
GRANT EXECUTE ON FUNCTION organizations.resolve_active_public_organization_id(text)
  TO platform_app;
