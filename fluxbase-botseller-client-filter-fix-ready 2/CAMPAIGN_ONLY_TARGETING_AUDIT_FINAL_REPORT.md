# Campaign-only targeting final audit

## Cel
Bot ma używać kampanii jako jedynego źródła prawdy dla Google Places i kwalifikacji leadów. Oferta klienta nie może robić za target.

## Sprawdzone obszary
- generator zapytań Google Places w `lib/bot/dailyPlanner.ts`
- filtr pozytywny i negatywny targetu
- blokada szkółek roślin dla kampanii sportowych
- logowanie `search_terms`
- kwalifikacja AI w `lib/bot/aiLead.ts`
- kolejka wysyłki i walidacja maili

## Wynik audytu
Kod z poprzedniego ZIP-a był w dobrym kierunku, ale znalazłem jeszcze jedną ryzykowną rzecz: krótkie ogólne wyrazy z kampanii, np. `klubów`, `marek`, `organizacji`, mogły wpaść jako surowe zapytania Google, zanim system dopisał precyzyjne frazy typu `klub sportowy` albo `marka sportowa`.

## Poprawka po audycie
Dodałem blokadę surowych, ogólnych zapytań jedno- lub mało-znaczeniowych:
- `klub`, `kluby`, `klubów`
- `akademia`, `akademii`
- `organizacja`, `organizacje`, `organizacji`
- `marka`, `marki`, `marek`, `brand`
- `szkoła`, `szkółka`

Te słowa nie są już wysyłane same do Google Places. Bot może ich użyć tylko do zbudowania konkretnego zapytania wynikającego z kampanii, np.:
- `klub sportowy`
- `akademia sportowa`
- `akademia piłkarska`
- `szkółka piłkarska`
- `szkółka sportowa`
- `organizacja sportowa`
- `stowarzyszenie sportowe`
- `związek sportowy`
- `marka sportowa`

## Zasada po poprawce
Google Places dostaje wyłącznie konkretne zapytania z kampanii. Nie dostaje domyślnych wartości, oferty klienta ani ogólnych opisów typu `B2B`, `firmy`, `sport`, `odzież`, `produkcja`, `personalizacja`.

## Testy
- `npm run typecheck` OK
- `npm test` OK
- `npm run build` OK
