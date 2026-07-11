# Follow-up toggle update

Dodano osobny przełącznik follow-upów w konfiguracji kampanii.

## Co się zmieniło

- Dodano pole `follow_ups_enabled` w kampaniach.
- Kampania może mieć follow-upy wyłączone bez ustawiania `max_follow_ups = 0`.
- `max_follow_ups` ma zakres `1–5`, więc działa także na bazach, które blokują wartości `0`.
- Planowanie follow-upu po wysłaniu pierwszego maila działa tylko wtedy, gdy `follow_ups_enabled = true`.
- Cron follow-upów pomija kampanie z wyłączonymi follow-upami i czyści `follow_up_due_at`.
- Panel admina pokazuje przełącznik: „Włącz follow-upy dla tej kampanii”.
- Panel klienta pokazuje, czy follow-upy są ON/OFF.

## Ważne: SQL do Supabase

Przed wdrożeniem albo zaraz po wdrożeniu odpal w Supabase SQL Editor:

```sql
alter table campaigns add column if not exists follow_ups_enabled boolean not null default false;

update campaigns
set follow_ups_enabled = false
where follow_ups_enabled is null;
```

Jeżeli produkcyjna baza nadal blokuje `max_follow_ups = 0`, nie trzeba już tego ruszać. Od teraz wyłączenie follow-upów odbywa się przez `follow_ups_enabled = false`, a liczba follow-upów może zostać większa od 0.

## Sprawdzone

- `npm run typecheck`
- `npm test`
- `npm run build`
