# SalesBot public attachments update

Dodano opcjonalne załączniki w publicznym formularzu `/botseller`.

## Co działa

- Klient może dodać maksymalnie 5 plików.
- Limit jednego pliku: 5 MB.
- Dozwolone formaty: PDF, DOC/DOCX, XLS/XLSX, PNG, JPG, WEBP, TXT, CSV.
- Formularz wysyła dane jako `multipart/form-data` do `/api/stripe/checkout-session`.
- Pliki są zapisywane w Supabase Storage.
- Metadane plików trafiają do tabeli `signup_order_attachments`.
- W panelu admina przy zamówieniu widać listę plików klienta.
- Przy ręcznej aktywacji zamówienia pliki są przepinane do `campaign_attachments`, więc bot może dodawać je do maili kampanii.

## Ważne

Klient i kampania nadal nie tworzą się automatycznie po płatności Stripe. Zamówienie czeka na ręczną aktywację admina.

## Supabase

Po wdrożeniu odpal:

```sql
supabase/schema.sql
```

## Vercel ENV

Jeśli chcesz użyć osobnego bucketu dla plików z formularza publicznego, dodaj:

```env
SUPABASE_ORDER_ATTACHMENTS_BUCKET=campaign-attachments
```

Domyślnie system używa tego samego bucketu co kampanie: `campaign-attachments`.
