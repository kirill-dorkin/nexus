-- ADR-0087: subscription access to an organization's catalog.
-- Subscription != Entitlement != Enrollment. Plans and their prices are immutable commercial
-- terms (archive and replace, like ADR-0044); a Subscription pins the exact terms it started
-- with; access is a catalog-scoped Entitlement whose expiry follows the paid period.

CREATE TABLE commerce.subscription_plans (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug),
  UNIQUE (organization_id, id),
  CHECK ((status = 'active') = (archived_at IS NULL))
);

CREATE TABLE commerce.subscription_plan_prices (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL,
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  billing_period text NOT NULL
    CHECK (billing_period IN ('month', 'days_90', 'year')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  archived_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, plan_id)
    REFERENCES commerce.subscription_plans(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  CHECK ((status = 'active') = (archived_at IS NULL))
);

-- One current offer per plan, currency and period.
CREATE UNIQUE INDEX subscription_plan_prices_one_active_key
  ON commerce.subscription_plan_prices (
    organization_id, plan_id, currency, billing_period
  )
  WHERE status = 'active';

CREATE TABLE commerce.subscriptions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  plan_price_id uuid NOT NULL,
  -- The terms are copied when the subscription starts and never change: an early subscriber
  -- keeps the price they agreed to after the plan's price is replaced.
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  billing_period text NOT NULL
    CHECK (billing_period IN ('month', 'days_90', 'year')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'past_due', 'cancelled', 'revoked')),
  current_period_end timestamptz,
  idempotency_key text NOT NULL
    CHECK (char_length(idempotency_key) BETWEEN 8 AND 128),
  activated_at timestamptz,
  cancelled_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, plan_price_id)
    REFERENCES commerce.subscription_plan_prices(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, user_id)
    REFERENCES organizations.memberships(organization_id, user_id)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, user_id, idempotency_key),
  CHECK ((status = 'pending') = (activated_at IS NULL)),
  CHECK (status = 'pending' OR current_period_end IS NOT NULL),
  CHECK ((status = 'cancelled') <= (cancelled_at IS NOT NULL)),
  CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);

-- At most one subscription per learner is being charged at a time.
CREATE UNIQUE INDEX subscriptions_one_charging_key
  ON commerce.subscriptions (organization_id, user_id)
  WHERE status IN ('active', 'past_due');

CREATE INDEX subscriptions_user_idx
  ON commerce.subscriptions (organization_id, user_id, created_at DESC);

-- Each provider payment is applied once: a repeated webhook cannot extend the period twice.
CREATE TABLE commerce.subscription_payments (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL,
  payment_key text NOT NULL
    CHECK (char_length(payment_key) BETWEEN 1 AND 200),
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  paid_at timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, subscription_id)
    REFERENCES commerce.subscriptions(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, payment_key)
);

-- Catalog-scoped access right (ADR-0014 extended by ADR-0087): one per learner.
CREATE TABLE commerce.catalog_entitlements (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked')),
  grant_source text NOT NULL CHECK (grant_source IN ('subscription', 'manual')),
  source_subscription_id uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, source_subscription_id)
    REFERENCES commerce.subscriptions(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, user_id)
    REFERENCES organizations.memberships(organization_id, user_id)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, user_id),
  CHECK ((grant_source = 'subscription') = (source_subscription_id IS NOT NULL)),
  CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);

-- The application reads everything in its tenant, creates plans, prices and pending
-- subscriptions, and may only archive plans and prices. Money, periods and access move only
-- through commerce.apply_subscription_event below.
GRANT SELECT, INSERT ON commerce.subscription_plans TO platform_app;
GRANT UPDATE (status, archived_at, updated_at) ON commerce.subscription_plans TO platform_app;
GRANT SELECT, INSERT ON commerce.subscription_plan_prices TO platform_app;
GRANT UPDATE (status, archived_at, updated_at)
  ON commerce.subscription_plan_prices TO platform_app;
GRANT SELECT, INSERT ON commerce.subscriptions TO platform_app;
GRANT SELECT ON commerce.subscription_payments TO platform_app;
GRANT SELECT ON commerce.catalog_entitlements TO platform_app;

