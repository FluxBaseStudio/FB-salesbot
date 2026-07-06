# FluxBase BotSeller Admin - Stripe + design cleanup

Wersja zawiera:

- usunięte publiczne wyświetlanie szacunkowych kosztów AI,
- publiczną stronę `/botseller` z płatnością przez Stripe Checkout,
- endpoint `POST /api/stripe/checkout-session`,
- endpoint webhooka `POST /api/stripe/webhook`,
- nowe pola Stripe w `signup_orders`,
- poprawiony widok Billing i Zamówienia,
- ceny pakietów bez pokazywania kosztów wewnętrznych,
- build/TypeScript sprawdzone.

## Uruchomienie

```powershell
cd C:\Users\admin\source\repos\fluxbase-botseller-admin-stripe-design
npm install
npm run dev
```

Admin:

```txt
http://localhost:3000
```

Publiczna strona zamówienia:

```txt
http://localhost:3000/botseller
```

Panel klienta:

```txt
http://localhost:3000/client/login
```

## .env.local

Skopiuj `.env.example` jako `.env.local` i uzupełnij:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SECRET_ENCRYPTION_KEY=
ADMIN_EMAILS=office@fluxbase.pl
CRON_SECRET=
CLIENT_PORTAL_SECRET=
NEXT_PUBLIC_BASE_URL=http://localhost:3000

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_POLAND_STARTER=
STRIPE_PRICE_POLAND_GROWTH=
STRIPE_PRICE_POLAND_PRO=
STRIPE_PRICE_EUROPE_SCALE=
```

## Supabase SQL

Uruchom w Supabase cały plik:

```txt
supabase/schema.sql
```

Dodaje między innymi pola:

- `stripe_checkout_session_id`,
- `stripe_customer_id`,
- `stripe_subscription_id`,
- `stripe_payment_status`,
- `stripe_price_id`,
- `paid_at`,
- `payment_error`.

## Produkty Stripe do utworzenia

Utwórz w Stripe cztery produkty z cenami miesięcznymi recurring.

### 1. BotSeller Polska Starter

Cena: `79900` groszy, waluta `PLN`, recurring monthly.

Metadata produktu i ceny:

```txt
plan_id=poland-starter
scope=poland
daily_emails=20
monthly_emails=600
lookup_key=botseller_poland_starter_monthly
```

Po utworzeniu ceny wklej Price ID do:

```env
STRIPE_PRICE_POLAND_STARTER=price_...
```

### 2. BotSeller Polska Growth

Cena: `119900` groszy, waluta `PLN`, recurring monthly.

Metadata:

```txt
plan_id=poland-growth
scope=poland
daily_emails=30
monthly_emails=900
lookup_key=botseller_poland_growth_monthly
```

Env:

```env
STRIPE_PRICE_POLAND_GROWTH=price_...
```

### 3. BotSeller Polska Pro

Cena: `159900` groszy, waluta `PLN`, recurring monthly.

Metadata:

```txt
plan_id=poland-pro
scope=poland
daily_emails=40
monthly_emails=1200
lookup_key=botseller_poland_pro_monthly
```

Env:

```env
STRIPE_PRICE_POLAND_PRO=price_...
```

### 4. BotSeller Europe Scale

Cena: `239900` groszy, waluta `PLN`, recurring monthly.

Metadata:

```txt
plan_id=europe-scale
scope=europe
daily_emails=50
monthly_emails=1500
lookup_key=botseller_europe_scale_monthly
```

Env:

```env
STRIPE_PRICE_EUROPE_SCALE=price_...
```

## Stripe webhook

Dodaj webhook w Stripe do endpointu:

```txt
https://twoja-domena.pl/api/stripe/webhook
```

Eventy:

```txt
checkout.session.completed
invoice.paid
invoice.payment_failed
customer.subscription.deleted
```

Webhook signing secret wklej do:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Test

1. Wejdź na `/botseller`.
2. Wybierz pakiet.
3. Wypełnij formularz.
4. Kliknij „Przejdź do płatności Stripe”.
5. Po opłaceniu webhook ustawi zamówienie jako `paid`.
6. W adminie sprawdź zakładkę `Zamówienia`.

## Sprawdzenie kodu

W tej paczce sprawdzono:

```powershell
npx tsc --noEmit
npm run build
```

`npm run build` zakończył kompilację, wygenerował strony i wypisał trasy Next.js poprawnie.

## Aktualizacja: landing page + styl OpenAI + dokumenty prawne

Dodano publiczną stronę główną pod adresem `/` w stylu minimalistycznego panelu AI, z odnośnikami:

- `/botseller` - założenie własnego SalesBota i Stripe Checkout,
- `/client/login` - logowanie do panelu klienta,
- `/admin` - panel administratora,
- `/regulamin`, `/polityka-prywatnosci`, `/rodo`, `/cookies` - podstrony prawne.

Dodano również banner cookies, footer z legendą odnośników oraz odświeżony styl panelu admina, panelu klienta i formularza `/botseller`.

Build sprawdzony komendą:

```powershell
npm run build
```

Status: przechodzi poprawnie.


## Aktualizacja: wersja naprawiona

Ta paczka zawiera poprawki opisane w pliku `FIXES_APPLIED.md`.

Najważniejsze: po płatności Stripe zamówienie można aktywować w panelu admina. Aktywacja tworzy konto klienta, kampanię, limity pakietu i dane logowania do panelu klienta. Dodano też bezpieczniejszy odczyt zamówień, walidację backendową formularza, obsługę GET dla Vercel Cron, lock równoległego runu kampanii, powiązanie Stripe z klientem oraz publiczny link rezygnacji `/unsubscribe`.

Po wdrożeniu uruchom ponownie cały plik `supabase/schema.sql`, ponieważ dodano nowe kolumny do `client_accounts`, `campaigns` i `signup_orders`.

## Aktualizacja: bezpieczeństwo automatycznej wysyłki

Najnowsza wersja BotSellera ma dodatkowe zabezpieczenia: losową przerwę między mailami, twardy miesięczny limit klienta, warm-up dziennych limitów, inbox checker przed follow-upem oraz globalną blacklistę dla STOP/bounce/spam/unsubscribe.

Najważniejsze ENV:

```env
MAIL_SEND_DELAY_MIN_SECONDS=30
MAIL_SEND_DELAY_MAX_SECONDS=90
WARMUP_DAILY_LIMITS=20,40,80
WARMUP_STAGE_DAYS=7
INBOX_CHECKER_ENABLED=true
INBOX_CHECKER_LOOKBACK_DAYS=14
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
```

Po wrzuceniu kodu odpal ponownie `supabase/schema.sql` i zrób redeploy w Vercel.
