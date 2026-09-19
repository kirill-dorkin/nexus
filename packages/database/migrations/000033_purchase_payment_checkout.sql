-- F9.2 Purchase + payment-provider boundary.
-- Commerce owns canonical Purchase/Entitlement state.
-- Integrations owns external checkout identity and durable provider webhook ingress.

ALTER TABLE commerce.products
  ADD CONSTRAINT commerce_products_organization_offering_id_key
  UNIQUE (organization_id, offering_id, id);

ALTER TABLE commerce.prices
  ADD CONSTRAINT commerce_prices_organization_product_id_key
  UNIQUE (organization_id, product_id, id);

CREATE TABLE commerce.purchases (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL,
  price_id uuid NOT NULL,
  offering_id uuid NOT NULL,
  purchaser_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid')),
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  billing_type text NOT NULL CHECK (billing_type IN ('one_time')),
  client_idempotency_key uuid NOT NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, offering_id, product_id)
    REFERENCES commerce.products(organization_id, offering_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, product_id, price_id)
    REFERENCES commerce.prices(organization_id, product_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, purchaser_user_id)
    REFERENCES organizations.memberships(organization_id, user_id)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, purchaser_user_id, client_idempotency_key),
  UNIQUE (organization_id, id),
  CHECK (
    (status = 'pending' AND paid_at IS NULL)
    OR
    (status = 'paid' AND paid_at IS NOT NULL)
  )
);

CREATE INDEX purchases_user_idx
  ON commerce.purchases (organization_id, purchaser_user_id, created_at, id);

CREATE INDEX purchases_price_idx
  ON commerce.purchases (organization_id, price_id, created_at, id);

CREATE OR REPLACE FUNCTION commerce.require_active_offer_for_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  product_status text;
  price_status text;
BEGIN
  SELECT status
    INTO product_status
    FROM commerce.products
   WHERE organization_id = NEW.organization_id
     AND id = NEW.product_id
   FOR SHARE;

  SELECT status
    INTO price_status
    FROM commerce.prices
   WHERE organization_id = NEW.organization_id
     AND id = NEW.price_id
   FOR SHARE;

  IF product_status IS DISTINCT FROM 'active'
     OR price_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'purchase requires an active product and price';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION commerce.require_active_offer_for_purchase() FROM PUBLIC;

CREATE TRIGGER commerce_purchases_10_require_active_offer
BEFORE INSERT ON commerce.purchases
FOR EACH ROW
EXECUTE FUNCTION commerce.require_active_offer_for_purchase();

CREATE OR REPLACE FUNCTION commerce.protect_purchase_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.product_id IS DISTINCT FROM OLD.product_id
     OR NEW.price_id IS DISTINCT FROM OLD.price_id
     OR NEW.offering_id IS DISTINCT FROM OLD.offering_id
     OR NEW.purchaser_user_id IS DISTINCT FROM OLD.purchaser_user_id
     OR NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.billing_type IS DISTINCT FROM OLD.billing_type
     OR NEW.client_idempotency_key IS DISTINCT FROM OLD.client_idempotency_key
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'purchase commercial identity is immutable';
  END IF;

  IF OLD.status = 'paid' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'paid purchase is immutable';
  END IF;

  IF OLD.status = 'pending'
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status <> 'paid' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'purchase may only transition from pending to paid';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION commerce.protect_purchase_lifecycle() FROM PUBLIC;

CREATE TRIGGER commerce_purchases_20_protect_lifecycle
BEFORE UPDATE ON commerce.purchases
FOR EACH ROW
EXECUTE FUNCTION commerce.protect_purchase_lifecycle();

ALTER TABLE commerce.entitlements
  ALTER COLUMN granted_by_user_id DROP NOT NULL,
  ADD COLUMN grant_source text NOT NULL DEFAULT 'manual'
    CHECK (grant_source IN ('manual', 'purchase')),
  ADD COLUMN source_purchase_id uuid;

ALTER TABLE commerce.entitlements
  ADD CONSTRAINT entitlements_source_purchase_fk
  FOREIGN KEY (organization_id, source_purchase_id)
  REFERENCES commerce.purchases(organization_id, id)
  ON DELETE RESTRICT,
  ADD CONSTRAINT entitlements_grant_source_consistency
  CHECK (
    (grant_source = 'manual'
      AND granted_by_user_id IS NOT NULL
      AND source_purchase_id IS NULL)
    OR
    (grant_source = 'purchase'
      AND granted_by_user_id IS NULL
      AND source_purchase_id IS NOT NULL)
  );

CREATE TABLE integrations.payment_checkouts (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE RESTRICT,
  purchase_id uuid NOT NULL,
  provider_key text NOT NULL CHECK (provider_key IN ('stripe')),
  external_checkout_id text NOT NULL
    CHECK (char_length(external_checkout_id) BETWEEN 3 AND 255),
  checkout_url text NOT NULL CHECK (char_length(checkout_url) BETWEEN 8 AND 2048),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, purchase_id)
    REFERENCES commerce.purchases(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, purchase_id, provider_key),
  UNIQUE (provider_key, external_checkout_id)
);

