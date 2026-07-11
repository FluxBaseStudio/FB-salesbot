# Stripe checkout brutto, strona netto

Zmiana: ceny na stronie pozostają komunikowane jako netto, ale Stripe Checkout dostaje kwoty brutto.

## Model

- Strona: pokazuje ceny netto, np. `1999 zł netto / mies.`
- Stripe Checkout: pokazuje kwotę brutto, np. `2458,77 zł`
- VAT: 23% zawarty w kwocie wysyłanej do Stripe
- `tax_behavior`: `inclusive`

## Kwoty brutto wysyłane do Stripe

- Trial: 250 zł netto -> 307,50 zł brutto
- Starter: 999 zł netto -> 1228,77 zł brutto
- Growth: 1999 zł netto -> 2458,77 zł brutto
- Pro: 3999 zł netto -> 4918,77 zł brutto
- Dodatkowa skrzynka: 1500 zł netto -> 1845,00 zł brutto

## ENV

Nadal nie trzeba dodawać żadnych `STRIPE_PRICE_*` ani `price_...` do env. Checkout używa `price_data`.

Wymagane pozostają:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
