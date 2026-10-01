-- F9.4 Visitor/customer Organization membership entry boundary.
--
-- Public sellability does not imply Organization membership authority. Each
-- Organization explicitly opts into authenticated customer self-entry, and the
-- actual entry decision is revalidated atomically inside this schema-owned
-- SECURITY DEFINER capability rather than trusting prior public read state.

ALTER TABLE organizations.organizations
  ADD COLUMN customer_entry_policy text NOT NULL DEFAULT 'closed'
    CHECK (customer_entry_policy IN ('closed', 'open'));

CREATE FUNCTION organizations.join_open_customer_organization(
  requested_slug text
)
RETURNS TABLE (
  outcome text,
  membership_id uuid,
  organization_id uuid,
  user_id uuid,
  membership_status text,
  joined_at timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  resolved_organization_id uuid;
  requested_user_id uuid;
  existing_membership_status text;
BEGIN
  requested_user_id := NULLIF(current_setting('app.user_id', true), '')::uuid;

  IF requested_user_id IS NULL THEN
    RETURN QUERY
      SELECT 'unavailable'::text,
             NULL::uuid,
             NULL::uuid,
             NULL::uuid,
             NULL::text,
             NULL::timestamptz;
    RETURN;
  END IF;

  -- SHARE serializes the entry decision with Organization updates such as
  -- closing customer entry while still allowing concurrent readers.
  SELECT organization.id
    INTO resolved_organization_id
    FROM organizations.organizations AS organization
   WHERE organization.slug = requested_slug
     AND organization.status = 'active'
     AND organization.customer_entry_policy = 'open'
   FOR SHARE OF organization;

  IF resolved_organization_id IS NULL THEN
    RETURN QUERY
      SELECT 'unavailable'::text,
             NULL::uuid,
             NULL::uuid,
             NULL::uuid,
             NULL::text,
             NULL::timestamptz;
    RETURN;
  END IF;

  -- Authentication owns the session, but the persistence boundary also fails
  -- closed if a stale/suspended/deleted User reaches this capability.
  PERFORM 1
     FROM identity.users AS identity_user
    WHERE identity_user.id = requested_user_id
      AND identity_user.status = 'active';

  IF NOT FOUND THEN
    RETURN QUERY
      SELECT 'unavailable'::text,
             NULL::uuid,
             NULL::uuid,
             NULL::uuid,
             NULL::text,
             NULL::timestamptz;
    RETURN;
  END IF;

  SELECT membership.status
    INTO existing_membership_status
    FROM organizations.memberships AS membership
   WHERE membership.organization_id = resolved_organization_id
     AND membership.user_id = requested_user_id
   FOR UPDATE OF membership;

  IF FOUND THEN
    IF existing_membership_status = 'active' THEN
      RETURN QUERY
        SELECT 'active'::text,
               membership.id,
               membership.organization_id,
               membership.user_id,
               membership.status,
               membership.joined_at
          FROM organizations.memberships AS membership
         WHERE membership.organization_id = resolved_organization_id
           AND membership.user_id = requested_user_id;
    ELSE
      -- Invitation acceptance, suspension recovery, and re-entry after leaving
      -- remain explicit lifecycle operations; public self-entry cannot bypass
      -- any of them.
      RETURN QUERY
        SELECT 'blocked'::text,
               NULL::uuid,
               resolved_organization_id,
               requested_user_id,
               existing_membership_status,
               NULL::timestamptz;
    END IF;
    RETURN;
  END IF;

  INSERT INTO organizations.memberships (
    organization_id,
    user_id,
    status,
    joined_at
  )
  VALUES (
    resolved_organization_id,
    requested_user_id,
    'active',
    now()
  )
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  -- ON CONFLICT makes concurrent retries linearize on the unique membership.
  -- Only an active Membership is an idempotent success; another lifecycle state
  -- wins the race and fails closed.
  RETURN QUERY
    SELECT CASE
             WHEN membership.status = 'active' THEN 'active'::text
             ELSE 'blocked'::text
           END,
           CASE WHEN membership.status = 'active' THEN membership.id ELSE NULL::uuid END,
           membership.organization_id,
           membership.user_id,
           membership.status,
           CASE WHEN membership.status = 'active' THEN membership.joined_at ELSE NULL::timestamptz END
      FROM organizations.memberships AS membership
     WHERE membership.organization_id = resolved_organization_id
       AND membership.user_id = requested_user_id;
END
$$;

REVOKE ALL ON FUNCTION organizations.join_open_customer_organization(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION organizations.join_open_customer_organization(text) TO platform_app;