CREATE INDEX payment_checkouts_purchase_idx
  ON integrations.payment_checkouts (organization_id, purchase_id, provider_key);

CREATE TABLE integrations.payment_webhook_inbox (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid,
  purchase_id uuid,
  provider_key text NOT NULL CHECK (provider_key IN ('stripe')),
  provider_event_id text NOT NULL
    CHECK (char_length(provider_event_id) BETWEEN 3 AND 255),
  external_checkout_id text NOT NULL
    CHECK (char_length(external_checkout_id) BETWEEN 3 AND 255),
  event_type text NOT NULL
    CHECK (event_type IN (
      'checkout.session.completed',
      'checkout.session.async_payment_succeeded'
    )),
  payment_status text NOT NULL
    CHECK (payment_status IN ('paid', 'unpaid', 'no_payment_required')),
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  routing_status text NOT NULL
    CHECK (routing_status IN ('mapped', 'unmapped_checkout')),
  payload_sha256 text NOT NULL
    CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  received_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, purchase_id)
    REFERENCES commerce.purchases(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (provider_key, provider_event_id),
  CHECK (
    (routing_status = 'mapped'
      AND organization_id IS NOT NULL
      AND purchase_id IS NOT NULL)
    OR
    (routing_status = 'unmapped_checkout'
      AND organization_id IS NULL
      AND purchase_id IS NULL)
  )
);

CREATE INDEX payment_webhook_inbox_purchase_idx
  ON integrations.payment_webhook_inbox (
    organization_id,
    purchase_id,
    received_at,
    id
  )
  WHERE organization_id IS NOT NULL;

CREATE OR REPLACE FUNCTION platform_internal.ingest_payment_webhook(
  p_provider_key text,
  p_provider_event_id text,
  p_external_checkout_id text,
  p_event_type text,
  p_payment_status text,
  p_amount_minor integer,
  p_currency text,
  p_payload_sha256 text
)
RETURNS TABLE (
  inserted boolean,
  routing_status text,
  organization_id uuid,
  purchase_id uuid,
  existing_payload_sha256 text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_organization_id uuid;
  v_purchase_id uuid;
  v_routing_status text;
  v_existing_payload_sha256 text;
BEGIN
  SELECT checkout.organization_id, checkout.purchase_id
    INTO v_organization_id, v_purchase_id
    FROM integrations.payment_checkouts AS checkout
   WHERE checkout.provider_key = p_provider_key
     AND checkout.external_checkout_id = p_external_checkout_id;

  IF v_purchase_id IS NULL THEN
    v_organization_id := NULL;
    v_routing_status := 'unmapped_checkout';
  ELSE
    v_routing_status := 'mapped';
  END IF;

  INSERT INTO integrations.payment_webhook_inbox (
    organization_id,
    purchase_id,
    provider_key,
    provider_event_id,
    external_checkout_id,
    event_type,
    payment_status,
    amount_minor,
    currency,
    routing_status,
    payload_sha256
  )
  VALUES (
    v_organization_id,
    v_purchase_id,
    p_provider_key,
    p_provider_event_id,
    p_external_checkout_id,
    p_event_type,
    p_payment_status,
    p_amount_minor,
    p_currency,
    v_routing_status,
    p_payload_sha256
  )
  ON CONFLICT (provider_key, provider_event_id) DO NOTHING;

  IF FOUND THEN
    RETURN QUERY
      SELECT
        true,
        v_routing_status,
        v_organization_id,
        v_purchase_id,
        NULL::text;
    RETURN;
  END IF;

  SELECT inbox.payload_sha256
    INTO v_existing_payload_sha256
    FROM integrations.payment_webhook_inbox AS inbox
   WHERE inbox.provider_key = p_provider_key
     AND inbox.provider_event_id = p_provider_event_id;

  RETURN QUERY
    SELECT
      false,
      inbox.routing_status,
      inbox.organization_id,
      inbox.purchase_id,
      v_existing_payload_sha256
    FROM integrations.payment_webhook_inbox AS inbox
   WHERE inbox.provider_key = p_provider_key
     AND inbox.provider_event_id = p_provider_event_id;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.ingest_payment_webhook(
  text, text, text, text, text, integer, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION platform_internal.ingest_payment_webhook(
  text, text, text, text, text, integer, text, text
) TO platform_app;

GRANT SELECT, INSERT ON commerce.purchases TO platform_app;
GRANT UPDATE (status, paid_at, updated_at)
  ON commerce.purchases TO platform_app;

GRANT SELECT, INSERT ON integrations.payment_checkouts TO platform_app;

ALTER TABLE commerce.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.payment_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.payment_webhook_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchases_app_tenant_policy
  ON commerce.purchases
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY payment_checkouts_app_tenant_policy
  ON integrations.payment_checkouts
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
