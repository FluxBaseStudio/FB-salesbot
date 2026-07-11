# Końcowy audyt: TraderBot, FOMO i Boty OpenAI

Data audytu: 11 lipca 2026

## Odpowiedź na najważniejsze pytanie

Tak. Po tej aktualizacji FOMO wpływa na wspólną kolejkę decyzji live.

Przepływ wygląda następująco:

1. Adapter zewnętrzny lub administrator przesyła sygnał FOMO.
2. Bot sprawdza źródło, świeżość sygnału, dostępność pary, dryf ceny, spread, wolumen i płynność proxy.
3. Aktywne Boty OpenAI analizują sygnał. Strażnik ryzyka może go zawetować po osiągnięciu własnego progu pewności.
4. Pozytywny sygnał otrzymuje `source_kind = fomo` i priorytet 100.
5. Live executor uruchamia się natychmiast po promocji sygnału.
6. W trybie `approval_required` tworzy propozycję do zatwierdzenia.
7. W trybie `automatic` może wykonać zlecenie wyłącznie przez Binance Spot Testnet.

Bot nadal działa bez FOMO. Własny skaner Binance tworzy sygnały z `source_kind = market_scan` i priorytetem 50. Najlepsze sygnały własnego skanera mogą zostać dodatkowo przeanalizowane przez radę Botów OpenAI, po czym trafiają do tego samego live executora.

## Nowa zakładka Boty OpenAI

Zakładka pozwala:

- dodawać i edytować boty,
- wybierać rolę: analityk rynku, weryfikator FOMO, strażnik ryzyka lub recenzent decyzji,
- ustawiać model OpenAI, domyślnie `gpt-5.6-luna`,
- ustawiać własne instrukcje i minimalny próg pewności,
- określać, czy bot analizuje rynek, FOMO czy oba źródła,
- nadawać prawo weta,
- korzystać z globalnego klucza OpenAI albo przypisać osobny zaszyfrowany klucz,
- testować połączenie,
- przeglądać historię decyzji, tokenów i błędów.

Odpowiedzi są wymuszane przez JSON Schema. Treść webhooka i uzasadnienie źródła są traktowane jako nieufne dane JSON, nie jako instrukcje dla modelu.

## Ważne poprawki z audytu

- webhook FOMO natychmiast wywołuje analizę i live executor,
- ręczny import sygnału działa identycznie jak webhook,
- silnik może przetworzyć do 10 świeżych sygnałów na uruchomienie,
- sygnały FOMO mają wyższy priorytet od zwykłego skanera,
- dodano blokadę duplikatów i idempotency key zleceń,
- nieudane zlecenie testnet dostaje status `failed`, zamiast pozostawać jako `pending`,
- ryzyko testnet jest liczone na rzeczywistym dostępnym saldzie giełdy,
- poprawiono equity paper: gotówka plus aktualna wartość otwartych pozycji,
- zwiększono precyzję cen memecoinów,
- dodano limity wielkości żądań API,
- dodano dokładniejsze zakresy liczbowe w migracji Supabase,
- build produkcyjny przełączono na stabilny Webpack,
- klucze giełdy i indywidualne klucze botów są szyfrowane AES-256-GCM,
- API panelu wymaga konta administratora,
- webhook wymaga oddzielnego sekretu i ma rate limiting.

## Wyniki kontroli

- `npm ci`: sukces,
- `npm test`: wszystkie testy przeszły,
- `npm run typecheck`: sukces,
- `npm audit --omit=dev`: 0 podatności,
- `npm run build`: kod wyjścia 0,
- Next.js: wszystkie strony i endpointy wygenerowane poprawnie.

## Znane ograniczenia

### Brak oficjalnego połączenia z aplikacją FOMO

Projekt udostępnia bezpieczny webhook i adapter sygnałów. Nie loguje się do aplikacji FOMO, nie przechwytuje jej ekranu i nie omija zabezpieczeń. Zewnętrzny adapter lub oficjalne API musi wysłać dane transakcji do webhooka.

### Rynek wykonania

Obecny executor obsługuje Binance Spot. Sygnał dotyczący tokena, który nie ma pary na Binance, zostanie pominięty. Pole `chain` opisuje pochodzenie sygnału, ale nie uruchamia transakcji DEX na Solanie, Base ani BNB Chain.

### Mainnet

Automatyczne zlecenia mainnet pozostają zablokowane. Mainnet może tworzyć propozycje do ręcznego zatwierdzenia, ale obecna funkcja zatwierdzenia również celowo nie wysyła zleceń mainnet. Automat działa wyłącznie na Binance Spot Testnet.

Powodem jest brak pełnego managera realnych pozycji: synchronizacji wykonania, automatycznych wyjść, częściowych filli, stop lossów giełdowych i odzyskiwania stanu po awarii.

### Statystyki źródła FOMO

Ocena źródła, win rate i drawdown są obecnie wprowadzane przez administratora. Bot zapisuje wyniki własnych analiz, lecz nie pobiera automatycznie pełnej historii tradera z FOMO.

### Harmonogramy

`vercel.json` zawiera crony minutowe. Hosting musi obsługiwać taką częstotliwość albo należy użyć osobnego workera/schedulera.

## Wymagane wdrożenie

1. Uruchomić cały `supabase/trader_schema.sql`.
2. Ustawić zmienne z `.env.example`.
3. Dodać co najmniej jednego Bota OpenAI analizującego FOMO oraz strażnika ryzyka.
4. Włączyć FOMO Copy i promocję do live proposals.
5. Najpierw testować paper trading oraz Binance Spot Testnet.
6. Nie przechowywać seed phrase ani kluczy prywatnych portfela w aplikacji.
