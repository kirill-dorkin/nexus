-- F9.3 Public sellable catalog read boundary.
--
-- Public reads deliberately bypass tenant RLS only through narrowly scoped,
-- read-only SECURITY DEFINER functions. Each schema exposes only fields owned by
-- that module. Cross-module composition remains in the API application layer.

CREATE OR REPLACE FUNCTION organizations.find_public_organization_by_slug(
  requested_slug text
)
RETURNS TABLE (
  id uuid,
  slug text,
  name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT organization.id,
         organization.slug,
         organization.name
    FROM organizations.organizations AS organization
   WHERE organization.slug = requested_slug
     AND organization.status = 'active'
$$;

REVOKE ALL ON FUNCTION organizations.find_public_organization_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION organizations.find_public_organization_by_slug(text) TO platform_app;

CREATE OR REPLACE FUNCTION commerce.list_public_catalog_offer_rows(
  requested_organization_slug text,
  requested_product_slug text DEFAULT NULL
)
RETURNS TABLE (
  product_id uuid,
  offering_id uuid,
  product_slug text,
  product_name text,
  price_id uuid,
  amount_minor integer,
  currency text,
  billing_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT product.id,
         product.offering_id,
         product.slug,
         product.name,
         price.id,
         price.amount_minor,
         price.currency,
         price.billing_type
    FROM organizations.find_public_organization_by_slug(
           requested_organization_slug
         ) AS public_organization
    JOIN commerce.products AS product
      ON product.organization_id = public_organization.id
     AND product.status = 'active'
    JOIN commerce.prices AS price
      ON price.organization_id = product.organization_id
     AND price.product_id = product.id
     AND price.status = 'active'
   WHERE requested_product_slug IS NULL
      OR product.slug = requested_product_slug
   ORDER BY product.slug, price.currency, price.billing_type, price.id
$$;

REVOKE ALL ON FUNCTION commerce.list_public_catalog_offer_rows(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION commerce.list_public_catalog_offer_rows(text, text) TO platform_app;

CREATE OR REPLACE FUNCTION learning_delivery.list_public_sellable_offerings(
  requested_organization_slug text,
  requested_offering_ids uuid[]
)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  delivery_mode text,
  starts_at timestamptz,
  ends_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT offering.id,
         offering.slug,
         offering.name,
         offering.delivery_mode,
         offering.starts_at,
         offering.ends_at
    FROM organizations.find_public_organization_by_slug(
           requested_organization_slug
         ) AS public_organization
    JOIN learning_delivery.learning_offerings AS offering
      ON offering.organization_id = public_organization.id
     AND offering.id = ANY(requested_offering_ids)
     AND offering.status = 'open'
     AND offering.access_mode = 'entitlement_required'
   ORDER BY offering.id
$$;

REVOKE ALL ON FUNCTION learning_delivery.list_public_sellable_offerings(text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION learning_delivery.list_public_sellable_offerings(text, uuid[]) TO platform_app;
