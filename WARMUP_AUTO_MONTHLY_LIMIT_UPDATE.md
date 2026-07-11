# Warm-up + automatyczny limit miesięczny kampanii

Wprowadzono poprawkę logiki limitów kampanii:

1. `monthly_limit` w kampanii jest opcjonalny.
   - puste pole = limit automatyczny,
   - wpisana liczba = ręczny limit miesięczny tej kampanii.

2. Automatyczny limit miesięczny liczy realny miesiąc kalendarzowy.
   - lipiec ma 31 dni,
   - czerwiec ma 30 dni,
   - luty ma 28/29 dni.

3. Jeżeli `send_on_weekends = false`, automatyczny limit odejmuje soboty i niedziele.

4. Automatyczny limit uwzględnia warm-up dzienny:
   - 5,
   - 10,
   - 15,
   - 20,
   - aż do docelowego limitu kampanii.

5. Usunięto sztywny domyślny limit `1500` z formularzy i SQL.

6. Panel admina pokazuje, czy limit miesięczny jest ręczny, czy automatyczny.

7. Panel klienta nie powinien już pokazywać mylącego `0/1`, jeśli kampania ma ustawienia automatyczne.

Po wdrożeniu należy odpalić końcówkę migracji w `supabase/schema.sql`, ponieważ `campaigns.monthly_limit` staje się nullable i bez defaultu.
