# ADR-0048: Paddle one-time payment-provider boundary

- Status: Accepted
- Date: 2026-10-01

## Context

ADR-0045 established the canonical Purchase and asynchronous payment-settlement vertical using Stripe Checkout as the first provider adapter. Nexus has no production customer/payment history, and the product decision is now to use Paddle as the payment provider and merchant of record.

The canonical Commerce model remains provider-independent:

`Product != Price != Purchase != Entitlement != Enrollment`

and external provider state must not become canonical Nexus state.

Paddle's transaction model differs from Stripe Checkout in several integration details. A Paddle automatic-collection transaction can carry a non-catalog price and product and expose a hosted checkout URL. Paddle does not expose an arbitrary create-idempotency key equivalent to the Stripe key previously anchored to Purchase identity. Paddle also owns tax calculation/remittance as merchant of record, and a completed transaction may contain tax and discount totals that are not the canonical Nexus Price amount.

## Decision

### Paddle replaces the active Stripe runtime adapter

Integrations owns the Paddle adapter. Commerce remains unchanged. Runtime checkout and webhook wiring use only Paddle; Stripe controllers/adapters/configuration are removed rather than retained as an unused compatibility path.

Forward-only database compatibility still permits historical `stripe` provider/event values introduced by migration 000033. This is migration safety, not an active runtime integration.

### Canonical Product and Price are not mirrored into a Paddle catalog

Checkout creates one automatic-collection Paddle transaction from the canonical Purchase terms. The transaction contains one non-catalog one-time price and inline product with quantity fixed to one.

The client never supplies amount, currency, tenant, Product, Offering, or Paddle identifiers. The existing Purchase command first pins the exact immutable Nexus Price and server-owned commercial terms; Integrations receives only that trusted checkout specification.

Paddle `custom_data` may carry Nexus Purchase/Organization ids for provider-side diagnostics, but webhook routing never trusts it. The only routing authority is the server-persisted mapping from `(provider, external transaction id)` to canonical Purchase and Organization.

### Checkout expiration is provider-optional

The payment-checkout mapping and public checkout response represent provider expiration as nullable. Paddle transaction checkout URLs do not provide the Stripe Checkout Session expiration contract that ADR-0045 initially assumed.

This changes only integration state/presentation. It does not change Purchase lifecycle.

### Tax remains external provider state

Nexus Price remains the provider-independent commercial amount in minor units. The generated Paddle price uses tax-exclusive pricing so Paddle can calculate the legally required tax in addition to the Nexus Price where applicable.

Settlement never compares Paddle tax-inclusive grand total with Purchase amount. The trusted normalized amount is Paddle transaction subtotal minus provider discount. Therefore tax does not alter canonical Price/Purchase amount, while a Paddle discount changes the normalized commercial amount and fails closed against the immutable Purchase terms.

Nexus does not introduce canonical tax or discount entities in this slice.

`PADDLE_TAX_CATEGORY` is deployment configuration because the correct Paddle tax category depends on the actual product classification/account setup. It is not caller input and is not stored as Commerce meaning.

### Provider creation is not falsely treated as idempotent

Paddle does not provide a general request idempotency key for transaction creation. Nexus therefore does not claim provider-side exactly-once creation.

The canonical Purchase remains idempotent by its existing client idempotency key. The persisted payment-checkout mapping remains unique per Purchase/provider and is the authority returned on retries/concurrent requests. External API creation still happens outside the PostgreSQL business transaction.

If the network outcome of transaction creation is ambiguous, an unused orphan Paddle draft transaction may exist. It is external provider state only and cannot settle or grant access unless its exact transaction id wins and is persisted in the trusted mapping.

### Completed transaction webhook is the settlement ingress

The Paddle endpoint accepts only signed raw-body `transaction.completed` events for automatic-collection transactions. Signature verification occurs before payload fields are trusted. The normalized event keeps only provider event id, transaction id, paid status, normalized commercial amount/currency, routing state, and payload hash.

Provider event id deduplicates durable ingress. Repeated external input follows:

`verify -> durable inbox -> idempotent async processing`

Unmapped events remain durable and may be reactivated when the exact trusted transaction mapping appears. The existing lease-fenced worker remains provider-neutral. Only normalized `paid` settlement whose amount/currency exactly match the canonical Purchase may atomically perform:

`Purchase pending -> paid + purchase-backed Entitlement`

No Enrollment is created automatically.

### Customer identity is not required for the first one-time-payment vertical

The current authenticated Nexus User/Membership is purchaser authority. Settlement routes by the trusted Purchase-to-transaction mapping, not by Paddle customer identity. No canonical or durable provider-customer mapping is introduced without a concrete product need.

### Refunds, adjustments, cancellations, and disputes remain a separate lifecycle decision

Paddle adjustments are the provider mechanism for refunds/credits, but supporting them correctly requires an explicit canonical decision about Purchase reversal history and the effect on an already granted Entitlement. That decision is not necessary to accept and settle the first one-time payment and is intentionally deferred to a coherent follow-up slice.

Before Nexus exposes production refund operations or promises automatic refund revocation, that follow-up must define and test the canonical lifecycle rather than treating provider state as truth.

## Consequences

- Canonical Commerce remains provider-independent.
- Paddle can collect one-time payments without duplicating Nexus Product/Price identity into a provider catalog.
- Merchant-of-record tax is isolated from canonical commercial terms.
- Provider discounts fail closed until Nexus explicitly models an allowed discount policy.
- Checkout creation remains outside database transactions without inventing a false exactly-once guarantee.
- Webhook settlement retains the existing durable inbox, trusted mapping, least-privilege worker, and atomic Purchase/Entitlement invariants.
- Stripe runtime code/configuration is removed; only forward-migration-compatible historical database values remain.
- Public checkout UI, success/cancel UX, refunds/adjustments, subscriptions, coupons/discount policy, and customer synchronization remain later slices.
