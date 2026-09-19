-- F9.2 Purchase + payment-provider boundary.
-- Commerce owns canonical Purchase/Entitlement state.
-- Integrations owns provider checkout identity, durable webhook ingress, and
-- processing state. platform_worker crosses those boundaries only through
-- narrow SECURITY DEFINER functions.

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

CREATE TABLE integrations.payment_webhook_processing (
  inbox_id uuid PRIMARY KEY
    REFERENCES integrations.payment_webhook_inbox(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'processing',
      'blocked',
      'retryable',
      'completed',
      'rejected',
      'dead_letter'
    )),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  last_error_code text
    CHECK (
      last_error_code IS NULL
      OR last_error_code ~ '^[a-z][a-z0-9_]{0,99}$'
    ),
  last_error_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (status = 'processing' AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
    OR (status <> 'processing' AND lease_token IS NULL AND lease_expires_at IS NULL)
  ),
  CHECK (
    (status IN ('completed', 'rejected', 'dead_letter') AND finished_at IS NOT NULL)
    OR (status NOT IN ('completed', 'rejected', 'dead_letter') AND finished_at IS NULL)
  )
);

CREATE INDEX payment_webhook_processing_claim_idx
  ON integrations.payment_webhook_processing (available_at, inbox_id)
  WHERE status IN ('pending', 'retryable');

CREATE INDEX payment_webhook_processing_lease_idx
  ON integrations.payment_webhook_processing (lease_expires_at, inbox_id)
  WHERE status = 'processing';

CREATE OR REPLACE FUNCTION integrations.initialize_payment_webhook_processing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO integrations.payment_webhook_processing (inbox_id, available_at)
  VALUES (NEW.id, NEW.received_at)
  ON CONFLICT (inbox_id) DO NOTHING;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION integrations.initialize_payment_webhook_processing()
  FROM PUBLIC;

CREATE TRIGGER payment_webhook_processing_initialize
AFTER INSERT ON integrations.payment_webhook_inbox
FOR EACH ROW
EXECUTE FUNCTION integrations.initialize_payment_webhook_processing();

CREATE OR REPLACE FUNCTION integrations.reactivate_payment_webhook_processing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  UPDATE integrations.payment_webhook_processing AS processing
     SET status = 'pending',
         available_at = now(),
         last_error_code = NULL,
         last_error_at = NULL,
         updated_at = now()
    FROM integrations.payment_webhook_inbox AS inbox
   WHERE processing.inbox_id = inbox.id
     AND processing.status = 'blocked'
     AND inbox.provider_key = NEW.provider_key
     AND inbox.external_checkout_id = NEW.external_checkout_id;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION integrations.reactivate_payment_webhook_processing()
  FROM PUBLIC;

CREATE TRIGGER payment_checkout_reactivate_webhooks
AFTER INSERT ON integrations.payment_checkouts
FOR EACH ROW
EXECUTE FUNCTION integrations.reactivate_payment_webhook_processing();

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

