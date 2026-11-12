# ADR-0087: Subscription access to the home catalog

- Status: Accepted (owner, 2026-11-13). Prices are data and stay open; lava.top support answers are pending for slice 3
- Date: 2026-11-12
- Extends: ADR-0014 (Entitlement), ADR-0044 (Product and immutable Price), ADR-0048 (provider boundary)
- Related: ADR-0071 (no worker host in production), ADR-0086 (funnel events)

## Context

The owner wants revenue as soon as possible: short videos lead to free lessons, and learners pay for a monthly or yearly subscription. The audience speaks Russian and pays mostly with Russian bank cards. The owner lives in Kyrgyzstan and has no Russian legal entity.

What exists today does not cover this:

- **Paddle** (ADR-0048) does one-time payments only and does not accept Russian cards. Foreign merchants cannot charge Russian cards recurrently since 2022.
- **A Product targets exactly one Offering** (ADR-0044), and an **Entitlement grants one Offering** (ADR-0014). A subscription must open every course of the home organization, including courses published later.
- **Entitlement is checked only when an Enrollment is created** (ADR-0014 §4). All 23 home courses are free (`accessMode = membership`), and their practice and quiz checks are open to any signed-in learner.
- **No worker runs in production** (ADR-0071). Webhook settlement that waits for the lease-fenced Paddle processor would never run there.

The chosen provider is **lava.top**: rubles by Russian cards and SBP, US dollars and euros by foreign cards and PayPal, subscriptions billed monthly, every 90 or 180 days, or yearly, payouts abroad. Its API (`gate.lava.top`, OpenAPI 3) works as follows:

- `POST /api/v3/invoice` (`email`, `offerId`, `currency`, `periodicity`, `clientUtm`, return URLs) returns a contract `id` and a `paymentUrl`.
- Webhooks are protected by HTTP Basic or an `X-Api-Key` header that the author configures. The payload is not signed.
- Webhook events:
  - `payment.success` / `payment.failed` for the first payment, with `contractId`;
  - `subscription.recurring.payment.success` / `.failed` for renewals, with `parentContractId`;
  - `subscription.cancelled`, refund and chargeback events.
- `DELETE /api/v1/subscriptions` cancels a subscription.

## Decision

### 1. Subscription plans are their own Commerce aggregate

A subscription plan opens every public Offering of the organization, now and later. It does not fit `CommerceProduct`: a Product targets exactly one Offering, and Paddle checkout and the public catalog depend on that. So subscriptions get their own tables in Commerce, under the same rules as ADR-0044:

- `commerce.subscription_plans`: slug, name, `active → archived`.
- `commerce.subscription_plan_prices`: amount in minor units, currency, `billingPeriod`, `active → archived`.
  - `billingPeriod` is `month`, `days_90` or `year`.
  - There is one active price per plan, currency and period.
  - Terms are immutable: a trigger and column grants allow only archiving. Raising the price archives the old price and creates a new one.

A subscription copies amount, currency and period when it starts, and a trigger checks that they equal an active price. This is how an early subscriber keeps the launch price, the «цена основателя». Whether lava.top also keeps the old amount on renewal is one of the questions to support. If it does not, the launch price needs its own lava offer.

### 2. Subscription is a Commerce aggregate; access is still an Entitlement

`commerce.subscriptions` is canonical and does not depend on the provider. Each applied provider payment is a row in `commerce.subscription_payments`, unique per payment key, so a repeated webhook cannot extend the period twice. A subscription holds:

- the user, the organization, the Product and the Price;
- `status`: `pending → active ⇄ past_due → cancelled | revoked`. A cancelled subscription simply runs out; there is no separate ended state;
- `currentPeriodEnd`;
- `startedAt`, `cancelledAt`.

Access goes through the existing Entitlement model:

- Access is a `commerce.catalog_entitlements` row: one per learner and organization, source `subscription` or `manual`, `expiresAt = currentPeriodEnd + grace`. A manual grant without expiry, for example for testers, stays without expiry.
- `grace` is 2 days. lava.top retries a failed renewal after 8 h and 24 h.
- A renewal extends the same Entitlement (ADR-0014 §3). Expiry needs no background job.
- **Cancelling** keeps access until `expiresAt`, and nothing more is charged.
- **A refund or chargeback** sets the subscription to `revoked` and the Entitlement to `revoked` in the same transaction. This is the reversal decision that ADR-0048 deferred, made here for subscriptions only. Refunds of one-time Purchases stay deferred.
- `Subscription != Entitlement != Enrollment` still holds. Paying never creates an Enrollment, and an expired subscription never cancels an Enrollment.

### 3. Trial: seven days of full access, no card

A learner gets full access for **7 days from account creation**. The trial is computed and stored nowhere: Commerce reads `createdAt` through the Identity public user query. There is one trial per account. The trial is not a Subscription and not a payment.

### 4. What is free and what needs access

| Free for everyone, also anonymous | Free for signed-in learners | Needs a subscription or the trial |
|---|---|---|
| the theory of every lesson (public pages stay public: search and video landing) | practice, quizzes and assignments of the **first chapter** of each course | quiz checks and assignment submissions in later chapters; confirming skills from them |

- In-browser practice (challenges, concept cards, SQL) stays free and is never Evidence (ADR-0064). The paywall covers what records progress.
- The check is a new runtime policy, which ADR-0014 §4 required to be explicit. Delivery asks Commerce through a new `CatalogAccessQuery(user, organization, at) → { access: "subscription" | "trial" | "none", until }`.
- Before a quiz check or an assignment submission outside the first chapter, the server answers **402** `{ "reason": "subscription_required" }`. Nothing is evaluated and no Attempt is created.
- Web shows the paywall in place, with the learner's progress, and emits `paywall_viewed` (ADR-0086).
- Evidence already recorded is never removed. Mastery, freshness and the characters still show it after a subscription ends.
- Organizations other than the home one keep their current behaviour.

