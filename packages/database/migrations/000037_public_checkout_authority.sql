-- F9.6 public checkout initiation authority.
-- Public route identity may resolve a tenant UUID only for the authenticated User's
-- currently active Organization membership. The broader public catalog remains
-- presentation-only and receives no tenant-id capability.

CREATE OR REPLACE FUNCTION organizations.resolve_checkout_organization(
  p_organization_slug text
)
RETURNS TABLE (
  organization_id uuid,
  slug text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT organization.id, organization.slug
    FROM organizations.organizations AS organization
    JOIN organizations.memberships AS membership
      ON membership.organization_id = organization.id
   WHERE organization.slug = p_organization_slug
     AND organization.status = 'active'
     AND membership.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
     AND membership.status = 'active'
   LIMIT 1
$$;

REVOKE ALL ON FUNCTION organizations.resolve_checkout_organization(text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION organizations.resolve_checkout_organization(text)
  TO platform_app;
