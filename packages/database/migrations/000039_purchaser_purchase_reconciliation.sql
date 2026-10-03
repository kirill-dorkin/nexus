-- F9.8 purchaser-owned Purchase reconciliation boundary.
--
-- A browser return route has only the opaque Purchase id. It must not receive or
-- manufacture an Organization id merely to read canonical Commerce state. This
-- narrow capability resolves tenant context only when the authenticated User is
-- the canonical purchaser of the exact Purchase.

CREATE FUNCTION commerce.resolve_owned_purchase_organization(
  p_purchase_id uuid
)
RETURNS TABLE (
  organization_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT purchase.organization_id
    FROM commerce.purchases AS purchase
    JOIN identity.users AS identity_user
      ON identity_user.id = purchase.purchaser_user_id
   WHERE purchase.id = p_purchase_id
     AND purchase.purchaser_user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
     AND identity_user.status = 'active'
   LIMIT 1
$$;

REVOKE ALL ON FUNCTION commerce.resolve_owned_purchase_organization(uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION commerce.resolve_owned_purchase_organization(uuid)
  TO platform_app;
