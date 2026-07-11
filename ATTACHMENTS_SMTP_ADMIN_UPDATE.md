# FluxBase BotSeller - załączniki kampanii i podgląd SMTP admina

## Co dodano

1. **Załączniki kampanii**
   - Nowa tabela `campaign_attachments` w `supabase/schema.sql`.
   - Upload plików z panelu admina przy tworzeniu kampanii.
   - Upload plików z panelu admina przy tworzeniu kampanii dla wybranego klienta.
   - Upload dodatkowych plików podczas edycji kampanii.
   - Lista załączników przy szczegółach kampanii.
   - Włączanie / wyłączanie załącznika bez usuwania pliku.
   - Usuwanie załącznika z panelu admina.
   - Limit 5 MB na plik.
   - Obsługiwane typy: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, WEBP, TXT, CSV.

2. **Automatyczne dołączanie plików do maili**
   - Runner kampanii pobiera aktywne załączniki z `campaign_attachments`.
   - `sendLeadEmail()` przekazuje aktywne pliki do Nodemailera.
   - Każdy mail wysyłany przez bota w danej kampanii otrzymuje aktywne załączniki.

3. **Podgląd hasła Gmail / SMTP dla admina**
   - Dodano endpoint `POST /api/clients/[id]/reveal-smtp`.
   - Dodano endpoint `POST /api/signup-orders/[id]/reveal-smtp`.
   - W panelu admina pojawia się przycisk `Pokaż hasło SMTP` przy kliencie i zamówieniu.
   - Hasło jest odszyfrowywane po stronie serwera tylko dla zalogowanego admina.
   - Hasło dalej nie jest przechowywane jako zwykły tekst w bazie.
   - Każde odsłonięcie hasła zapisuje wpis w `audit_logs`.

4. **Responsywność i czytelność panelu**
   - Dodano style dla list załączników.
   - Długie nazwy plików, hasła i ID nie rozwalają layoutu.
   - Widok załączników lepiej układa się na telefonie.

## Ważne po wdrożeniu

Po wrzuceniu tej wersji uruchom w Supabase cały plik:

```sql
supabase/schema.sql
```

To doda tabelę `campaign_attachments` oraz indeksy.

## Testy wykonane

```bash
npm ci --no-audit --no-fund
npx tsc --noEmit
NEXT_TELEMETRY_DISABLED=1 npm run build
```

Status: build OK.
