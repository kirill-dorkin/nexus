-- ADR-0087 slice 3: lava.top as the subscription payment provider.
-- The trusted mapping from lava contracts to platform subscriptions is written by checkout before the
-- learner is sent to pay. Webhooks are authenticated by the API (shared secret), stored once in
-- an inbox and applied inline through commerce.apply_subscription_event (no worker, ADR-0071).

-- What the learner agreed to at checkout: the auto-renewal terms version and when.
ALTER TABLE commerce.subscriptions
  ADD COLUMN renewal_terms_version text
    CHECK (renewal_terms_version IS NULL OR char_length(renewal_terms_version) BETWEEN 1 AND 64),
  ADD COLUMN renewal_consented_at timestamptz,
  ADD CONSTRAINT subscriptions_renewal_consent_pair
    CHECK ((renewal_terms_version IS NULL) = (renewal_consented_at IS NULL));

-- Every lava contract of a subscription: the first payment and each renewal (renewals carry the
-- first contract as parentContractId; cancellation names the latest contract).
CREATE TABLE integrations.lava_contracts (
  contract_id uuid PRIMARY KEY,
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL,
  parent_contract_id uuid REFERENCES integrations.lava_contracts(contract_id),
  payment_url text CHECK (payment_url IS NULL OR payment_url ~ '^https://'),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, subscription_id)
    REFERENCES commerce.subscriptions(organization_id, id)
    ON DELETE RESTRICT,
  CHECK ((parent_contract_id IS NULL) = (payment_url IS NOT NULL))
);

CREATE UNIQUE INDEX lava_contracts_one_first_contract
  ON integrations.lava_contracts (organization_id, subscription_id)
  WHERE parent_contract_id IS NULL;

GRANT SELECT, INSERT ON integrations.lava_contracts TO platform_app;
ALTER TABLE integrations.lava_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY lava_contracts_app_tenant_policy
  ON integrations.lava_contracts FOR ALL TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

