-- F9.7 public checkout web-flow presentation support.
--
-- ADR-0047 requires the public Organization projection to expose the current
-- customer-entry policy as a presentation hint. Keep the F9.3 public catalog
-- functions unchanged and add one narrow capability so rolling callers remain
-- compatible while the Product detail projection gains the hint.

CREATE OR REPLACE FUNCTION organizations.find_public_customer_entry_policy_by_slug(
  requested_slug text
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT organization.customer_entry_policy
    FROM organizations.organizations AS organization
   WHERE organization.id = organizations.resolve_active_public_organization_id(
           requested_slug
         )
$$;

REVOKE ALL ON FUNCTION organizations.find_public_customer_entry_policy_by_slug(text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION organizations.find_public_customer_entry_policy_by_slug(text)
  TO platform_app;
