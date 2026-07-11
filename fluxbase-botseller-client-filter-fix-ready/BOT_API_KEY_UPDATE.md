# Bot API Key Update

Dodano obsługę osobnego API key dla każdego bota w panelu admina.

## Co dodano

- Pole `API key bota` przy dodawaniu bota.
- Pole `Nowy API key bota` i akcję: zachowaj / podmień / usuń przy edycji bota.
- Bezpieczny zapis API key w Supabase jako AES-256-GCM przy użyciu `SECRET_ENCRYPTION_KEY`.
- Panel pokazuje tylko informację, czy bot ma własny klucz oraz ostatnie 4 znaki.
- Planner kampanii używa API key przypisanego do bota, a gdy go nie ma, używa globalnego `OPENAI_API_KEY` / sekretu `openai`.
- Log runa pokazuje, czy użyto klucza bota czy klucza globalnego.

## SQL

W `supabase/schema.sql` dodano kolumny:

- `api_key_encrypted`
- `api_key_iv`
- `api_key_auth_tag`
- `api_key_last4`
- `has_api_key`

## Bezpieczeństwo

Pełny API key nigdy nie wraca do frontendu. W panelu widać tylko status i końcówkę klucza.
