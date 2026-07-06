# FluxBase BotSeller - Production Hardening Update

W tej paczce dopracowano najważniejsze bezpieczniki produkcyjne po analizie całego ZIP-a.

## Zmieniono / dodano

1. **Score leadów z kampanii**
   - `campaign.min_score` realnie steruje kwalifikacją leadów.
   - ENV `MIN_QUALIFIED_LEAD_SCORE` jest już tylko fallbackiem.
   - Domyślny próg jakości to 7/10.

2. **Publiczny test SMTP z zabezpieczeniem**
   - `/api/public/smtp-test` ma rate limit po IP i emailu.
   - Próby testu zapisują się do `audit_logs` bez hasła SMTP.
   - Chroni endpoint przed użyciem jako darmowy tester SMTP.

3. **Cleanup porzuconych zamówień**
   - Dodano `/api/cron/cleanup-orders`.
   - Czyści `pending/pending_payment/payment_failed` starsze niż domyślnie 48h.
   - Usuwa aktywne załączniki z Supabase Storage.
   - Czyści zaszyfrowane hasło SMTP w nieopłaconym zamówieniu.

4. **Krótszy lock workera**
   - `send-worker` ma lock 3 minuty zamiast 55 minut.
   - `followups` ma lock 15 minut.
   - Planner kampanii zostaje dłuższy, bo może wykonywać cięższe wyszukiwanie.

5. **Search cursor dla dużych rynków**
   - Kampanie zapamiętują `search_cursor`, `last_location_index`, `last_keyword_index`.
   - Bot nie zaczyna codziennie od tych samych miast/krajów.
   - Ważne szczególnie dla Europe Scale.

6. **Lepsze eventy mailowe**
   - Mailer zapisuje `smtp_message_id` / `provider_message_id`.
   - Maile mają nagłówki `X-FluxBase-Tracking-ID`, `X-FluxBase-Client-ID`, `X-FluxBase-Campaign-ID`.
   - `/api/email-events` najpierw szuka po tracking/provider id, dopiero potem fallback po odbiorcy.
   - Dodano podstawową obsługę tokenów/podpisów dla Postmark/Mailgun/SendGrid.

7. **AI fallback nie wysyła słabych maili**
   - Jeśli OpenAI nie zwróci poprawnej odpowiedzi, fallback dostaje niski score.
   - Bot nie powinien wysłać automatycznie słabej wiadomości zastępczej.

8. **Trwałe powiadomienia admina**
   - Dodano tabelę `admin_notifications`.
   - Worker dodaje alerty przy failed queue i pauzie kampanii.
   - Dashboard łączy alerty trwałe z alertami dynamicznymi.

9. **Stop po błędach wysyłki**
   - Jeśli kampania ma zbyt dużo failed w kolejce w 24h, zostaje automatycznie pauzowana.
   - Powód pauzy zapisuje się w `paused_reason`.

10. **Tracking otwarć dokładniejszy**
   - Dodano `first_opened_at`, `last_opened_at`, `open_count`.
   - Pixel zwiększa licznik otwarć zamiast tylko nadpisywać status.

11. **Limity według strefy czasowej**
   - Dzienne i miesięczne limity liczone są według `campaign.sending_timezone`, domyślnie `Europe/Warsaw`.

## Po wdrożeniu

Odpal w Supabase:

```sql
supabase/schema.sql
```

Sprawdź ENV:

```env
CRON_SECRET=
EMAIL_EVENTS_SECRET=
SIGNUP_ORDER_CLEANUP_HOURS=48
SEND_QUEUE_STALE_LOCK_MINUTES=15
POSTMARK_WEBHOOK_TOKEN=
MAILGUN_WEBHOOK_SIGNING_KEY=
SENDGRID_WEBHOOK_SECRET=
```

## Build

`npm run build` przeszedł przez kompilację i TypeScript. W tym środowisku proces Next.js po wypisaniu mapy route'ów nie zakończył się przed timeoutem narzędzia, ale nie pokazał błędów kompilacji ani TypeScript.
