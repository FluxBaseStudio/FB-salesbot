# AI Usage GPT-5.5 Update

Dodano zakładkę **Zużycie AI** w panelu administratora.

## Co zostało dodane

- Nowy tab w bocznym menu admina: **Zużycie AI**.
- Podsumowanie kosztów AI:
  - koszt w wybranym okresie,
  - koszt dzisiaj,
  - koszt w bieżącym miesiącu,
  - średni koszt jednego requestu.
- Podsumowanie tokenów:
  - input tokens,
  - cached input tokens,
  - output tokens,
  - total tokens.
- Tabela ostatnich wywołań AI z klientem, kampanią, modelem, tokenami i kosztem.
- Ranking najdroższych kampanii w wybranym okresie.
- Logowanie tokenów po każdym wywołaniu OpenAI w `generateLeadWithAi`.
- Bezpieczny fallback: jeśli tabela `ai_usage_logs` nie istnieje jeszcze w Supabase, panel się nie wysypie, tylko pokaże puste dane.

## Cennik użyty w kodzie

Model: `gpt-5.5`

- Input: `$5.00 / 1M tokens`
- Cached input: `$0.50 / 1M tokens`
- Output: `$30.00 / 1M tokens`

Koszt jest liczony w USD, bez VAT i bez dodatkowych opłat platformy.

## Ważne

Aby logi zaczęły się zapisywać na produkcji, w Supabase trzeba mieć uruchomioną migrację z końca pliku:

`supabase/schema.sql`

Dodana tabela:

`ai_usage_logs`

Po wdrożeniu i po pierwszym uruchomieniu kampanii korzystającej z OpenAI zakładka zacznie pokazywać realne zużycie.

## Testy

- `npx tsc --noEmit` OK
- `npm run build` OK
