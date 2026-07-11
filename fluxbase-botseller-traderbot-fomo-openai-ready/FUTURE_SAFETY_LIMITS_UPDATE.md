# FluxBase BotSeller – opóźnienia, limity, inbox checker, warm-up i globalna blacklist

Ta paczka dodaje pięć zabezpieczeń pod przyszłą automatyczną wysyłkę.

## 1. Opóźnienie między mailami

Bot nie wysyła już wiadomości jedna po drugiej bez przerwy. Po udanej wysyłce robi losową pauzę.

Domyślnie:

```env
MAIL_SEND_DELAY_MIN_SECONDS=30
MAIL_SEND_DELAY_MAX_SECONDS=90
```

Można wyłączyć na testach:

```env
BOTSELLER_DISABLE_SEND_DELAY=true
```

W panelu kampanii można ustawić minimalną i maksymalną przerwę w sekundach.

## 2. Twardy miesięczny limit

Bot sprawdza `client_accounts.monthly_email_limit` przed każdą wysyłką.

Jeżeli klient ma np. 600 maili miesięcznie, system nie wyśle 601 wiadomości. Limit liczy wiadomości ze statusem:

- `sent`
- `delivered`
- `opened`
- `replied`
- `follow_up_sent`
- `bounced`
- `spam`
- `unsubscribed`

Czyli liczymy każdą realnie wysłaną wiadomość, nawet jeśli później był bounce albo spam complaint.

## 3. Inbox checker

Przed wysłaniem follow-upa bot może sprawdzić skrzynkę klienta przez IMAP.

Jeżeli znajdzie odpowiedź od odbiorcy, ustawia wiadomość jako `replied` i nie wysyła follow-upa.

Domyślne ENV:

```env
INBOX_CHECKER_ENABLED=true
INBOX_CHECKER_LOOKBACK_DAYS=14
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
```

Dla Gmaila najczęściej działa to na tym samym loginie i haśle aplikacji, którego używasz do SMTP. W Gmailu musi być włączony IMAP.

Jeśli odpowiedź zawiera np. `STOP`, `wypisz`, `unsubscribe`, `nie kontaktuj`, bot dodaje adres/domenę do globalnej blacklisty.

## 4. Warm-up domeny / skrzynki

Bot ogranicza dzienną wysyłkę według wieku klienta/warm-upu.

Domyślnie:

```env
WARMUP_DAILY_LIMITS=20,40,80
WARMUP_STAGE_DAYS=7
```

Przykład działania:

- dni 1-7: maks. 20 maili dziennie,
- dni 8-14: maks. 40 maili dziennie,
- od dnia 15: maks. 80 maili dziennie,
- ale nigdy więcej niż limit planu klienta.

Nowe kolumny w `client_accounts`:

- `warmup_enabled`
- `warmup_started_at`
- `warmup_stage_days`

## 5. Globalna blacklist

Tabela `suppression_list` obsługuje teraz globalną blokadę przez `client_id = null`.

Do globalnej blacklisty trafia:

- bounce,
- spam complaint,
- unsubscribe,
- odpowiedź typu STOP wykryta przez inbox checker.

Efekt: jeśli ktoś raz trafi na globalną blokadę, bot nie weźmie go do żadnej kolejnej kampanii.

## Po wdrożeniu

1. Odpal w Supabase:

```txt
supabase/schema.sql
```

2. Dodaj ENV w Vercel:

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

3. Zrób ponowny deploy w Vercel.