ALTER TABLE commerce.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.subscription_plan_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.catalog_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscription_plans_app_tenant_policy
  ON commerce.subscription_plans FOR ALL TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY subscription_plan_prices_app_tenant_policy
  ON commerce.subscription_plan_prices FOR ALL TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY subscriptions_app_tenant_policy
  ON commerce.subscriptions FOR ALL TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY subscription_payments_app_tenant_policy
  ON commerce.subscription_payments FOR SELECT TO platform_app
  USING (organization_id = platform_internal.current_organization_id());

CREATE POLICY catalog_entitlements_app_tenant_policy
  ON commerce.catalog_entitlements FOR SELECT TO platform_app
  USING (organization_id = platform_internal.current_organization_id());

-- A price row's terms never change; only active -> archived is allowed, once.
CREATE OR REPLACE FUNCTION commerce.protect_subscription_offer_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF OLD.status = 'archived' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'archived subscription offer is immutable';
  END IF;
  IF NEW.status = 'active' AND OLD.status = 'active' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'active subscription offer can only be archived';
  END IF;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION commerce.protect_subscription_offer_lifecycle() FROM PUBLIC;

CREATE TRIGGER subscription_plans_10_protect_lifecycle
BEFORE UPDATE ON commerce.subscription_plans
FOR EACH ROW EXECUTE FUNCTION commerce.protect_subscription_offer_lifecycle();

CREATE TRIGGER subscription_plan_prices_10_protect_lifecycle
BEFORE UPDATE ON commerce.subscription_plan_prices
FOR EACH ROW EXECUTE FUNCTION commerce.protect_subscription_offer_lifecycle();

-- A pending subscription may only be created from an active price of an active plan, with the
-- price's exact terms.
CREATE OR REPLACE FUNCTION commerce.require_active_subscription_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  offer record;
BEGIN
  SELECT price.amount_minor, price.currency, price.billing_period,
         price.status AS price_status, plan.status AS plan_status
    INTO offer
    FROM commerce.subscription_plan_prices AS price
    JOIN commerce.subscription_plans AS plan
      ON plan.organization_id = price.organization_id AND plan.id = price.plan_id
   WHERE price.organization_id = NEW.organization_id
     AND price.id = NEW.plan_price_id
   FOR SHARE OF price, plan;

  IF offer IS NULL
     OR offer.price_status <> 'active'
     OR offer.plan_status <> 'active' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'subscription requires an active plan price';
  END IF;

  IF NEW.status <> 'pending'
     OR NEW.amount_minor IS DISTINCT FROM offer.amount_minor
     OR NEW.currency IS DISTINCT FROM offer.currency
     OR NEW.billing_period IS DISTINCT FROM offer.billing_period THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'subscription must start pending with the exact plan price terms';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION commerce.require_active_subscription_offer() FROM PUBLIC;

CREATE TRIGGER subscriptions_10_require_active_offer
BEFORE INSERT ON commerce.subscriptions
FOR EACH ROW EXECUTE FUNCTION commerce.require_active_subscription_offer();

CREATE OR REPLACE FUNCTION commerce.subscription_period(p_billing_period text)
RETURNS interval
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE p_billing_period
    WHEN 'month' THEN interval '1 month'
    WHEN 'days_90' THEN interval '90 days'
    WHEN 'year' THEN interval '1 year'
  END
$$;

