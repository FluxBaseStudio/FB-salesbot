# Aktualizacja: podpis z kampanii + mocniejsze odwzorowanie przykładowych maili

Wprowadzono poprawki w generowaniu i wysyłce maili przez bota.

## Co zmieniono

1. **Stopka/podpis zawsze bierze dane z kampanii**
   - imię i nazwisko bota,
   - rola/stanowisko,
   - firma,
   - strona,
   - email,
   - telefon,
   - adres,
   - dodatkowa notatka stopki.

2. **Dane z kampanii mają pierwszeństwo przed danymi klienta**
   - jeśli w kampanii wpiszesz inne dane podpisu niż przy kliencie, mail użyje danych kampanii,
   - jeśli pole kampanii jest puste, system użyje danych klienta jako fallback.

3. **Stopka HTML ma osobny blok „Dane nadawcy z kampanii”**
   - odbiorca widzi czytelne dane kontaktowe,
   - odpowiedzi nadal są kierowane na reply-to z kampanii/klienta.

4. **AI mocniej bazuje na przykładowych mailach z kampanii**
   - przykładowy mail jest teraz traktowany jako główny wzorzec stylu,
   - bot odwzorowuje długość, formalność, rytm zdań, układ akapitów, powitanie i przejście do CTA,
   - bot nie kopiuje całych zdań 1:1 i nie przenosi starych danych kontaktowych z przykładu.

5. **Ochrona przed podwójnym podpisem**
   - jeżeli AI mimo instrukcji doda podpis do treści, system próbuje go usunąć,
   - właściwy podpis i stopka są dodawane dopiero przez mailer.

## Zmienione pliki

- `lib/bot/aiLead.ts`
- `lib/bot/mailer.ts`

## Test

Uruchomiono:

```bash
npm run build
```

Build przeszedł poprawnie.
