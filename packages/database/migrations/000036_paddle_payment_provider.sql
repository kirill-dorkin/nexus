-- F9.5: migrate the external payment boundary from Stripe Checkout to Paddle
-- transactions without changing canonical Commerce identities or lifecycle.

ALTER TABLE integrations.payment_checkouts
  ALTER COLUMN expires_at DROP NOT NULL;

ALTER TABLE integrations.payment_checkouts
  DROP CONSTRAINT payment_checkouts_provider_key_check;

ALTER TABLE integrations.payment_checkouts
  ADD CONSTRAINT payment_checkouts_provider_key_check
  CHECK (provider_key IN ('stripe', 'paddle'));

ALTER TABLE integrations.payment_webhook_inbox
  DROP CONSTRAINT payment_webhook_inbox_provider_key_check;

ALTER TABLE integrations.payment_webhook_inbox
  ADD CONSTRAINT payment_webhook_inbox_provider_key_check
  CHECK (provider_key IN ('stripe', 'paddle'));

ALTER TABLE integrations.payment_webhook_inbox
  DROP CONSTRAINT payment_webhook_inbox_event_type_check;

ALTER TABLE integrations.payment_webhook_inbox
  ADD CONSTRAINT payment_webhook_inbox_event_type_check
  CHECK (event_type IN (
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'transaction.completed'
  ));

COMMENT ON COLUMN integrations.payment_checkouts.expires_at IS
  'Provider checkout expiration when the provider exposes one; NULL otherwise.';
