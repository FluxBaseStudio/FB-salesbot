# Campaign polish, daily schedule and queue update

W tej wersji przebudowano dodawanie i edycję kampanii pod finalną logikę wysyłki dziennej.

## Najważniejsze zmiany

1. Usunięto ręczne pola przerw 30-90 sekund z formularzy kampanii.
2. Dodano jasne pole: `Docelowa liczba maili dziennie`.
3. Dodano podgląd harmonogramu w formularzu kampanii:
   - docelowy limit dzienny,
   - okno pracy, np. 06:00-16:00,
   - szacowany odstęp między mailami,
   - informację o warm-upie.
4. Worker domyślnie wysyła maksymalnie 1 mail na uruchomienie (`SEND_WORKER_BATCH_SIZE=1`).
5. Planner dodaje offset klientów, żeby wielu klientów nie startowało w tej samej minucie.
6. Tryb testowy planuje maksymalnie 3 wiadomości.
7. Follow-upy nie wysyłają się już bezpośrednio. Trafiają do `send_queue` i wysyła je worker.
8. Stary `campaignRunner.ts` został usunięty, żeby nie było dwóch konkurencyjnych logik wysyłki.
9. `safety_daily_cap`, `send_limit`, `send_delay_min_seconds` i `send_delay_max_seconds` zostały zdegradowane do pól kompatybilności. Aktualna logika opiera się na `daily_limit`, oknie pracy i kolejce.
10. Dodano zakładkę admina `Kolejka`, która pokazuje techniczne rekordy `pending`, `processing` i `failed`. Klient nadal widzi tylko realnie wysłane leady i wiadomości.

## Po wdrożeniu

W Supabase odpal:

```sql
supabase/schema.sql
```

W Vercel ustaw lub sprawdź:

```env
SEND_WORKER_BATCH_SIZE=1
SEND_QUEUE_MAX_ATTEMPTS=3
BOTSELLER_DISABLE_SEND_DELAY=true
MAIL_SEND_DELAY_MIN_SECONDS=0
MAIL_SEND_DELAY_MAX_SECONDS=0
WARMUP_DAILY_SEQUENCE=5,8,13,15,17
WARMUP_AFTER_SEQUENCE_STEP=5
WARMUP_STAGE_DAYS=1
```

Build został sprawdzony komendą `npm run build`.
