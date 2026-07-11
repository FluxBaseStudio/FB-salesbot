# FluxBase TraderBot: FOMO Copy Trading Update

## Zakres integracji

Dodano zakładkę `FOMO Copy`, która działa jako adapter sygnałów i paper copy trading. Moduł nie loguje się automatycznie do aplikacji FOMO, nie przechowuje hasła, seed phrase ani klucza prywatnego i nie wykonuje transakcji za prawdziwe środki.

Sygnały mogą być:

- dodawane ręcznie w panelu,
- przesyłane przez chroniony webhook,
- analizowane automatycznie przez cron.

## Kontrola przed skopiowaniem

Każdy sygnał przechodzi przez filtry:

- aktywne źródło,
- minimalna ocena tradera lub portfela,
- minimalna pewność sygnału,
- maksymalny wiek sygnału,
- maksymalna różnica między ceną źródłową i aktualną,
- spread i poślizg,
- wolumen i płynność,
- saldo paper tradingu,
- limit ekspozycji,
- limit otwartych pozycji,
- limit dziennych transakcji,
- limit dziennej straty,
- blokada po serii strat,
- awaryjne zatrzymanie.

## Nowe trasy

- `/api/trader/copy/overview`
- `/api/trader/copy/settings`
- `/api/trader/copy/sources`
- `/api/trader/copy/sources/[id]/toggle`
- `/api/trader/copy/signals`
- `/api/trader/copy/run`
- `/api/trader/copy/fomo/webhook`
- `/api/cron/trader-copy-engine`
- `/api/trader/emergency-stop/reset`

## Nowe tabele

Migracja `supabase/trader_schema.sql` dodaje:

- `trader_copy_sources`,
- `trader_copy_signals`,
- ustawienia FOMO Copy w `trader_settings`,
- oznaczenie pochodzenia pozycji w `trader_positions`.

Migrację należy uruchomić ponownie w Supabase SQL Editor. Polecenia używają `if not exists`, więc mogą zostać wykonane także na istniejącej bazie TraderBota.

## Webhook

Ustaw w Vercel:

```env
FOMO_WEBHOOK_SECRET=minimum-24-znaki-losowego-sekretu-innego-niz-CRON_SECRET
```

Endpoint:

```text
POST /api/trader/copy/fomo/webhook
Authorization: Bearer FOMO_WEBHOOK_SECRET
```

Przykładowe dane wejściowe:

```json
{
  "external_signal_id": "fomo-example-001",
  "source_id": "UUID_ZRODLA_Z_PANELU",
  "symbol": "PEPEUSDT",
  "pair": "PEPE/USDT",
  "side": "buy",
  "source_price": "0.00001234",
  "confidence_score": 78,
  "detected_at": "2026-07-11T12:00:00.000Z",
  "rationale": "Sygnał przekazany przez zewnętrzny adapter."
}
```

`external_signal_id` zabezpiecza przed ponownym zapisaniem tego samego sygnału. Dla webhooka wymagane są zarówno `external_signal_id`, jak i `source_id`. Endpoint przyjmuje maksymalnie 64 KB, ma podstawowy limit 60 żądań na minutę z jednego IP i usuwa z zapisywanego payloadu pola wyglądające jak hasła, tokeny, seed phrase lub klucze prywatne.

## Crony

`vercel.json` uruchamia:

- skan rynku co 5 minut,
- zwykły paper engine co 2 minuty,
- FOMO Copy engine co minutę.

Oba silniki paper korzystają ze wspólnej blokady, dzięki czemu nie zmieniają jednocześnie tego samego salda.

## Dodatkowe poprawki TraderBota

- naprawiono testy TypeScript przez runner `tsx`,
- dodano działający trailing stop w paper tradingu,
- dodano blokadę powtórnego otwarcia pozycji na ten sam symbol,
- uruchomiono przerwę po trzech kolejnych stratach,
- dzienny limit transakcji uwzględnia również wejścia,
- dodano reset awaryjnego zatrzymania,
- wyłączono przycisk automatycznego live tradingu, ponieważ poprzedni backend nie wykonywał tego trybu,
- ograniczono liczbę workerów Next.js, aby build nie kończył się błędem `EPIPE`,
- zwiększono precyzję obliczeń do 12 miejsc po przecinku dla bardzo tanich memcoinów,
- stop loss i take profit są liczone od rzeczywistej ceny wejścia po spreadzie i poślizgu,
- ocena obserwowanego źródła jest sprawdzana ponownie w chwili wykonywania symulacji.

## Uruchomienie

1. Uruchom ponownie `supabase/trader_schema.sql`.
2. Dodaj `FOMO_WEBHOOK_SECRET` w Vercel.
3. Wdróż aplikację.
4. Wejdź do `/trader`.
5. Włącz `Paper trading`.
6. Dodaj źródło w `FOMO Copy`.
7. Dodaj testowy sygnał ręcznie.
8. Włącz `FOMO Copy` i kliknij `Analizuj kolejny sygnał`.
