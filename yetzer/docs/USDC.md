# USDC payments

Yetzer uses Stripe-hosted Checkout with USD prices and dynamic payment methods.
Cards and eligible USDC payments use the same purchase and verified-webhook flow.
The app does not custody cryptocurrency or request a wallet seed phrase.

## Required account activation

In the Stripe account used by this Worker's STRIPE_SECRET_KEY, open Settings >
Payment methods > Stablecoins and Crypto. Request access if needed and enable it
after Stripe approval. Code deployment cannot grant account eligibility.
No additional Worker secret, wallet address, Product ID or webhook URL is needed.

When eligible, Stripe displays Crypto and handles the wallet, token and network
selection. Existing USD ticket prices remain unchanged. Do not send funds directly
to Yetzer or assume every wallet or network is supported.

## Fulfillment

Keep checkout.session.completed and checkout.session.async_payment_succeeded
enabled for /api/webhooks/stripe. Only payment_status=paid grants a purchase.
The return page alone never grants access. The existing one-attempt policy,
purchase windows and deadlines continue to apply.

## Verification scope

Offline regression tests verify USD pricing, dynamic payment methods and existing
purchase checks. They do not verify account approval or a real USDC transaction.
Dashboard activation and actual Checkout availability must be checked separately.

Sources:
- https://docs.stripe.com/payments/accept-stablecoin-payments
- https://docs.stripe.com/payments/stablecoin-payments
- https://docs.stripe.com/payments/checkout/payment-methods
