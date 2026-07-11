# FluxBase TraderBot Update

## Co dodano

Dodano moduł FluxBase TraderBot w tej samej aplikacji Next.js co SalesBot. Moduł korzysta z istniejącego Supabase, `verifyAdmin`, `adminDb`, szyfrowania sekretów i sesji administratora.

Live trading jest domyślnie wyłączony. Backend nie może wysłać prawdziwego zlecenia, jeśli `LIVE_TRADING_ENABLED` nie ma wartości `true`.

## Nowe trasy

- `/trader`
- `/api/trader/overview`
- `/api/trader/markets`
- `/api/trader/candles`
- `/api/trader/signals`
- `/api/trader/paper/settings`
- `/api/trader/paper/start`
- `/api/trader/paper/stop`
- `/api/trader/live/settings`
- `/api/trader/live/start`
- `/api/trader/live/stop`
- `/api/trader/approvals`
- `/api/trader/approvals/[id]/approve`
- `/api/trader/approvals/[id]/reject`
- `/api/trader/exchange/connect`
- `/api/trader/exchange/test`
- `/api/trader/emergency-stop`
- `/api/trader/emergency-stop/reset`
- `/api/cron/trader-market-scan`
- `/api/cron/trader-paper-engine`
- `/api/cron/trader-live-executor`
- `/api/cron/trader-copy-engine`

## Nowe tabele

Migracja `supabase/trader_schema.sql` tworzy:

- `trader_settings`
- `trader_exchange_connections`
- `trader_market_watchlist`
- `trader_market_signals`
- `trader_paper_accounts`
- `trader_positions`
- `trader_orders`
- `trader_trades`
- `trader_approval_requests`
- `trader_daily_risk`
- `trader_strategy_runs`
- `trader_audit_logs`

## Uruchomienie migracji

W panelu Supabase SQL Editor uruchom zawartość:

```sql
supabase/trader_schema.sql
```

Migracja jest idempotentna i nie modyfikuje destrukcyjnie tabel SalesBota.

## Zmienne środowiskowe

Wymagane są istniejące zmienne SalesBota:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAILS`
- `SECRET_ENCRYPTION_KEY`
- `CRON_SECRET`

Nowa zmienna bezpieczeństwa:

- `LIVE_TRADING_ENABLED=false`

## Podłączenie giełdy

W `/trader`, zakładka `Połączenie z giełdą`, wpisz:

- nazwę giełdy,
- API key,
- API secret,
- opcjonalny API passphrase,
- opcjonalny sandbox/testnet.

Nie używa się loginu, hasła, seed phrase ani prywatnych kluczy portfela. Sekrety są szyfrowane istniejącym mechanizmem `cryptoSecrets`.

## Paper trading

1. Uruchom migrację SQL.
2. Wejdź do `/trader`.
3. Uruchom skan rynku w `Analiza rynku`.
4. Skonfiguruj limity w `Ustawienia i ryzyko`.
5. Włącz paper trading w zakładce `Paper trading`.
6. Wywołuj cron `/api/cron/trader-paper-engine` z `CRON_SECRET`.

Paper trading używa rzeczywistych danych cenowych, ale nie wysyła prawdziwych zleceń.

## Bezpieczne włączenie live tradingu

1. Podłącz i przetestuj klucz giełdy.
2. Upewnij się, że klucz nie ma uprawnień do wypłat ani transferów.
3. Ustaw `LIVE_TRADING_ENABLED=true`.
4. Włącz tryb `approval_required`.
5. Cron `/api/cron/trader-live-executor` tworzy propozycje wymagające ręcznej akceptacji.

Tryb `automatic` pozostaje celowo niedostępny, ponieważ ta wersja nie zawiera kompletnego i osobno zaudytowanego wykonania automatycznych zleceń.

## Zatrzymanie systemu

Przycisk `ZATRZYMAJ TRADING`:

- ustawia `trading_mode=disabled`,
- wyłącza paper trading,
- wyłącza również FOMO Copy,
- aktywuje globalny stop,
- anuluje oczekujące propozycje,
- zapisuje audyt.

Nie zamyka automatycznie otwartych pozycji.

## Ograniczenia pierwszej wersji

- Obsługiwany provider: Binance Spot.
- Brak futures, margin, dźwigni, pożyczania środków, wypłat i transferów.
- WebSocket może zostać dodany w workerze; tryb podstawowy działa przez cron i polling.
- Panel nie pokazuje fikcyjnych sald ani fikcyjnych wyników jako prawdziwych danych.

## FOMO Copy

Szczegóły integracji paper copy trading znajdują się w `FOMO_COPY_TRADING_UPDATE.md`.
