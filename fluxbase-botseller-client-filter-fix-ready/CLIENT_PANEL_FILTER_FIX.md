# Client panel filtering fix

Poprawka dotyczy panelu klienta: zakładek **Leady** i **Wiadomości**.

## Co zmieniono

- Usunięto frontendowe ucinanie listy do 20 rekordów.
- API panelu klienta pobiera teraz do 5000 rekordów w wybranym zakresie zamiast 200.
- Filtrowanie wiadomości działa po realnej dacie aktywności wiadomości:
  - dla wysłanych maili: `sent_at`,
  - dla niewysłanych/szkiców/kolejki: `created_at`.
- Leady są dobierane nie tylko po `created_at`, ale także po leadach powiązanych z wiadomościami z wybranego zakresu. Dzięki temu lead utworzony wcześniej, ale z mailem wysłanym dzisiaj, nie znika z filtra „Dzisiaj”.
- Dodano preset filtra **Wszystkie**, aby klient mógł zobaczyć całą dotychczasową historię bez ręcznego ustawiania dat.
- Nagłówki w zakładkach pokazują liczbę rekordów w aktualnym zakresie.

## Sprawdzenie

`npm run build` zakończył się poprawnie.
