# FluxBase BotSeller - logo, UX, DNS, storage i aktywacja ręczna

## Build
`npm run build` przeszedł poprawnie.

## Najważniejsze zmiany

1. Naprawiono logo BotSeller na stronie głównej i `/botseller`.
   - odizolowano style `.botseller-logo`, żeby globalne `.marketing-brand span` nie rozbijało SVG i tekstu,
   - na mobile navbar pokazuje samą ikonę robota.

2. Uporządkowano `app/globals.css`.
   - dodano czytelną sekcję `FluxBase BotSeller polish UI pass`,
   - odseparowano style logo, formularza krokowego, DNS, sekretów SMTP i podglądu maila.

3. Skrócono formularz `/botseller`.
   - formularz jest teraz krokowy z paskiem postępu,
   - zostawiono tylko najważniejsze dane: pakiet, dane firmy, czym zajmuje się firma, jakich firm szukamy, promowana usługa, obszar, SMTP i podstawowa persona,
   - zaawansowane programowanie bota zostaje w panelu admina.

4. Dodano ekran sukcesu po Stripe.
   - po powrocie `/botseller?payment=success&order=...` strona pokazuje informację, że zamówienie jest opłacone i czeka na ręczną aktywację.

5. Potwierdzono i wzmocniono model ręcznej aktywacji.
   - Stripe webhook oznacza zamówienie jako `paid`,
   - klient i kampania nie tworzą się automatycznie po płatności,
   - aktywacja nadal wymaga kliknięcia w panelu admina przy zamówieniu.

6. Dodano bezpieczniejszy podgląd SMTP w panelu admina.
   - hasło SMTP jest szyfrowane w bazie,
   - admin widzi końcówkę,
   - po kliknięciu ikonki oka może odszyfrować i zobaczyć pełne hasło.

7. Dodano kontroler DNS.
   - endpoint: `/api/clients/[id]/dns-check`,
   - sprawdza MX, SPF, DMARC i popularne rekordy DKIM,
   - panel klienta w adminie pokazuje wynik w czytelnej karcie.

8. Przeniesiono załączniki kampanii do Supabase Storage.
   - bucket: `campaign-attachments`,
   - nowe pliki idą do Storage,
   - baza przechowuje `storage_bucket`, `storage_path`, `storage_provider`,
   - legacy `file_data_base64` zostaje jako fallback dla starych plików.

9. Dodano podgląd przykładowego maila testowego.
   - w formularzach kampanii admin może wygenerować podgląd tematu, treści i podpisu bez wysyłania wiadomości.

10. Dopracowano cron pod Europe/Warsaw.
    - Vercel cron może odpalać endpoint co godzinę,
    - kod planuje kampanie tylko w oknie około 06:00 czasu Warszawy,
    - można wymusić ręcznie `?force=1`.

## Supabase SQL
Po wdrożeniu odpal:

```sql
supabase/schema.sql
```

Nowe/ważne elementy:
- bucket `campaign-attachments`,
- kolumny `storage_bucket`, `storage_path`, `storage_provider` w `campaign_attachments`,
- `file_data_base64` może być puste dla nowych plików.

## Vercel ENV
Sprawdź:

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SECRET_ENCRYPTION_KEY=
CRON_SECRET=
SUPABASE_ATTACHMENTS_BUCKET=campaign-attachments
```

`SUPABASE_ATTACHMENTS_BUCKET` jest opcjonalne, domyślnie `campaign-attachments`.
