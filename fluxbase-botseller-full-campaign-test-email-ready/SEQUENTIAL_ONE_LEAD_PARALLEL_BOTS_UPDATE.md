# Aktualizacja: sekwencyjne wyszukiwanie 1 leada + równoległe boty

Wprowadzone zmiany:

1. Planner kampanii nie buduje już o 06:00 całej dziennej kolejki 50 maili.
   - Każde odpalenie crona szuka maksymalnie jednego dobrego kontaktu.
   - Po znalezieniu kontaktu tworzy jedną wiadomość do wysyłki.
   - Następne szukanie jest ustawiane na kolejne okno wynikające z limitu dziennego i godzin 06:00-16:00.

2. Kampanie z różnymi botami mogą pracować równolegle.
   - Usunięto globalną blokadę crona planowania, która mogła zatrzymywać inne kampanie.
   - Każda kampania nadal ma własną blokadę, żeby ta sama kampania nie odpaliła się podwójnie.
   - Planner obsługuje kilka kampanii w jednej turze bez zasady „tylko jedna kampania globalnie”.

3. Godziny pracy są twardo respektowane.
   - Domyślne okno: 06:00-16:00 Europe/Warsaw.
   - Poza godzinami pracy kampania ustawia `next_run_at` na następne okno pracy.
   - W weekend, przy wyłączonych weekendach, kampania ustawia `next_run_at` na najbliższy dzień roboczy.

4. Panel admina pokazuje bardziej realny status pracy.
   - „Szuka leadów” podczas runu.
   - „Wysyła” podczas wysyłki.
   - „Czeka na następną wysyłkę” z godziną.
   - „Czeka na następne okno pracy” z godziną.
   - „Poza godzinami pracy” z następnym oknem.
   - „Jest weekend” z następnym oknem pracy.

5. Domyślne wartości startowe kampanii są bardziej realne.
   - Daily limit / send limit / safety cap startują od 5 zamiast 50.
   - Dzięki temu pierwsze kampanie nie próbują od razu pracować z agresywnym limitem.

6. Cron planowania jest częstszy.
   - `/api/cron/run-campaigns` działa co 10 minut, a nie tylko raz na godzinę.
   - Kod i tak sam blokuje pracę poza godzinami 06:00-16:00 oraz w weekendy.

7. Worker wysyłki może obsłużyć więcej kampanii w jednej turze.
   - Domyślny batch workera wysyłki zwiększono do 10.
   - Nadal respektuje limity dzienne, miesięczne, weekendy i godziny pracy.

Sprawdzenie:
- `npm run build` zakończony sukcesem.
