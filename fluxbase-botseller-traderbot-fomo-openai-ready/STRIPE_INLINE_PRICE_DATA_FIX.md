# Stripe inline price_data fix

Ta wersja usuwa zależność checkoutu od katalogu cen Stripe.

Nie trzeba dodawać `STRIPE_PRICE_*`, `price_...`, `lookup_key` ani metadanych do ENV.
Checkout tworzy pozycje płatności przez `price_data` z kwot zapisanych w kodzie:

- Wersja próbna: 250 zł netto / 5 dni, payment
- Starter: 999 zł netto / mies., subscription
- Growth: 1999 zł netto / mies., subscription
- Pro: 3999 zł netto / mies., subscription
- Dodatkowa skrzynka / bot: 1500 zł netto / mies., subscription

W Vercel zostają tylko:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Poprawione endpointy:

- `app/api/stripe/checkout-session/route.ts`
- `app/api/client-portal/add-mailbox-checkout/route.ts`
