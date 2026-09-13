-- Foundation 1 database schema.
-- Domain ownership remains in API modules; this migration is the ordered physical
-- deployment unit for their first persistence models.

DO $$
BEGIN
  IF current_setting('server_version_num')::integer / 10000 <> 18 THEN
    RAISE EXCEPTION 'Foundation schema requires PostgreSQL 18.x';
  END IF;
END
$$;

CREATE SCHEMA identity;
CREATE SCHEMA organizations;
CREATE SCHEMA access_control;
CREATE SCHEMA events;

REVOKE ALL ON SCHEMA identity, organizations, access_control, events FROM PUBLIC;

CREATE OR REPLACE FUNCTION platform_internal.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
  SELECT nullif(current_setting('app.organization_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION platform_internal.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid
$$;

REVOKE ALL ON FUNCTION platform_internal.current_organization_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION platform_internal.current_user_id() FROM PUBLIC;
GRANT USAGE ON SCHEMA platform_internal TO platform_app, platform_worker;
GRANT EXECUTE ON FUNCTION platform_internal.current_organization_id() TO platform_app, platform_worker;
GRANT EXECUTE ON FUNCTION platform_internal.current_user_id() TO platform_app, platform_worker;

CREATE TABLE identity.users (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 320),
  display_name text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_normalized_key
  ON identity.users ((lower(btrim(email))));

CREATE TABLE organizations.organizations (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  slug text NOT NULL UNIQUE
    CHECK (
      char_length(slug) BETWEEN 2 AND 63
      AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'archived')),
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organizations.memberships (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'suspended', 'left')),
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id),
  CHECK ((status = 'active' AND joined_at IS NOT NULL) OR status <> 'active')
);

CREATE INDEX memberships_user_id_idx
  ON organizations.memberships (user_id, organization_id);

CREATE TABLE access_control.roles (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  key text NOT NULL UNIQUE
    CHECK (key ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  description text,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO access_control.roles (key, name, description)
VALUES
  ('organization_owner', 'Organization owner', 'Full organization ownership and delegation.'),
  ('organization_admin', 'Organization admin', 'Organization administration without ownership transfer.'),
  ('instructor', 'Instructor', 'Instructional delivery and learner oversight.'),
  ('mentor', 'Mentor', 'Learner mentoring and review capabilities.'),
  ('learner', 'Learner', 'Learning participation capabilities.');

CREATE TABLE access_control.role_assignments (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL REFERENCES access_control.roles(id) ON DELETE RESTRICT,
  scope_type text NOT NULL
    CHECK (scope_type IN ('organization', 'course', 'offering', 'group', 'team', 'project')),
  scope_id uuid NOT NULL,
  assigned_by_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, user_id)
    REFERENCES organizations.memberships(organization_id, user_id)
    ON DELETE CASCADE,
  UNIQUE (organization_id, user_id, role_id, scope_type, scope_id),
  CHECK (scope_type <> 'organization' OR scope_id = organization_id)
);

CREATE INDEX role_assignments_subject_idx
  ON access_control.role_assignments (organization_id, user_id);
CREATE INDEX role_assignments_scope_idx
  ON access_control.role_assignments (organization_id, scope_type, scope_id);

CREATE TABLE events.outbox (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid REFERENCES organizations.organizations(id) ON DELETE RESTRICT,
  event_name text NOT NULL
    CHECK (event_name ~ '^[a-z][a-z0-9_]*([.][a-z][a-z0-9_]*)+$'),
  event_version integer NOT NULL CHECK (event_version > 0),
  aggregate_type text NOT NULL CHECK (char_length(aggregate_type) BETWEEN 1 AND 100),
  aggregate_id uuid NOT NULL,
  actor_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id uuid,
  causation_id uuid,
  idempotency_key text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  available_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  publish_attempts integer NOT NULL DEFAULT 0 CHECK (publish_attempts >= 0),
  last_error text
);

CREATE INDEX outbox_pending_idx
  ON events.outbox (available_at, occurred_at, id)
  WHERE published_at IS NULL;

CREATE UNIQUE INDEX outbox_idempotency_key
  ON events.outbox (organization_id, idempotency_key) NULLS NOT DISTINCT
  WHERE idempotency_key IS NOT NULL;

GRANT USAGE ON SCHEMA identity, organizations, access_control, events TO platform_app;
GRANT SELECT, INSERT, UPDATE ON identity.users TO platform_app;
GRANT SELECT, INSERT, UPDATE ON organizations.organizations TO platform_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations.memberships TO platform_app;
GRANT SELECT ON access_control.roles TO platform_app;
GRANT SELECT, INSERT, DELETE ON access_control.role_assignments TO platform_app;
GRANT INSERT ON events.outbox TO platform_app;

GRANT USAGE ON SCHEMA events TO platform_worker;
GRANT SELECT, UPDATE ON events.outbox TO platform_worker;

ALTER TABLE organizations.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_control.role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE events.outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizations_app_tenant_policy
  ON organizations.organizations
  FOR ALL
  TO platform_app
  USING (id = platform_internal.current_organization_id())
  WITH CHECK (id = platform_internal.current_organization_id());

CREATE POLICY memberships_app_tenant_policy
  ON organizations.memberships
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY role_assignments_app_tenant_policy
  ON access_control.role_assignments
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY outbox_app_insert_policy
  ON events.outbox
  FOR INSERT
  TO platform_app
  WITH CHECK (
    organization_id = platform_internal.current_organization_id()
    OR (
      organization_id IS NULL
      AND platform_internal.current_organization_id() IS NULL
    )
  );

CREATE POLICY outbox_worker_select_policy
  ON events.outbox
  FOR SELECT
  TO platform_worker
  USING (true);

CREATE POLICY outbox_worker_update_policy
  ON events.outbox
  FOR UPDATE
  TO platform_worker
  USING (true)
  WITH CHECK (true);
