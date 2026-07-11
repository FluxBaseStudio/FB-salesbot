# Warm-up i limit miesięczny kampanii

W tej wersji poprawiono logikę warm-upu oraz limitów miesięcznych.

## Najważniejsze zmiany

1. Warm-up jest realnym celem dziennym planowania:
   - dzień 1: 5 maili,
   - dzień 2: 10 maili,
   - dzień 3: 15 maili,
   - dalej co 5 aż do docelowego limitu kampanii, np. 50.

2. Dodano pole `monthly_limit` w kampanii.
   - Domyślnie: 1500 maili miesięcznie.
   - Można je ustawić w formularzu dodawania i edycji kampanii.
   - Limit kampanii jest nadrzędny dla planowania tej kampanii, więc błędny limit klienta typu `1` nie zablokuje warm-upu 5/10/15.

3. Kolejka liczy wiadomości `awaiting_approval`, `pending` i `processing`, żeby bot nie planował ponad dzienny i miesięczny cel.

4. Jeśli bot nie dobije dziennego celu, run pokaże powód w logu `under_target`.

## Wymagana migracja Supabase

Wklej najnowszy `supabase/schema.sql` w Supabase SQL Editor. Kluczowa kolumna:

```sql
alter table campaigns add column if not exists monthly_limit int not null default 1500;
update campaigns set monthly_limit = 1500 where monthly_limit is null or monthly_limit < 5;
```

