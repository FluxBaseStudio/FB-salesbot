# FluxBase BotSeller - auto-wysyłka, follow-upy i tracking wiadomości

W tej wersji zmieniono logikę kampanii zgodnie z nowym przepływem pracy:

## Co zostało dodane

1. **Tryb automatycznej wysyłki kampanii**
   - `auto_send_enabled = true`: wiadomość po wygenerowaniu trafia do kolejki i jest wysyłana SMTP bez akceptacji admina.
   - Statusy wysyłki przechodzą przez `queued -> sending -> sent`.
   - W kampaniach automatycznych przy wiadomości nie pokazuje się akcja ręcznej akceptacji.

2. **Tryb ręczny**
   - `auto_send_enabled = false`: wiadomość ma status `draft`.
   - Admin klika „Akceptuj i wyślij”, a system wysyła wiadomość przez SMTP.

3. **Leady bez emaila**
   - Jeżeli bot nie znajdzie adresu email, lead nie jest zapisywany do aktywnej kampanii.
   - Nie generuje się wiadomość.
   - Nie liczy się to jako wysłany mail.

4. **Follow-up po czasie**
   - Dodano pola kampanii:
     - `follow_up_delay_days`, domyślnie 2 dni,
     - `max_follow_ups`, domyślnie 1.
   - Dodano cron `/api/cron/followups`, który wysyła follow-upy dla wiadomości bez odpowiedzi.
   - Follow-up zatrzymuje się po statusach: `replied`, `bounced`, `spam`, `unsubscribed`, `failed`.

5. **Tracking otwarć**
   - Każda wiadomość ma `tracking_id`.
   - Mail HTML zawiera tracking pixel.
   - Endpoint `/api/track/open/[trackingId]` ustawia `opened_at` i status `opened`.

6. **Statusy wiadomości**
   - Dodano statusy: `draft`, `queued`, `sending`, `sent`, `delivered`, `opened`, `replied`, `follow_up_scheduled`, `follow_up_sent`, `bounced`, `spam`, `failed`, `skipped_no_email`, `unsubscribed`.

7. **Statystyki w panelu admina i klienta**
   - Wysłane,
   - Dostarczone,
   - Otwarte,
   - Odpowiedzi,
   - Bounce,
   - Spam,
   - Follow-upy.

8. **Monitoring bounce/spam pod przyszłe webhooki**
   - Dodano endpoint `/api/email-events` zabezpieczony `EMAIL_EVENTS_SECRET` albo `CRON_SECRET`.
   - Można nim aktualizować statusy: delivered, opened, replied, bounced, spam, failed, unsubscribed.

## Ważne po wdrożeniu

Po wrzuceniu kodu uruchom SQL z `supabase/schema.sql` w Supabase SQL Editor, żeby dodać nowe kolumny i statusy.

Dla crona ustaw w Vercel zmienną:

```txt
CRON_SECRET=twoj_tajny_klucz
```

Dla webhooków emailowych można dodać:

```txt
EMAIL_EVENTS_SECRET=twoj_tajny_klucz
```

## Uwaga techniczna

Przy zwykłym Gmail SMTP system wie pewnie, że wiadomość została przyjęta przez SMTP i może śledzić otwarcia przez pixel. Dokładne wykrycie spamu i bounce wymaga webhooka od providera poczty albo osobnej integracji odbioru zwrotek. Dlatego endpoint `/api/email-events` jest przygotowany pod taki kolejny etap.
