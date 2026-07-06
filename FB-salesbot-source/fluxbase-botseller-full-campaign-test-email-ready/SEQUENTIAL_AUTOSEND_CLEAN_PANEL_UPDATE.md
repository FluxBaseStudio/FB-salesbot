# Aktualizacja: kolejka kampanii, auto-send i czysty panel

## Co zmieniono

1. **Cron kampanii działa sekwencyjnie**
   - endpoint `/api/cron/run-campaigns` zakłada globalną blokadę `campaign-runner`,
   - jeśli jeden run już działa, drugi cron nie odpali równoległej paczki,
   - kampanie są wykonywane po kolei, bez `Promise.all`: pierwsza kończy pracę, potem startuje druga.

2. **Brak szkiców w panelu**
   - BotSeller działa teraz w trybie automatycznej wysyłki,
   - `auto_send_enabled` jest wymuszane jako `true`,
   - przyciski i pola ręcznej auto-akceptacji zostały ukryte z UI.

3. **Panel zapisuje tylko realnie wysłane rekordy**
   - firmy bez emaila są pomijane i nie pojawiają się w leadach,
   - wiadomości niewysłane, szkice i błędy nie są pokazywane w panelu,
   - po błędzie SMTP lead i wiadomość są usuwane z panelu, a email/domena trafia na suppression list.

4. **Follow-up bez śmietnika**
   - follow-up jest tworzony i wysyłany automatycznie,
   - jeśli wysyłka follow-upa się nie uda, niewysłany follow-up jest usuwany z panelu.

5. **Widoki admina i klienta są filtrowane**
   - leady widoczne w panelach mają status `sent`,
   - wiadomości widoczne w panelach mają statusy po wysyłce: `sent`, `delivered`, `opened`, `replied`, `follow_up_sent`, `bounced`, `spam`, `unsubscribed`.

## Nowa tabela w Supabase

Dodano tabelę `system_locks`, która pilnuje, żeby kilka cronów kampanii nie działało równolegle.

Po wdrożeniu uruchom w Supabase SQL Editor:

```sql
supabase/schema.sql
```

Opcjonalnie, jeśli chcesz usunąć stare szkice i stare niewysłane rekordy z poprzednich wersji, uruchom:

```sql
supabase/cleanup-panel-no-drafts.sql
```

## Nowa zmienna środowiskowa

Opcjonalna:

```env
CAMPAIGN_CRON_BATCH_SIZE=10
```

Oznacza maksymalną liczbę kampanii, które jeden cron może obsłużyć po kolei w jednym wywołaniu.
