-- F9.1 Commerce catalog foundation.
-- Product is a stable commercial package for one Offering.
-- Price terms are immutable; replacing terms requires archiving and creating a new Price.

CREATE TABLE commerce.products (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  offering_id uuid NOT NULL,
  slug text NOT NULL
    CHECK (
      char_length(slug) BETWEEN 2 AND 63
      AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  archived_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  archived_by_user_id uuid REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, offering_id)
    REFERENCES learning_delivery.learning_offerings(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, slug),
  UNIQUE (organization_id, id),
  CHECK (
    (status = 'active' AND archived_at IS NULL AND archived_by_user_id IS NULL)
    OR
    (status = 'archived' AND archived_at IS NOT NULL AND archived_by_user_id IS NOT NULL)
  )
);

CREATE TABLE commerce.prices (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  billing_type text NOT NULL CHECK (billing_type IN ('one_time')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  archived_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  archived_by_user_id uuid REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, product_id)
    REFERENCES commerce.products(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  CHECK (
    (status = 'active' AND archived_at IS NULL AND archived_by_user_id IS NULL)
    OR
    (status = 'archived' AND archived_at IS NOT NULL AND archived_by_user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX commerce_prices_one_active_terms_key
  ON commerce.prices (organization_id, product_id, currency, billing_type)
  WHERE status = 'active';

CREATE INDEX commerce_products_offering_idx
  ON commerce.products (organization_id, offering_id, status, id);

CREATE INDEX commerce_prices_product_idx
  ON commerce.prices (organization_id, product_id, status, id);

CREATE OR REPLACE FUNCTION commerce.require_active_product_for_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  product_status text;
BEGIN
  SELECT status
    INTO product_status
    FROM commerce.products
   WHERE organization_id = NEW.organization_id
     AND id = NEW.product_id
   FOR SHARE;

  IF product_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'commerce price requires an active product';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION commerce.require_active_product_for_price() FROM PUBLIC;

CREATE TRIGGER commerce_prices_10_require_active_product
BEFORE INSERT ON commerce.prices
FOR EACH ROW
EXECUTE FUNCTION commerce.require_active_product_for_price();

CREATE OR REPLACE FUNCTION commerce.protect_price_archive_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF OLD.status = 'archived' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'archived commerce price is immutable';
  END IF;

  IF OLD.status = 'active'
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status <> 'archived' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'commerce price may only transition from active to archived';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION commerce.protect_price_archive_lifecycle() FROM PUBLIC;

CREATE TRIGGER commerce_prices_20_protect_archive_lifecycle
BEFORE UPDATE ON commerce.prices
FOR EACH ROW
EXECUTE FUNCTION commerce.protect_price_archive_lifecycle();

CREATE OR REPLACE FUNCTION commerce.protect_product_archive_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF OLD.status = 'archived' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'archived commerce product is immutable';
  END IF;

  IF OLD.status = 'active'
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status <> 'archived' THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'commerce product may only transition from active to archived';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM commerce.prices
       WHERE organization_id = OLD.organization_id
         AND product_id = OLD.id
         AND status = 'active'
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'commerce product with an active price cannot be archived';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION commerce.protect_product_archive_lifecycle() FROM PUBLIC;

CREATE TRIGGER commerce_products_10_protect_archive_lifecycle
BEFORE UPDATE ON commerce.products
FOR EACH ROW
EXECUTE FUNCTION commerce.protect_product_archive_lifecycle();

GRANT SELECT, INSERT ON commerce.products TO platform_app;
GRANT UPDATE (status, archived_at, archived_by_user_id, updated_at)
  ON commerce.products TO platform_app;

GRANT SELECT, INSERT ON commerce.prices TO platform_app;
GRANT UPDATE (status, archived_at, archived_by_user_id, updated_at)
  ON commerce.prices TO platform_app;

ALTER TABLE commerce.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY commerce_products_app_tenant_policy
  ON commerce.products
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY commerce_prices_app_tenant_policy
  ON commerce.prices
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
