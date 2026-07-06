# Full campaign test email update

Zmieniono test wysyłki kampanii z prostego maila SMTP na pełną wiadomość kampanii.

## Co działa teraz

- Przycisk w dodawaniu i edycji kampanii generuje treść przez AI tak jak normalna kampania.
- Testowy mail używa tego samego `sendLeadEmail`, `buildLeadEmailText` i `buildLeadEmailHtml`, więc zawiera HTML, podpis, stopkę i format wiadomości produkcyjnej.
- Test idzie na adres wpisany w polu `Adres testowy`.
- Nie zapisuje leada, nie dodaje wiadomości do kolejki i nie wysyła do prawdziwych firm.
- Dla istniejącej kampanii dołącza aktywne załączniki kampanii.
- Audit log zapisuje akcję `send_campaign_full_preview_email`.

## Sprawdzone

- `npm run typecheck`
- `npm test`
- `npm run build`
