# FluxBase BotSeller - finalna checklista przed Vercel

## 1. Lokalnie przed pushem

```bash
npm ci
npm run predeploy
```

`predeploy` odpala:

```bash
npm test
npm run typecheck
npm run build
```

Jeżeli którykolwiek krok padnie, nie wrzucaj deploya.

## 2. Vercel plan

Dla crona co minutę użyj Vercel Pro. `vercel.json` ma:

```json
{
  "path": "/api/cron/run-campaigns",
  "schedule": "* * * * *"
}
```

To jest celowe: Vercel puka co minutę, a scheduler w backendzie decyduje, czy kampania naprawdę ma teraz działać.

## 3. Zmienne ENV w Vercel

Skopiuj listę z `.env.example` do Vercel → Project → Settings → Environment Variables.

Najważniejsze wymagane:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAILS
CRON_SECRET
SECRET_ENCRYPTION_KEY
OPENAI_API_KEY
GOOGLE_PLACES_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_BASE_URL
NEXT_PUBLIC_SITE_URL
```

Google Search jest opcjonalny, ale mocno pomaga email finderowi:

```txt
GOOGLE_SEARCH_API_KEY
GOOGLE_SEARCH_CX albo GOOGLE_SEARCH_ENGINE_ID
```

## 4. Supabase

Przed produkcją uruchom SQL z:

```txt
supabase/schema.sql
```

Sprawdź, czy istnieją tabele:

```txt
client_accounts, campaigns, bots, leads, messages, send_queue, run_logs, system_locks, admin_notifications, suppression_list, api_credentials
```

## 5. Pierwszy deploy

Po pushu sprawdź:

```txt
Vercel → Deployments → najnowszy deployment → Build Logs
```

Build musi przejść bez błędów.

## 6. Po deployu w panelu admina

1. Wejdź w `/admin`.
2. Zakładka `Operacje`.
3. Kliknij `Health check`.
4. Napraw wszystko, co nie jest OK.
5. Utwórz klienta/kampanię albo skonwertuj zamówienie.
6. Przypisz bota.
7. Uzupełnij obowiązkowo:
   - daily limit przez warm-up,
   - godziny pracy,
   - timezone,
   - target,
   - lokalizacje,
   - SMTP,
   - podpis kampanii.
8. Kliknij `Przetestuj konfigurację`.
9. Kliknij `Znajdź 1 leada testowo`.
10. Dopiero wtedy ustaw kampanię jako aktywną.

## 7. Crony do obserwacji

W Vercel Logs filtruj:

```txt
/api/cron/run-campaigns
/api/cron/send-worker
/api/cron/followups
/api/cron/cleanup-orders
```

Status 200 oznacza, że endpoint odpowiedział poprawnie. Jeżeli bot nic nie wysyła, sprawdź `run_logs`, `send_queue`, `admin_notifications` i Health Check.

## 8. Operacyjna zasada bezpieczeństwa

Nie aktywuj kampanii bez realnego testu leada. Ten projekt jest przygotowany pod model managed service: FluxBase sprawdza target i jakość przed wysyłką.
