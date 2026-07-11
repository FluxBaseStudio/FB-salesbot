# Campaign test email update

Dodano realny test wysyłki maila z poziomu formularza kampanii.

## Co zostało dodane

- Nowy endpoint: `POST /api/admin/send-test-email`.
- Endpoint wymaga sesji admina i tokena Supabase w nagłówku `Authorization`.
- Endpoint waliduje adres odbiorcy testowego i aktualny formularz kampanii.
- Testowy mail jest wysyłany przez SMTP przypisanego klienta, z podpisem i danymi kampanii.
- Wysyłka testowa nie zapisuje kampanii i nie wysyła niczego do leadów.
- Próba wysyłki zapisuje wpis w `audit_logs` jako `send_campaign_test_email`.

## Gdzie jest przycisk

- Dodawanie kampanii w zakładce klienta.
- Edycja kampanii w zakładce klienta.
- Dodawanie kampanii w głównej zakładce Kampanie.
- Edycja kampanii w głównej zakładce Kampanie.

## Jak działa w panelu

Obok przycisku znajduje się pole `Adres testowy`. Administrator wpisuje adres, na który ma dotrzeć mail, i klika `Wyślij test`.
