# One lead, staggered bot windows, panel values only

W tej paczce poprawiono scheduler kampanii tak, żeby nie odpalał wielu kampanii w tym samym momencie.

## Zmiany

1. Cron kampanii działa co minutę, a domyślnie bierze tylko jedną kampanię na przebieg.
2. Jeżeli kilka kampanii jest gotowych o tej samej godzinie, następne poczekają na kolejny przebieg crona zamiast startować równocześnie.
3. Scheduler nie podstawia już cichych wartości 5 / 6:00 / 16:00 dla kampanii. Używa wartości zapisanych w panelu.
4. Jeżeli w kampanii brakuje celu dziennego albo godzin pracy, bot zgłosi błąd konfiguracji zamiast działać na domyślnych wartościach.
5. Liczenie dziennego celu kolejki jest kampanijne: kolejka jednej kampanii nie udaje wysyłek drugiej kampanii.
6. Kolejne okno pracy kampanii jest liczone z jej własnego celu dziennego, godzin pracy i realnej liczby wysłanych/zaplanowanych wiadomości.
7. Panel admina pokazuje brakujące wartości jako brak konfiguracji, zamiast pokazywać sztuczne 5 lub 6-16.

## Efekt

Przykład przy 10 kampaniach gotowych o 06:00:

- 06:00 pierwsza kampania może szukać 1 leada,
- 06:01 kolejna kampania może szukać 1 leada,
- 06:02 następna kampania może szukać 1 leada,
- pozostałe kampanie czekają na swój przebieg,
- po znalezieniu i zaplanowaniu wiadomości każda kampania dostaje własne następne okno wyliczone z wartości panelu.
