-- Commerce access-right foundation.
-- Purchase, Entitlement, and Enrollment deliberately remain separate lifecycles.

CREATE SCHEMA commerce;

REVOKE ALL ON SCHEMA commerce FROM PUBLIC;
GRANT USAGE ON SCHEMA commerce TO platform_app;

ALTER TABLE learning_delivery.learning_offerings
  ADD COLUMN access_mode text NOT NULL DEFAULT 'membership'
    CHECK (access_mode IN ('membership', 'entitlement_required'));

CREATE TABLE commerce.entitlements (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  offering_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  granted_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  revoked_by_user_id uuid REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, offering_id)
    REFERENCES learning_delivery.learning_offerings(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, user_id)
    REFERENCES organizations.memberships(organization_id, user_id)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, offering_id, user_id),
  UNIQUE (organization_id, id),
  CHECK (expires_at IS NULL OR expires_at > granted_at),
  CHECK (
    (status = 'active' AND revoked_at IS NULL AND revoked_by_user_id IS NULL)
    OR
    (status = 'revoked' AND revoked_at IS NOT NULL AND revoked_by_user_id IS NOT NULL)
  )
);

CREATE INDEX entitlements_user_idx
  ON commerce.entitlements (organization_id, user_id, offering_id);
CREATE INDEX entitlements_offering_idx
  ON commerce.entitlements (organization_id, offering_id, status, user_id);

GRANT SELECT, INSERT, UPDATE ON commerce.entitlements TO platform_app;

ALTER TABLE commerce.entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY entitlements_app_tenant_policy
  ON commerce.entitlements
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
