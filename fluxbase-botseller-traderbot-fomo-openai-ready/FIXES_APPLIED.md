# FluxBase BotSeller - poprawki w tej paczce

## Najważniejsze zmiany

1. Domknięto proces aktywacji zamówienia:
   - dodano `POST /api/signup-orders/[id]/convert`,
   - opłacone zamówienie `paid` można zamienić w klienta i kampanię,
   - system generuje login i jednorazowe hasło do panelu klienta,
   - zamówienie dostaje `converted_client_id`, `converted_campaign_id`, `converted_at` i status `converted`.

2. Dodano obsługę odrzucenia zamówienia:
   - `POST /api/signup-orders/[id]/reject`,
   - przycisk w panelu admina.

3. Naprawiono Vercel Cron:
   - `/api/cron/run-campaigns` obsługuje teraz `GET` i `POST`,
   - w `next.config.ts` ograniczono workerów builda do 1, żeby build nie wisiał na etapie `Collecting page data` w środowiskach z ograniczonym CPU.

4. Zabezpieczono dane zamówień:
   - panel admina nie pobiera już `smtp_pass_encrypted`, `smtp_pass_iv`, `smtp_pass_auth_tag` z `signup_orders`,
   - dodano `SIGNUP_ORDER_SAFE_SELECT`.

5. Dodano twardą walidację backendową formularza `/botseller`:
   - firma,
   - email,
   - branże,
   - opis firmy,
   - promowana usługa,
   - SMTP user,
   - SMTP pass przy Stripe Checkout,
   - Reply-To,
   - port SMTP,
   - zgodność pakietu Polska/Europa.

6. Połączono Stripe z klientem:
   - webhook aktualizuje również `client_accounts` po `invoice.paid`, `invoice.payment_failed` i `customer.subscription.deleted`,
   - klient przechowuje `plan_id`, `plan_name`, `daily_email_limit`, `monthly_email_limit`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`.

7. Usprawniono anulowanie subskrypcji:
   - panel klienta ustawia `cancel_requested`,
   - kampanie klienta są pauzowane,
   - jeśli klient ma `stripe_subscription_id`, system próbuje ustawić `cancel_at_period_end` w Stripe,
   - zdarzenie trafia do `audit_logs`.

8. Dodano blokadę równoległego uruchomienia kampanii:
   - nowe pola `locked_at` i `locked_by` w `campaigns`,
   - runner nie odpali tej samej kampanii drugi raz równolegle,
   - lock wygasa po 30 minutach.

9. Limity pakietów są egzekwowane w runnerze:
   - `daily_email_limit` klienta ogranicza `daily_limit`, `send_limit` i `safety_daily_cap` kampanii.

10. Dodano publiczny link rezygnacji:
    - endpoint `/unsubscribe`,
    - footer maila zawiera link wypisu oraz nadal informację o odpowiedzi `STOP`,
    - link dopisuje email/firme do `suppression_list`.

11. Poprawiono wyszukiwanie Europy:
    - miasta europejskie mają teraz kraj w nazwie, np. `Paris, France`, `Birmingham, United Kingdom`, żeby Google Places nie zgadywało lokalizacji.

12. Fallback AI jest bezpieczniejszy:
    - jeśli OpenAI nie zwróci poprawnej odpowiedzi, fallback dostaje niski score i wymaga ręcznej weryfikacji, zamiast automatycznie wysyłać generyczny mail.

## Supabase SQL

Po wgraniu tej paczki uruchom ponownie cały plik:

```txt
supabase/schema.sql
```

Dodaje nowe kolumny:

- `client_accounts.plan_id`,
- `client_accounts.plan_name`,
- `client_accounts.daily_email_limit`,
- `client_accounts.monthly_email_limit`,
- `client_accounts.stripe_customer_id`,
- `client_accounts.stripe_subscription_id`,
- `client_accounts.stripe_price_id`,
- `campaigns.locked_at`,
- `campaigns.locked_by`,
- `signup_orders.monthly_emails`,
- `signup_orders.converted_client_id`,
- `signup_orders.converted_campaign_id`,
- `signup_orders.converted_at`.

## Testy wykonane lokalnie

```bash
npm ci
npx tsc --noEmit
NEXT_TELEMETRY_DISABLED=1 npm run build
```

Status:

- TypeScript: OK
- Next build: OK
- Trasy Next.js wygenerowane poprawnie

## Ważne po wdrożeniu

1. Uzupełnij `.env.local`.
2. Uruchom `supabase/schema.sql`.
3. Skonfiguruj produkty Stripe i webhook.
4. Przetestuj flow:
   - `/botseller`,
   - płatność Stripe,
   - webhook ustawia `paid`,
   - admin klika `Aktywuj`,
   - system tworzy klienta i kampanię,
   - admin przekazuje klientowi login i hasło,
   - admin testuje SMTP,
   - dopiero potem włącza normalne auto-send.
