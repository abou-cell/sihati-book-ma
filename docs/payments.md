# Stripe payments

Sihati uses server-side Stripe Checkout for appointment payments. Payment state is always derived from authenticated server work and verified Stripe webhooks; browser redirects and query parameters are never trusted as proof of payment.

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Server-only Stripe API key used to create Checkout Sessions. |
| `STRIPE_WEBHOOK_SECRET` | Server-only signing secret used to verify `POST /api/stripe/webhook` raw payloads. |
| `NEXT_PUBLIC_APP_URL` | Base URL used to build Checkout success and cancel URLs. |

Both Stripe secrets are required in production by `lib/env.ts`. Keep them in the deployment secret manager and never expose them to client components.

## Checkout flow

1. A patient books an appointment. Video appointments are stored as `PENDING` until payment succeeds.
2. The patient calls `POST /api/payments/checkout` with `{ "appointmentId": "..." }`.
3. The route authenticates a patient session, applies same-origin and rate-limit checks, and validates the body with Zod.
4. `PaymentService` loads the appointment through `PrismaPaymentRepository` and verifies:
   - the appointment exists;
   - the authenticated patient owns it;
   - the appointment is still `PENDING`;
   - the appointment start time is in the future;
   - the server-side consultation reason has a positive price.
5. The service creates or reuses a `Payment` record with a deterministic server-side idempotency key.
6. Stripe Checkout is created with `STRIPE_SECRET_KEY`, appointment/payment metadata, and the same idempotency key.
7. The API returns the Stripe Checkout URL. The client should redirect the patient to Stripe and wait for webhook-driven status updates.

## Webhook flow

`POST /api/stripe/webhook` reads the raw request body with `request.text()` and verifies the `stripe-signature` header using `STRIPE_WEBHOOK_SECRET` before parsing or applying any state changes.

Handled events:

| Stripe event | Payment transition | Appointment transition |
| --- | --- | --- |
| `checkout.session.completed` | `SUCCEEDED` | `PENDING` → `CONFIRMED` |
| `payment_intent.succeeded` | `SUCCEEDED` | `PENDING` → `CONFIRMED` |
| `payment_intent.payment_failed` | `FAILED` | No appointment confirmation or cancellation |
| `checkout.session.expired` | `EXPIRED` | No appointment confirmation or cancellation |

Every Stripe event ID is recorded in `PaymentWebhookEvent` before payment mutation. Duplicate event IDs short-circuit safely and do not update the payment or appointment twice.

## Data model

The payment schema stores provider linkage and audit fields:

- `Payment.provider`
- `Payment.providerSessionId`
- `Payment.providerPaymentIntentId`
- `Payment.appointmentId`
- `Payment.userId`
- `Payment.amount`
- `Payment.currency`
- `Payment.status`
- `Payment.idempotencyKey`
- `Payment.rawProviderEventId`
- `Payment.createdAt` / `Payment.updatedAt`

`PaymentWebhookEvent.providerEventId` provides durable webhook idempotency for all processed Stripe event IDs.

## Local testing notes

Use Stripe test-mode keys only. To test webhooks locally, forward Stripe CLI events to `/api/stripe/webhook` and copy the generated `whsec_...` value into `.env.local`.

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Do not simulate success by writing client-side payment status. Use Stripe test cards or signed test webhook events so the server exercises signature verification and idempotency handling.
