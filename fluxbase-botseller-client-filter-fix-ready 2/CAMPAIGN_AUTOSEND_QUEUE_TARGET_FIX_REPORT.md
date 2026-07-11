# Campaign autosend, queue and target fix

Poprawki dodane po problemie: kampania wysłała tylko kilka maili, kolejne leady wpadały w target_filter, a jeden błędny adres SMTP/MX blokował kolejkę.

## Co zmieniono

1. Dodano centralną walidację adresów odbiorców: `lib/bot/emailValidation.ts`.
   - Odrzuca adresy typu `kontakt@firma`, `info@localhost`, `test@chkuserr`, adresy bez poprawnej domeny i typowe no-reply.
   - Zabezpiecza przed błędem SMTP: `550 5.1.2 can't find a valid MX for rcpt domain`.

2. Email finder używa teraz walidatora przed zwróceniem adresu.
   - Bot nie powinien już dodawać do kolejki adresów bez realnej domeny.

3. Worker kolejki robi dodatkowy precheck przed SMTP.
   - Jeśli adres jest zły, rekord jest oznaczany jako `cancelled`, a nie `failed`.
   - Permanentne błędy odbiorcy/MX po SMTP również trafiają do `cancelled`, bez ponawiania co 30 minut.
   - Dzięki temu pojedynczy zły adres nie robi korka w `failed queue`.

4. Globalny limit `APP_MAX_FAILED_QUEUE` ma minimalną bezpieczną wartość 5.
   - Nawet jeśli w Vercelu przypadkiem ustawiono `APP_MAX_FAILED_QUEUE=1`, worker nie zatrzyma się po jednym błędnym mailu.

5. W panelu admina można anulować rekordy `failed` w kolejce.
   - Wcześniej anulowanie działało głównie dla `pending`, teraz obejmuje też `failed` i `processing`.

6. Targetowanie tekstylne jest lepiej rozwijane do fraz Google Places.
   - Zamiast fraz typu `b2b` / `wykorzystują tkaniny`, bot dodaje konkretne frazy: `drukarnia tekstylna`, `druk sublimacyjny`, `szwalnia`, `znakowanie odzieży`, `producent odzieży sportowej`, itd.

7. Jeśli bot w pojedynczej próbie nie znajdzie żadnego dobrego kontaktu, następna próba jest szybciej.
   - Domyślnie po 10 minutach, zamiast czekania całego interwału dziennego.
   - Można sterować ENV: `UNDER_TARGET_RETRY_MINUTES` od 3 do 60.

## Testy

- `npm run typecheck` ✅
- `npm test` ✅
- `npm run build` ✅

## Zalecenie po deployu

Po wdrożeniu warto w panelu anulować istniejący rekord `failed queue`, a potem kliknąć reset kampanii. Wysłane dziś maile zostaną zachowane.