### 5. Checkout

The learner is signed in and calls `POST /v1/me/subscriptions/checkout { priceId }`:

1. Commerce pins the Price and creates a `pending` Subscription in one transaction. Idempotency follows the existing Purchase rules.
2. Integrations calls `POST /api/v3/invoice` outside the transaction. The call carries:
   - the learner's email, which lava.top requires;
   - the lava `offerId` for that Price, from deployment configuration;
   - `periodicity`;
   - `clientUtm` from the first visit;
   - return URLs to `/me/subscription`.
3. Integrations stores the trusted mapping `(lava, contractId) → Subscription`. Only this mapping routes webhooks. The email and product title in the payload are never trusted for routing.
4. Web redirects to `paymentUrl`. The return page is not proof of payment (ADR-0051). It waits for the subscription to become `active`.

### 6. Webhooks settle inline, because no worker is hosted

`POST /v1/integrations/lava/webhooks`:

1. Compares `X-Api-Key` in constant time with `LAVA_WEBHOOK_SECRET`. Basic auth is not used. Anything else gets 401 and is not stored.
2. Stores the event in the Integrations inbox, deduplicated by a hash of `eventType + contractId + parentContractId + timestamp`.
3. **In the same request and transaction**, routes the event through the trusted mapping and applies it:
   - `payment.success` → `active`, grant;
   - `subscription.recurring.payment.success` → extend;
   - `*.failed` → `past_due`, no change to access;
   - `subscription.cancelled` → `cancelled`;
   - refund or chargeback → `revoked`, revoke.

   It also checks that amount and currency match the pinned Price. On a mismatch it fails closed and leaves the event in the inbox (ADR-0048).
4. Answers 200 only after commit. An unmapped event stays in the inbox and answers 200, as with Paddle.

This does not use the lease-fenced processor of ADR-0048. That processor has no host in production (ADR-0071). The inbox still holds every event for audit and reprocessing. If a worker host appears later, settlement can move there without changing canonical state.

### 7. Cancelling

`/me/subscription` shows the plan, the next charge and a «Отменить подписку» button. The button calls `DELETE /api/v1/subscriptions` at lava.top and then waits for the `subscription.cancelled` webhook. Cancelling in one click is part of the offer.

### 8. Configuration and secrets (owner)

- `LAVA_API_KEY` — the author's API key, for creating invoices and cancelling.
- `LAVA_WEBHOOK_SECRET` — the value configured in lava.top for `X-Api-Key`.
- `LAVA_OFFERS` — a JSON map from Nexus Price id to lava `offerId`.

All three live in Vercel Production only. Without them, checkout answers 503 and the paywall says that subscriptions are not open yet. Previews and CI use a fake adapter (ADR-0052 test seams).

### 9. Legal

Before launch:

- The terms gain an auto-renewal section: price, period, how to cancel, refunds.
- Checkout shows a separate checkbox, «Согласен на автоматическое продление», recorded like the registration consents (ADR-0083).
- The privacy policy names lava.top (Lavalane LTD, Cyprus) as a processor of email and payment data.

The texts are the owner's decision. The agent drafts them.

## Consequences

- Revenue does not need a Russian legal entity. The cost is lava.top's commission (about 8 %, to be confirmed) and dependence on a Cyprus intermediary. The provider stays behind the Integrations adapter, so switching later to ЮKassa, CloudPayments or Robokassa (with a Russian ИП) changes only the adapter.
- Public lesson pages stay public, so search traffic and video landings are not hurt. The paywall appears only where progress is recorded.
- Migration `000056_subscriptions.sql` adds plans, plan prices, subscriptions, subscription payments, catalog entitlements and `commerce.apply_subscription_event(...)`. The function is `SECURITY DEFINER`; the application role may execute it because no worker is hosted. The lava mapping and inbox come with slice 3. All of it is additive.
- An unsigned webhook is protected only by a shared secret over HTTPS. The secret is long, random and rotatable; amount and currency are checked against the pinned Price; routing uses only our own mapping.
- Funnel: `paywall_viewed`, `checkout_started` and `subscription_activated` join the ADR-0086 events.

## Implementation slices

1. Migration and Commerce: plans and immutable prices (operator endpoints under `commerce.manage`), subscriptions, `apply_subscription_event`, catalog entitlements, `CatalogAccessQuery` with the trial and `GET /v1/me/access/{organizationSlug}`.
2. Delivery policy: 402 on quiz checks and assignment submissions outside the first chapter; the Web paywall.
3. Integrations: lava.top adapter (invoice, cancel, inline webhook settlement), `/me/subscription`, checkout pages, legal texts.
4. Owner: create the lava products and offers, put the secrets in Vercel, set the webhook URL and secret in lava.top, approve the legal texts, buy a subscription once with a real card and cancel it.

## Alternatives considered

- **Paddle subscriptions.** Rejected: Paddle does not accept Russian cards.
- **ЮKassa, CloudPayments, Robokassa, Prodamus.** Need a Russian legal entity, an ИП or a self-employed status. They become the better choice if the owner registers one.
- **Tribute (Telegram).** Access would live in Telegram, not on the site, and the commission is about 10 %.
- **Closing whole lessons.** Rejected: it hides the theory from search and from people arriving from a video, the top of the funnel.
- **A per-course subscription.** Rejected: a single catalog subscription is simpler to sell and fits a route through 23 courses.
- **A trial with a card.** It may convert better, but lava.top's API has no trial period. It can be revisited if the provider adds one.
