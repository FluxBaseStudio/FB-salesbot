# Hard warm-up daily target fix

Poprawka dotyczy sytuacji, w której kampania miała warm-up 5/50, ale planner kończył run po znalezieniu 1 maila.

## Zmienione zasady

1. Warm-up jest twardym dziennym celem planowania:
   - dzień 1: 5 maili,
   - dzień 2: 10 maili,
   - dzień 3: 15 maili,
   - dalej co 5,
   - maksymalnie do docelowego limitu dziennego kampanii.

2. Stary limit klienta `daily_email_limit` nie ucina już kampanii do 1 maila, jeżeli kampania ma ustawiony własny dzienny cel.
   Docelowy limit dzienny bierze się z `campaign.daily_limit`.

3. Jeżeli bot nie dobije dziennego celu, kampania nie uznaje dnia za zakończony.
   Ustawia `next_run_at` na kolejną próbę za około 30 minut w oknie pracy.

4. Jeżeli weekendy są wyłączone, ponowna próba nie odpali się w sobotę/niedzielę.

5. Planner szuka szerzej:
   - Google Places nadal pobiera maksymalnie 20 wyników na zapytanie,
   - ale całkowity budżet sprawdzanych miejsc został zwiększony,
   - dzięki temu po filtrach, duplikatach, braku emaila i score AI jest większa szansa dobić do celu.

## Ważne

Nie da się matematycznie zagwarantować znalezienia 5 działających adresów email, jeśli w danym targetcie ich nie ma albo są ukryte. System ma jednak teraz nie kończyć pracy po 1 mailu, tylko retry'ować w ciągu dnia aż do dziennego celu albo końca okna pracy.
