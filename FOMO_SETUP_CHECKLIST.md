# FOMO + OpenAI setup checklist

1. Uruchom cały `supabase/trader_schema.sql` w Supabase SQL Editor.
2. Dodaj `SECRET_ENCRYPTION_KEY`, `CRON_SECRET` i `FOMO_WEBHOOK_SECRET` do Vercel.
3. Dodaj globalny `OPENAI_API_KEY` albo przypisz zaszyfrowany klucz do konkretnego bota w zakładce Boty OpenAI.
4. W TraderBot > Boty OpenAI dodaj przynajmniej:
   - Weryfikator FOMO z `analyze_fomo=true`.
   - Strażnik ryzyka z `can_veto=true`.
   - Analityk rynku z `analyze_market=true`.
5. W FOMO Copy ustaw progi źródła, confidence, maksymalny wiek i dryf ceny. Pozostaw włączone wymaganie analizy OpenAI.
6. Dodaj obserwowane źródło i zapamiętaj jego UUID jako `source_id` webhooka.
7. Wysyłaj webhook do `/api/trader/copy/fomo/webhook` z nagłówkiem `Authorization: Bearer <FOMO_WEBHOOK_SECRET>`.
8. Najpierw testuj w paper tradingu.
9. Dla automatycznego wykonania podłącz wyłącznie Binance Spot Testnet i dopiero wtedy ustaw `LIVE_TRADING_ENABLED=true`. Po zatwierdzeniu analizy webhook od razu wywoła live executor.
10. Mainnet pozostaw w trybie propozycji. Ta wersja nie wysyła zleceń mainnet.

Przykładowe body webhooka:

```json
{
  "source_id": "UUID-Z-PANELU",
  "external_signal_id": "unikalne-id-transakcji",
  "symbol": "PEPEUSDT",
  "pair": "PEPE/USDT",
  "chain": "solana",
  "side": "buy",
  "source_price": "0.00001234",
  "confidence_score": 82,
  "rationale": "Topowy obserwowany trader kupił token."
}
```
