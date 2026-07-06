# Deep polish: sekwencyjna praca bota i równoległe kampanie

W tej paczce dopracowano drobne, ale ważne niejasności po zmianie na tryb: `1 lead -> 1 wiadomość -> następny slot`.

## Co poprawiono

1. Cron planowania kampanii nie używa już `Promise.all` dla wielu kampanii naraz.
   - Kampanie z różnymi botami nadal nie są blokowane biznesowo.
   - System przetwarza je stabilnie jedna po drugiej w obrębie jednego uruchomienia crona, żeby nie odpalić naraz wielu zapytań Google/OpenAI i nie rozjechać limitów.

2. Twarde limity dzienne są bezpieczniejsze.
   - Planer nie tworzy hurtowej kolejki.
   - Domyślne fallbacki limitu dziennego w adminie i walidacji są spójne z warm-upem: 5.

3. Worker wysyłki nie zużywa już prób podwójnie.
   - Rekord kolejki inkrementuje `attempts` przy claimie.
   - Logika ponownej próby nie dolicza już kolejnego sztucznego +1.

4. Panel admina ma czytelniejsze opisy.
   - Usunięto mylące teksty typu „Auto co 24h”.
   - Widok kampanii mówi teraz, że cron sprawdza kampanię co 10 minut.
   - Szczegóły kampanii pokazują, że odstęp dotyczy trybu `1 lead przed 1 wysyłką`.

5. Statusy botów w panelu są dokładniejsze.
   - Gdy jeden bot ma kilka kampanii, panel pokazuje nazwę tej kampanii, której stan faktycznie jest najpilniejszy.
   - Poprawiono opis następnego okna pracy, gdy `next_run_at` jeszcze nie istnieje.

## Weryfikacja

`npm run build` zakończył się poprawnie.
