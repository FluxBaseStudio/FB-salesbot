# FluxBase BotSeller – warm-up jako cel dzienny i uproszczony panel admina

## Co zmieniono

1. Warm-up jest teraz traktowany jako realny dzienny cel kolejki:
   - dzień 1: 5 maili,
   - dzień 2: 10 maili,
   - dzień 3: 15 maili,
   - dalej +5 dziennie,
   - aż do docelowego limitu kampanii, np. 50.

2. Planner kampanii szuka szerzej, aby dobić do dziennego celu:
   - Google Places pobiera do 20 wyników na zapytanie,
   - planner może przejść przez większą liczbę par target + lokalizacja,
   - run loguje `under_target`, jeśli mimo szukania nie udało się zebrać pełnego limitu.

3. Panel admina jest prostszy w nawigacji:
   - menu zostało ustawione według realnej kolejności pracy: Start → Zamówienia → Kampanie → Boty → Runy → Kolejka → Klienci → Leady → Wiadomości,
   - dashboard ma nowe „Centrum pracy” z szybkimi wejściami do najważniejszych sekcji.

## Ważna zasada

Jeśli kampania ma włączone `Przed wysyłką poproś klienta o akceptację`, bot przygotuje dzienny cel jako maile do akceptacji. Realna wysyłka nastąpi dopiero po zaakceptowaniu maili w panelu klienta.

Jeśli akceptacja jest wyłączona, bot zaplanuje maile w kolejce i worker wyśle je w oknie pracy, zgodnie z limitem warm-up.
