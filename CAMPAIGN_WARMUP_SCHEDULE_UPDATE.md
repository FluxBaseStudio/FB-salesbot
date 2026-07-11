# Campaign warm-up schedule update

Dodano kampanijny schedule warm-upu w panelu admina.

## Co się zmieniło

- W formularzu dodawania i edycji kampanii pojawił się blok **Schedule warm-upu kampanii**.
- Admin dodaje dowolną liczbę rubryk, np. `5 → 10 → 15 → 20 → 50` albo `25 → 50`.
- Każda rubryka oznacza kolejny dzień kampanii.
- Ostatnia rubryka staje się docelowym limitem dziennym i zapisuje się również jako `daily_limit`.
- Po dojściu do ostatniego progu kampania wysyła stale tę ostatnią wartość dziennie.
- Scheduler i limity bezpieczeństwa korzystają z `warmup_daily_limits`, a nie ze stałej sekwencji zaszytej w kodzie.
- Jeżeli schedule nie jest uzupełniony, walidacja zatrzymuje zapis kampanii zamiast podstawiać wartości domyślne.

## Baza danych

Dodano kolumnę:

```sql
alter table campaigns add column if not exists warmup_daily_limits jsonb;
```

W `supabase/schema.sql` dodano też migrację uzupełniającą stare kampanie pojedynczą wartością z `daily_limit`, żeby dotychczasowe rekordy nie straciły limitu.

## Weryfikacja

`npm run build` zakończył się sukcesem.
