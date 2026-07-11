# FluxBase TraderBot: FOMO + OpenAI Signal Hub

## Co zostało wdrożone

TraderBot ma teraz wspólną kolejkę decyzji z dwoma źródłami:

1. własny skaner rynku Binance Spot,
2. sygnały FOMO dostarczane ręcznie lub przez chroniony webhook.

Sygnał FOMO nie jest kopiowany bez sprawdzenia. Silnik kontroluje wiek sygnału, ocenę źródła, confidence score, dryf ceny, spread, wolumen i płynność. Następnie uruchamia skonfigurowaną radę botów OpenAI. Bot z uprawnieniem weta może zatrzymać przejście sygnału dalej.

Po zatwierdzeniu sygnał FOMO jest zapisywany jako `trader_market_signals.source_kind = 'fomo'` z priorytetem 100. Sygnały własnego skanera mają priorytet 50. Live executor pobiera więc najpierw świeże i niewykorzystane sygnały FOMO, a potem sygnały własnej analizy.

## Tryby wykonania

- Paper trading: może symulować pozycję FOMO i zwykłą pozycję rynkową.
- Live z akceptacją: tworzy propozycję zarówno dla FOMO, jak i własnego skanera.
- Automatic: wykonuje zlecenia wyłącznie przy aktywnym połączeniu Binance Spot Testnet i `LIVE_TRADING_ENABLED=true`.
- Mainnet: aplikacja może tworzyć propozycje, ale nie wysyła zlecenia na giełdę.

Automatyczne wyjścia i synchronizacja rzeczywistych pozycji mainnet nie są częścią tej wersji. Nie należy włączać mainnet przed zbudowaniem osobnego position managera, testami integracyjnymi i audytem kluczy giełdowych.

## Zakładka Boty OpenAI

W zakładce można tworzyć boty o rolach:

- analityk rynku,
- weryfikator FOMO,
- strażnik ryzyka,
- recenzent decyzji.

Każdy bot ma:

- nazwę,
- model OpenAI,
- instrukcje,
- minimalny próg pewności,
- zakres: rynek, FOMO lub oba,
- opcjonalne prawo weta,
- globalny albo własny zaszyfrowany API key,
- test połączenia i historię analiz.

Odpowiedź OpenAI jest wymuszana przez ścisły JSON Schema. Klucze API nie są zwracane do przeglądarki. Własny klucz bota jest szyfrowany przez `SECRET_ENCRYPTION_KEY`.

## Kolejność workerów

Worker uruchamia:

1. `runMarketScan()`
2. `runFomoCopyEngine()`
3. `runPaperEngine()`
4. `runLiveExecutor()`

Webhook FOMO po zapisaniu sygnału od razu uruchamia szybką analizę. Gdy sygnał zostanie promowany, webhook natychmiast wywołuje live executor: na mainnet powstaje propozycja do zatwierdzenia, a na Binance Spot Testnet może powstać automatyczne zlecenie. Cron jest zabezpieczeniem na wypadek blokady lub chwilowego błędu.

## Wymagane środowisko

```env
OPENAI_API_KEY=
OPENAI_TRADER_MODEL=gpt-5.6-luna
FOMO_WEBHOOK_SECRET=minimum-24-losowe-znaki
CRON_SECRET=oddzielny-dlugi-sekret
LIVE_TRADING_ENABLED=false
SECRET_ENCRYPTION_KEY=minimum-24-losowe-znaki
```

Ustaw `LIVE_TRADING_ENABLED=true` dopiero przy połączeniu Binance Spot Testnet.

## Wymagana migracja

Uruchom ponownie cały plik:

```text
supabase/trader_schema.sql
```

Migracja dodaje ustawienia AI/FOMO, pola źródła sygnału, tabele botów OpenAI i dziennik ich analiz.

## Ograniczenia źródła FOMO

Projekt nie loguje się do aplikacji FOMO i nie omija jej zabezpieczeń. Zewnętrzna integracja musi wysłać poprawny webhook zawierający między innymi `source_id`, `external_signal_id`, symbol wykonywalny przez Binance, stronę transakcji i cenę źródłową. Tokeny, które nie mają obsługiwanego rynku Binance, są pomijane.


## Ochrona promptów

Treści z webhooka, nazwa źródła i uzasadnienie są przekazywane do OpenAI jako nieufne dane JSON. Instrukcje znalezione w tych polach są ignorowane. Bot z prawem weta blokuje sygnał dopiero wtedy, gdy jego decyzja osiąga ustawiony minimalny próg pewności.


Ręczny import sygnału w panelu korzysta z dokładnie tej samej ścieżki co webhook: analiza, ewentualna promocja i natychmiastowe uruchomienie live executora. Jedno uruchomienie silnika może przetworzyć do 10 świeżych sygnałów, aby krótkie fale aktywności nie utknęły w kolejce.
