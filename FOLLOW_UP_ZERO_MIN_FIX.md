# Follow-up 0 min fix

Zmiana pozwala ustawić minimalną liczbę follow-upów na `0`.

## Co poprawiono

- Pole `Maks. follow-upów` w formularzach kampanii ma teraz `type=number`, `min=0`, `max=5`.
- Dodano podpowiedź `0 = brak follow-upów`.
- Walidacja aplikacji przyjmuje zakres `0-5`.
- Domyślna wartość dla nowej kampanii ustawiona na `0`, więc brak follow-upów jest poprawną wartością bazową.
- Logika wysyłki już wcześniej respektowała `0`, bo nie planuje kolejnego follow-upu, gdy `max_follow_ups <= currentCount`.

## Ważne dla Supabase

W schemacie baza ma constraint `campaigns_max_follow_ups_check check (max_follow_ups between 0 and 5)`. Jeśli produkcyjna baza była utworzona ze starszej wersji i nadal blokuje `0`, odpal w Supabase SQL editor:

```sql
alter table campaigns drop constraint if exists campaigns_max_follow_ups_check;
alter table campaigns add constraint campaigns_max_follow_ups_check check (max_follow_ups between 0 and 5);
```