CREATE OR REPLACE FUNCTION platform_internal.claim_payment_webhook(
  p_lease_token uuid,
  p_lease_seconds integer
)
RETURNS TABLE (
  inbox_id uuid,
  provider_event_id text,
  external_checkout_id text,
  event_type text,
  payment_status text,
  amount_minor integer,
  currency text,
  organization_id uuid,
  purchase_id uuid,
  attempt_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_lease_seconds < 1 OR p_lease_seconds > 900 THEN
    RAISE EXCEPTION 'payment webhook lease must be between 1 and 900 seconds'
      USING ERRCODE = '22023';
  END IF;

  UPDATE integrations.payment_webhook_processing AS exhausted
     SET status = 'dead_letter',
         lease_token = NULL,
         lease_expires_at = NULL,
         last_error_code = 'lease_expired_attempts_exhausted',
         last_error_at = now(),
         finished_at = now(),
         updated_at = now()
   WHERE exhausted.status = 'processing'
     AND exhausted.lease_expires_at <= now()
     AND exhausted.attempt_count >= 5;

  RETURN QUERY
  WITH candidate AS (
    SELECT processing.inbox_id
      FROM integrations.payment_webhook_processing AS processing
     WHERE processing.attempt_count < 5
       AND (
         (processing.status IN ('pending', 'retryable')
           AND processing.available_at <= now())
         OR
         (processing.status = 'processing'
           AND processing.lease_expires_at <= now())
       )
     ORDER BY processing.available_at, processing.inbox_id
     FOR UPDATE SKIP LOCKED
     LIMIT 1
  ), claimed AS (
    UPDATE integrations.payment_webhook_processing AS processing
       SET status = 'processing',
           attempt_count = processing.attempt_count + 1,
           lease_token = p_lease_token,
           lease_expires_at = now() + make_interval(secs => p_lease_seconds),
           last_error_code = NULL,
           last_error_at = NULL,
           updated_at = now()
      FROM candidate
     WHERE processing.inbox_id = candidate.inbox_id
     RETURNING processing.inbox_id, processing.attempt_count
  )
  SELECT
    inbox.id,
    inbox.provider_event_id,
    inbox.external_checkout_id,
    inbox.event_type,
    inbox.payment_status,
    inbox.amount_minor,
    inbox.currency,
    checkout.organization_id,
    checkout.purchase_id,
    claimed.attempt_count
  FROM claimed
  JOIN integrations.payment_webhook_inbox AS inbox
    ON inbox.id = claimed.inbox_id
  LEFT JOIN integrations.payment_checkouts AS checkout
    ON checkout.provider_key = inbox.provider_key
   AND checkout.external_checkout_id = inbox.external_checkout_id;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.claim_payment_webhook(uuid, integer)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_internal.claim_payment_webhook(uuid, integer)
  TO platform_worker;

CREATE OR REPLACE FUNCTION commerce.settle_paid_purchase(
  p_organization_id uuid,
  p_purchase_id uuid,
  p_amount_minor integer,
  p_currency text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  purchase commerce.purchases%ROWTYPE;
  entitlement_id uuid;
BEGIN
  IF platform_internal.current_organization_id() IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'paid Purchase settlement requires matching organization context'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO purchase
    FROM commerce.purchases
   WHERE organization_id = p_organization_id
     AND id = p_purchase_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase does not exist'
      USING ERRCODE = '23503';
  END IF;

  IF purchase.amount_minor IS DISTINCT FROM p_amount_minor
     OR purchase.currency IS DISTINCT FROM p_currency THEN
    RAISE EXCEPTION 'provider settlement does not match canonical Purchase terms'
      USING ERRCODE = '23514';
  END IF;

  IF purchase.status = 'paid' THEN
    RETURN false;
  END IF;

  UPDATE commerce.purchases
     SET status = 'paid',
         paid_at = now(),
         updated_at = now()
   WHERE organization_id = p_organization_id
     AND id = p_purchase_id;

  INSERT INTO commerce.entitlements (
    id,
    organization_id,
    offering_id,
    user_id,
    status,
    granted_at,
    expires_at,
    revoked_at,
    granted_by_user_id,
    revoked_by_user_id,
    created_at,
    updated_at,
    grant_source,
    source_purchase_id
  )
  VALUES (
    uuidv7(),
    purchase.organization_id,
    purchase.offering_id,
    purchase.purchaser_user_id,
    'active',
    now(),
    NULL,
    NULL,
    NULL,
    NULL,
    now(),
    now(),
    'purchase',
    purchase.id
  )
  ON CONFLICT (organization_id, offering_id, user_id)
  DO UPDATE SET
    status = 'active',
    granted_at = now(),
    expires_at = NULL,
    revoked_at = NULL,
    granted_by_user_id = NULL,
    revoked_by_user_id = NULL,
    updated_at = now(),
    grant_source = 'purchase',
    source_purchase_id = purchase.id
  RETURNING id INTO entitlement_id;

  INSERT INTO events.outbox (
    organization_id,
    event_name,
    event_version,
    aggregate_type,
    aggregate_id,
    actor_user_id,
    payload,
    metadata,
    idempotency_key
  )
  VALUES (
    purchase.organization_id,
    'purchase.paid',
    1,
    'purchase',
    purchase.id,
    NULL,
    jsonb_build_object(
      'organizationId', purchase.organization_id,
      'purchaseId', purchase.id,
      'productId', purchase.product_id,
      'priceId', purchase.price_id,
      'offeringId', purchase.offering_id,
      'purchaserUserId', purchase.purchaser_user_id,
      'amountMinor', purchase.amount_minor,
      'currency', purchase.currency,
      'paidAt', now()
    ),
    '{}'::jsonb,
    'purchase-paid:' || purchase.id::text
  );

  INSERT INTO events.outbox (
    organization_id,
    event_name,
    event_version,
    aggregate_type,
    aggregate_id,
    actor_user_id,
    payload,
    metadata,
    idempotency_key
  )
  VALUES (
    purchase.organization_id,
    'entitlement.granted',
    1,
    'entitlement',
    entitlement_id,
    NULL,
    jsonb_build_object(
      'organizationId', purchase.organization_id,
      'entitlementId', entitlement_id,
      'offeringId', purchase.offering_id,
      'userId', purchase.purchaser_user_id,
      'expiresAt', NULL,
      'grantSource', 'purchase',
      'sourcePurchaseId', purchase.id
    ),
    '{}'::jsonb,
    'purchase-entitlement-granted:' || purchase.id::text
  );

  RETURN true;
END
$$;

REVOKE ALL ON FUNCTION commerce.settle_paid_purchase(
  uuid, uuid, integer, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION commerce.settle_paid_purchase(
  uuid, uuid, integer, text
) TO platform_worker;

CREATE OR REPLACE FUNCTION platform_internal.acknowledge_payment_webhook(
  p_inbox_id uuid,
  p_lease_token uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  processing integrations.payment_webhook_processing%ROWTYPE;
  inbox integrations.payment_webhook_inbox%ROWTYPE;
  checkout integrations.payment_checkouts%ROWTYPE;
BEGIN
  SELECT *
    INTO processing
    FROM integrations.payment_webhook_processing
   WHERE inbox_id = p_inbox_id
   FOR UPDATE;

  IF NOT FOUND
     OR processing.status <> 'processing'
     OR processing.lease_token IS DISTINCT FROM p_lease_token
     OR processing.lease_expires_at <= now() THEN
    RETURN false;
  END IF;

  SELECT *
    INTO inbox
    FROM integrations.payment_webhook_inbox
   WHERE id = p_inbox_id;

  SELECT *
    INTO checkout
    FROM integrations.payment_checkouts
   WHERE provider_key = inbox.provider_key
     AND external_checkout_id = inbox.external_checkout_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF platform_internal.current_organization_id() IS DISTINCT FROM checkout.organization_id THEN
    RAISE EXCEPTION 'payment webhook acknowledgement requires matching organization context'
      USING ERRCODE = '42501';
  END IF;

  IF inbox.payment_status = 'paid' THEN
    PERFORM commerce.settle_paid_purchase(
      checkout.organization_id,
      checkout.purchase_id,
      inbox.amount_minor,
      inbox.currency
    );
  END IF;

  UPDATE integrations.payment_webhook_processing
     SET status = 'completed',
         lease_token = NULL,
         lease_expires_at = NULL,
         last_error_code = NULL,
         last_error_at = NULL,
         finished_at = now(),
         updated_at = now()
   WHERE inbox_id = p_inbox_id;

  RETURN true;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.acknowledge_payment_webhook(uuid, uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_internal.acknowledge_payment_webhook(uuid, uuid)
  TO platform_worker;

CREATE OR REPLACE FUNCTION platform_internal.finish_payment_webhook(
  p_inbox_id uuid,
  p_lease_token uuid,
  p_outcome text,
  p_error_code text,
  p_available_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_outcome NOT IN ('blocked', 'retryable', 'rejected', 'dead_letter') THEN
    RAISE EXCEPTION 'invalid payment webhook processing outcome'
      USING ERRCODE = '22023';
  END IF;

  IF p_error_code IS NULL
     OR p_error_code !~ '^[a-z][a-z0-9_]{0,99}$' THEN
    RAISE EXCEPTION 'invalid payment webhook processing error code'
      USING ERRCODE = '22023';
  END IF;

  UPDATE integrations.payment_webhook_processing AS processing
     SET status = p_outcome,
         available_at = CASE
           WHEN p_outcome = 'retryable' THEN COALESCE(p_available_at, now())
           ELSE processing.available_at
         END,
         lease_token = NULL,
         lease_expires_at = NULL,
         last_error_code = p_error_code,
         last_error_at = now(),
         finished_at = CASE
           WHEN p_outcome IN ('rejected', 'dead_letter') THEN now()
           ELSE NULL
         END,
         updated_at = now()
   WHERE processing.inbox_id = p_inbox_id
     AND processing.status = 'processing'
     AND processing.lease_token = p_lease_token;

  RETURN FOUND;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.finish_payment_webhook(
  uuid, uuid, text, text, timestamptz
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_internal.finish_payment_webhook(
  uuid, uuid, text, text, timestamptz
) TO platform_worker;

GRANT SELECT, INSERT ON commerce.purchases TO platform_app;
GRANT SELECT, INSERT ON integrations.payment_checkouts TO platform_app;

ALTER TABLE commerce.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.payment_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.payment_webhook_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.payment_webhook_processing ENABLE ROW LEVEL SECURITY;

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
