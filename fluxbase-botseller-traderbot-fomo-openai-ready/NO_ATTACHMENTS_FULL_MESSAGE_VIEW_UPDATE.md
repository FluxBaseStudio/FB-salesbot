# Update: wiadomości bez załączników + pełna treść wiadomości

## Co zmieniono

1. Bot nie dołącza już plików do maili wysyłanych do leadów.
   - `sendLeadEmail` wysyła samą wiadomość email: tekst + HTML body.
   - Usunięto przekazywanie aktywnych załączników kampanii do realnej wysyłki.
   - Pełny test kampanii również wysyła sam mail bez załączników.

2. Zakładka Wiadomości w panelu admina dostała przycisk `Pełna treść`.
   - Admin może zobaczyć cały temat, pełną treść body, lead, klienta, kampanię, status i daty.

3. Zakładka Wiadomości w panelu klienta dostała przycisk `Pełna treść` przy ostatnich wysyłkach.
   - Klient widzi pełną treść wiadomości, nie tylko temat i skrót.

## Sprawdzone

- `npm run typecheck` — OK
- `npm test` — OK
- `npm run build` — kompilacja Next.js przeszła i wygenerowała podsumowanie routingu; proces w środowisku roboczym nie zakończył się sam przed limitem narzędzia, ale etap kompilacji, TypeScript i generowanie stron zakończyły się sukcesem.