-- Every authenticated webhook, once. Readable only by the migrator for support.
CREATE TABLE integrations.lava_webhook_inbox (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  event_key text NOT NULL UNIQUE CHECK (char_length(event_key) BETWEEN 1 AND 300),
  event_type text NOT NULL CHECK (char_length(event_type) BETWEEN 1 AND 100),
  contract_id uuid,
  parent_contract_id uuid,
  organization_id uuid,
  subscription_id uuid,
  outcome text NOT NULL DEFAULT 'received'
    CHECK (outcome IN ('received', 'applied', 'unmapped', 'needs_review', 'rejected')),
  detail text,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE integrations.lava_webhook_inbox ENABLE ROW LEVEL SECURITY;

-- Store, route and apply one webhook in the caller's transaction. Returns:
--   'duplicate'          the same event was already received;
--   'unmapped'           no subscription knows this contract;
--   'needs_review'       an event without a contract (refund, chargeback) — an operator decides;
--   'rejected'           the payment does not match the subscription terms;
--   'applied:<status>'   applied, with the subscription status after it.
CREATE OR REPLACE FUNCTION platform_internal.receive_lava_webhook(
  p_event_key text,
  p_event_type text,
  p_contract_id uuid,
  p_parent_contract_id uuid,
  p_amount_minor integer,
  p_currency text,
  p_occurred_at timestamptz,
  p_payload jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  inbox_id uuid;
  target record;
  kind text;
  new_status text;
BEGIN
  INSERT INTO integrations.lava_webhook_inbox (
    event_key, event_type, contract_id, parent_contract_id, payload
  )
  VALUES (p_event_key, p_event_type, p_contract_id, p_parent_contract_id, p_payload)
  ON CONFLICT (event_key) DO NOTHING
  RETURNING id INTO inbox_id;

  IF inbox_id IS NULL THEN
    RETURN 'duplicate';
  END IF;

  kind := CASE p_event_type
    WHEN 'payment.success' THEN 'payment_succeeded'
    WHEN 'subscription.recurring.payment.success' THEN 'payment_succeeded'
    WHEN 'payment.failed' THEN 'payment_failed'
    WHEN 'subscription.recurring.payment.failed' THEN 'payment_failed'
    WHEN 'subscription.cancelled' THEN 'cancelled'
    ELSE NULL
  END;

  IF kind IS NULL OR p_contract_id IS NULL THEN
    UPDATE integrations.lava_webhook_inbox
       SET outcome = 'needs_review', processed_at = now()
     WHERE id = inbox_id;
    RETURN 'needs_review';
  END IF;

  SELECT contract.organization_id, contract.subscription_id
    INTO target
    FROM integrations.lava_contracts AS contract
   WHERE contract.contract_id IN (p_contract_id, p_parent_contract_id)
   ORDER BY contract.parent_contract_id NULLS FIRST
   LIMIT 1;

  IF NOT FOUND THEN
    UPDATE integrations.lava_webhook_inbox
       SET outcome = 'unmapped', processed_at = now()
     WHERE id = inbox_id;
    RETURN 'unmapped';
  END IF;

  -- A renewal's own contract joins the mapping, so a later cancellation that names it routes.
  IF p_parent_contract_id IS NOT NULL AND p_contract_id <> p_parent_contract_id THEN
    INSERT INTO integrations.lava_contracts (
      contract_id, organization_id, subscription_id, parent_contract_id
    )
    SELECT p_contract_id, target.organization_id, target.subscription_id, first.contract_id
      FROM integrations.lava_contracts AS first
     WHERE first.organization_id = target.organization_id
       AND first.subscription_id = target.subscription_id
       AND first.parent_contract_id IS NULL
    ON CONFLICT (contract_id) DO NOTHING;
  END IF;

  BEGIN
    new_status := commerce.apply_subscription_event(
      target.organization_id,
      target.subscription_id,
      kind,
      CASE WHEN kind = 'payment_succeeded' THEN 'lava:' || p_contract_id::text END,
      CASE WHEN kind = 'payment_succeeded' THEN p_amount_minor END,
      CASE WHEN kind = 'payment_succeeded' THEN p_currency END,
      p_occurred_at
    );
  EXCEPTION WHEN check_violation THEN
    UPDATE integrations.lava_webhook_inbox
       SET outcome = 'rejected', detail = SQLERRM, processed_at = now(),
           organization_id = target.organization_id,
           subscription_id = target.subscription_id
     WHERE id = inbox_id;
    RETURN 'rejected';
  END;

  UPDATE integrations.lava_webhook_inbox
     SET outcome = 'applied', processed_at = now(),
         organization_id = target.organization_id,
         subscription_id = target.subscription_id
   WHERE id = inbox_id;
  RETURN 'applied:' || new_status;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.receive_lava_webhook(
  text, text, uuid, uuid, integer, text, timestamptz, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_internal.receive_lava_webhook(
  text, text, uuid, uuid, integer, text, timestamptz, jsonb
) TO platform_app;

-- Anonymous visitors see the active subscription offers of an active organization (ADR-0087):
-- public commercial terms only, like commerce.list_public_catalog_offer_rows.
CREATE OR REPLACE FUNCTION commerce.list_public_subscription_offers(p_organization_slug text)
RETURNS TABLE (
  price_id uuid,
  plan_slug text,
  plan_name text,
  amount_minor integer,
  currency text,
  billing_period text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT price.id, plan.slug, plan.name, price.amount_minor, price.currency, price.billing_period
    FROM organizations.organizations AS org
    JOIN commerce.subscription_plans AS plan
      ON plan.organization_id = org.id AND plan.status = 'active'
    JOIN commerce.subscription_plan_prices AS price
      ON price.organization_id = plan.organization_id AND price.plan_id = plan.id
     AND price.status = 'active'
   WHERE org.slug = p_organization_slug AND org.status = 'active'
   ORDER BY plan.slug, price.currency,
            array_position(ARRAY['month', 'days_90', 'year'], price.billing_period)
$$;

REVOKE ALL ON FUNCTION commerce.list_public_subscription_offers(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION commerce.list_public_subscription_offers(text) TO platform_app;
