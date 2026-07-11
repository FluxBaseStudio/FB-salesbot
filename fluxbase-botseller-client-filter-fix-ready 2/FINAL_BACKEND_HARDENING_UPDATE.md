# FluxBase BotSeller - backend hardening update

Dodane elementy:

1. Realny test leada bez wysyłki: `/api/admin/campaign-live-test`.
   - Używa Google Places, email finder, audytu strony i OpenAI.
   - Nie wysyła maila i nie zapisuje `send_queue`.
   - Dostępny także z zakładki Operacje w panelu admina.

2. Twarde globalne limity w send-workerze.
   - `APP_MAX_DAILY_EMAILS`
   - `APP_MAX_MONTHLY_EMAILS`
   - `APP_MAX_FAILED_QUEUE`
   - `APP_MAX_PENDING_QUEUE`
   Worker zatrzymuje wysyłkę, jeśli limit jest przekroczony.

3. Alerty backendowe do `admin_notifications`.
   - Globalne limity.
   - Failed/pending queue.
   - Reputacja kampanii.
   - Test kampanii bez emaila.
   - Compliance actions.

4. Moduł reputacji wysyłki.
   - Sprawdza bounce/spam/failed rate z ostatnich 7 dni.
   - Progi przez ENV:
     - `REPUTATION_MIN_SAMPLE`
     - `REPUTATION_MAX_BOUNCE_RATE`
     - `REPUTATION_MAX_SPAM_RATE`
     - `REPUTATION_MAX_FAILED_RATE`
   - Może automatycznie pauzować kampanię.

5. Endpoint compliance odbiorcy: `/api/admin/compliance/recipient`.
   - GET eksportuje dane po emailu.
   - POST `suppress` dodaje odbiorcę do suppression list.
   - POST `anonymize` anonimizuje dane w leadach/messages/send_queue i blokuje odbiorcę.

6. Endpoint feedbacku jakości leada: `/api/admin/leads/[id]/feedback`.
   - `good`, `bad`, `blacklist`.
   - Zapisuje feedback do `run_logs`.
   - `blacklist` dodaje kontakt do suppression list.

7. Health check rozszerzony o snapshot globalnych limitów i opcjonalne email providery.

8. Dodatkowe testy produkcyjnych guardów.

Testy:
- `npm test` OK
- `npm run build` OK
