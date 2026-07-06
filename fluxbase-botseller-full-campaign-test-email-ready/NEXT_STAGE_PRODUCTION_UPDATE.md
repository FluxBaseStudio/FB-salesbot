# FluxBase BotSeller - produkcyjne dopracowanie po analizie struktury

W tej wersji dodano sześć brakujących elementów produkcyjnych, bez zmiany głównej logiki BotSellera.

## 1. Publiczny test SMTP przed Stripe

Dodano endpoint:

```txt
/api/public/smtp-test
```

Formularz `/botseller` ma teraz przycisk **Sprawdź SMTP** w kroku SMTP. Przejście do płatności Stripe jest zablokowane, dopóki test SMTP nie przejdzie poprawnie.

Dodatkowo endpoint Stripe checkout wykonuje ten test ponownie po stronie backendu, żeby nie dało się obejść sprawdzenia przez modyfikację formularza w przeglądarce.

## 2. Prawdziwe eventy delivered/bounce/spam od providerów

Rozszerzono endpoint:

```txt
/api/email-events
```

Obsługuje teraz bardziej elastyczne webhooki z providerów typu SendGrid, Mailgun, Postmark oraz format generic.

Eventy są zapisywane do tabeli:

```txt
email_events
```

Obsługiwane statusy obejmują m.in.:

```txt
delivered, opened, replied, bounced, spam, failed, unsubscribed
```

Uwaga: przy zwykłym Gmail SMTP nadal nie ma prawdziwych eventów delivered/bounce/spam. Endpoint jest przygotowany pod zewnętrznego providera mailowego.

## 3. Lepszy DKIM checker

Kontroler DNS sprawdza teraz:

```txt
MX, SPF, DMARC, DKIM
```

Dla DKIM sprawdzane są popularne selectory oraz opcjonalny własny selector zapisany przy kliencie:

```txt
dkim_selector
```

Dodano pole **DKIM selector** w formularzu klienta w panelu admina.

## 4. Panel powiadomień admina

Dashboard admina ma sekcję **Powiadomienia admina**.

System pokazuje alerty typu:

```txt
Brak pełnej konfiguracji SMTP
Nieudane wysyłki w kolejce
Kampania nie ma wysłanych leadów w okresie
Błędy SMTP w logach
```

Powiadomienia są generowane na podstawie danych systemu i nie zmieniają działania bota.

## 5. Lepszy podgląd prawdziwego AI maila

Dodano endpoint:

```txt
/api/admin/preview-email
```

W kampanii przycisk **Wygeneruj AI** tworzy realny podgląd wiadomości przez AI, bez wysyłania maila.

Podgląd pokazuje:

```txt
Temat
Treść
Score AI
Krótką analizę
Podpis i stopkę mailową w wersji tekstowej
```

Jeżeli OpenAI nie jest skonfigurowane, system używa bezpiecznego fallbacku.

## 6. Migracja starych statusów UI

Normalne widoki panelu dalej pokazują tylko realne statusy:

```txt
sent, delivered, opened, replied, follow_up_sent, bounced, spam, unsubscribed
```

Stare statusy, takie jak draft/approved/skipped_no_email, zostają w typach i bazie tylko dla kompatybilności, ale są ukrywane w zwykłych filtrach UI.

## Pliki zmienione

- app/botseller/page.tsx
- app/api/public/smtp-test/route.ts
- app/api/stripe/checkout-session/route.ts
- app/api/email-events/route.ts
- app/api/admin/preview-email/route.ts
- app/api/clients/[id]/dns-check/route.ts
- lib/bot/smtpTest.ts
- lib/dnsChecker.ts
- lib/types.ts
- lib/validation.ts
- components/admin/adminShared.tsx
- components/admin/adminSections.tsx
- app/globals.css
- supabase/schema.sql

## Supabase

Po wdrożeniu odpal:

```txt
supabase/schema.sql
```

Dodaje m.in.:

```txt
client_accounts.dkim_selector
email_events
indeksy email_events
```

## ENV

Sprawdź w Vercel:

```env
EMAIL_EVENTS_SECRET=dlugi_tajny_klucz
CRON_SECRET=dlugi_tajny_klucz
OPENAI_API_KEY=opcjonalnie_dla_podgladu_ai
```

## Build

Projekt został sprawdzony komendą `npm run build`. Kompilacja i TypeScript przeszły, Next wygenerował mapę route'ów.