-- Applies one normalized provider event to a subscription and its access, atomically with the
-- outbox (ADR-0087 §2, §6). Called by the payment provider adapter after it authenticated the
-- webhook and routed it through its own trusted mapping; it trusts nothing else.
--
-- p_kind:
--   'payment_succeeded' — first payment or renewal: active, period extended, access granted
--                         until period end + 2 days. Idempotent per p_payment_key.
--   'payment_failed'    — active -> past_due; access is unchanged and expires on its own.
--   'cancelled'         — no further charges; access stays until it expires.
--   'revoked'           — refund or chargeback: subscription and its access end now.
-- Returns the subscription status after the event (unchanged for a repeated payment).
CREATE OR REPLACE FUNCTION commerce.apply_subscription_event(
  p_organization_id uuid,
  p_subscription_id uuid,
  p_kind text,
  p_payment_key text,
  p_amount_minor integer,
  p_currency text,
  p_occurred_at timestamptz
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  subscription commerce.subscriptions%ROWTYPE;
  period_start timestamptz;
  new_period_end timestamptz;
  grace constant interval := interval '2 days';
  entitlement_id uuid;
  inserted_payment uuid;
BEGIN
  IF p_kind NOT IN ('payment_succeeded', 'payment_failed', 'cancelled', 'revoked') THEN
    RAISE EXCEPTION 'unknown subscription event kind %', p_kind USING ERRCODE = '22023';
  END IF;

  SELECT * INTO subscription
    FROM commerce.subscriptions
   WHERE organization_id = p_organization_id AND id = p_subscription_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'subscription not found' USING ERRCODE = 'P0002';
  END IF;

  IF subscription.status = 'revoked' THEN
    RETURN subscription.status;
  END IF;

  IF p_kind = 'payment_succeeded' THEN
    IF p_amount_minor IS DISTINCT FROM subscription.amount_minor
       OR p_currency IS DISTINCT FROM subscription.currency THEN
      RAISE EXCEPTION 'provider payment does not match the subscription terms'
        USING ERRCODE = '23514';
    END IF;
    IF p_payment_key IS NULL THEN
      RAISE EXCEPTION 'payment key is required' USING ERRCODE = '22023';
    END IF;

    period_start := GREATEST(
      COALESCE(subscription.current_period_end, p_occurred_at),
      p_occurred_at
    );
    new_period_end := period_start + commerce.subscription_period(subscription.billing_period);

    INSERT INTO commerce.subscription_payments (
      organization_id, subscription_id, payment_key, amount_minor, currency, paid_at, period_end
    )
    VALUES (
      subscription.organization_id, subscription.id, p_payment_key,
      p_amount_minor, p_currency, p_occurred_at, new_period_end
    )
    ON CONFLICT (organization_id, payment_key) DO NOTHING
    RETURNING id INTO inserted_payment;

    IF inserted_payment IS NULL THEN
      RETURN subscription.status;
    END IF;

    UPDATE commerce.subscriptions
       SET status = CASE WHEN status = 'cancelled' THEN 'cancelled' ELSE 'active' END,
           current_period_end = new_period_end,
           activated_at = COALESCE(activated_at, p_occurred_at),
           updated_at = now()
     WHERE organization_id = subscription.organization_id AND id = subscription.id
     RETURNING * INTO subscription;

    INSERT INTO commerce.catalog_entitlements (
      organization_id, user_id, status, grant_source, source_subscription_id,
      granted_at, expires_at
    )
    VALUES (
      subscription.organization_id, subscription.user_id, 'active', 'subscription',
      subscription.id, now(), new_period_end + grace
    )
    ON CONFLICT (organization_id, user_id) DO UPDATE SET
      status = 'active',
      grant_source = 'subscription',
      source_subscription_id = EXCLUDED.source_subscription_id,
      granted_at = CASE
        WHEN commerce.catalog_entitlements.status = 'active'
             AND (commerce.catalog_entitlements.expires_at IS NULL
                  OR commerce.catalog_entitlements.expires_at > now())
        THEN commerce.catalog_entitlements.granted_at
        ELSE now()
      END,
      -- A manual grant without expiry stays without expiry.
      expires_at = CASE
        WHEN commerce.catalog_entitlements.status = 'active'
             AND commerce.catalog_entitlements.grant_source = 'manual'
             AND commerce.catalog_entitlements.expires_at IS NULL
        THEN NULL
        ELSE GREATEST(
          COALESCE(commerce.catalog_entitlements.expires_at, EXCLUDED.expires_at),
          EXCLUDED.expires_at
        )
      END,
      revoked_at = NULL,
      updated_at = now()
    RETURNING id INTO entitlement_id;

    INSERT INTO events.outbox (
      organization_id, event_name, event_version, aggregate_type, aggregate_id,
      actor_user_id, payload, metadata, idempotency_key
    )
    VALUES (
      subscription.organization_id, 'subscription.paid', 1, 'subscription', subscription.id,
      NULL,
      jsonb_build_object(
        'organizationId', subscription.organization_id,
        'subscriptionId', subscription.id,
        'userId', subscription.user_id,
        'amountMinor', p_amount_minor,
        'currency', p_currency,
        'billingPeriod', subscription.billing_period,
        'currentPeriodEnd', new_period_end,
        'catalogEntitlementId', entitlement_id
      ),
      '{}'::jsonb,
      'subscription-paid:' || subscription.organization_id::text || ':' || p_payment_key
    );

    RETURN subscription.status;
  END IF;

  IF p_kind = 'payment_failed' THEN
    IF subscription.status <> 'active' THEN
      RETURN subscription.status;
    END IF;
    UPDATE commerce.subscriptions
       SET status = 'past_due', updated_at = now()
     WHERE organization_id = subscription.organization_id AND id = subscription.id;
    INSERT INTO events.outbox (
      organization_id, event_name, event_version, aggregate_type, aggregate_id,
      actor_user_id, payload, metadata, idempotency_key
    )
    VALUES (
      subscription.organization_id, 'subscription.past_due', 1, 'subscription',
      subscription.id, NULL,
      jsonb_build_object(
        'organizationId', subscription.organization_id,
        'subscriptionId', subscription.id,
        'userId', subscription.user_id
      ),
      '{}'::jsonb, NULL
    );
    RETURN 'past_due';
  END IF;

  IF p_kind = 'cancelled' THEN
    IF subscription.status = 'cancelled' THEN
      RETURN subscription.status;
    END IF;
    UPDATE commerce.subscriptions
       SET status = 'cancelled',
           cancelled_at = p_occurred_at,
           -- A pending subscription that is cancelled was never paid: no period, no access.
           current_period_end = COALESCE(current_period_end, p_occurred_at),
           activated_at = COALESCE(activated_at, p_occurred_at),
           updated_at = now()
     WHERE organization_id = subscription.organization_id AND id = subscription.id;
    INSERT INTO events.outbox (
      organization_id, event_name, event_version, aggregate_type, aggregate_id,
      actor_user_id, payload, metadata, idempotency_key
    )
    VALUES (
      subscription.organization_id, 'subscription.cancelled', 1, 'subscription',
      subscription.id, NULL,
      jsonb_build_object(
        'organizationId', subscription.organization_id,
        'subscriptionId', subscription.id,
        'userId', subscription.user_id,
        'accessUntil', subscription.current_period_end
      ),
      '{}'::jsonb,
      'subscription-cancelled:' || subscription.id::text
    );
    RETURN 'cancelled';
  END IF;

  -- revoked: refund or chargeback.
  UPDATE commerce.subscriptions
     SET status = 'revoked',
         revoked_at = p_occurred_at,
         current_period_end = COALESCE(current_period_end, p_occurred_at),
         activated_at = COALESCE(activated_at, p_occurred_at),
         updated_at = now()
   WHERE organization_id = subscription.organization_id AND id = subscription.id;

  UPDATE commerce.catalog_entitlements
     SET status = 'revoked', revoked_at = now(), updated_at = now()
   WHERE organization_id = subscription.organization_id
     AND user_id = subscription.user_id
     AND source_subscription_id = subscription.id
     AND status = 'active';

  INSERT INTO events.outbox (
    organization_id, event_name, event_version, aggregate_type, aggregate_id,
    actor_user_id, payload, metadata, idempotency_key
  )
  VALUES (
    subscription.organization_id, 'subscription.revoked', 1, 'subscription',
    subscription.id, NULL,
    jsonb_build_object(
      'organizationId', subscription.organization_id,
      'subscriptionId', subscription.id,
      'userId', subscription.user_id
    ),
    '{}'::jsonb,
    'subscription-revoked:' || subscription.id::text
  );
  RETURN 'revoked';
END
$$;

REVOKE ALL ON FUNCTION commerce.apply_subscription_event(
  uuid, uuid, text, text, integer, text, timestamptz
) FROM PUBLIC;
-- No worker is hosted in production (ADR-0071): the API applies verified webhooks inline.
GRANT EXECUTE ON FUNCTION commerce.apply_subscription_event(
  uuid, uuid, text, text, integer, text, timestamptz
) TO platform_app;
GRANT EXECUTE ON FUNCTION commerce.subscription_period(text) TO platform_app;
