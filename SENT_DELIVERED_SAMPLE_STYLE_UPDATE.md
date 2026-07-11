# FluxBase BotSeller - sent=delivered + przykładowy styl maila

## Zmiany

1. Panel traktuje poprawnie wysłany mail SMTP jako dostarczony/przyjęty.
   - nowe wysyłki dalej zapisują `delivered_at = sent_at`,
   - statystyki w panelu admina i klienta liczą `sent` jako `delivered`,
   - stare wiadomości z `sent_at` bez `delivered_at` są uzupełniane w `supabase/schema.sql`.

2. Dodano pole `sample_email_style` do kampanii.
   - w dodawaniu kampanii w panelu admina,
   - w edycji kampanii,
   - w zamówieniach BotSeller,
   - w publicznym formularzu `/botseller`.

3. AI dostaje przykładowego maila w promptcie i ma odczytywać z niego:
   - poziom formalności,
   - długość wiadomości,
   - rytm zdań,
   - typ powitania,
   - styl podpisu,
   - sposób przechodzenia do CTA.

## Supabase

Po wdrożeniu uruchom ponownie:

```sql
supabase/schema.sql
```

To doda kolumny:

```sql
campaigns.sample_email_style
signup_orders.sample_email_style
```

oraz uzupełni starsze wiadomości:

```sql
update messages
set delivered_at = coalesce(delivered_at, sent_at)
where sent_at is not null
  and delivered_at is null
  and status in ('sent', 'delivered', 'opened', 'replied', 'follow_up_sent');
```
