# Responsive fix report

Zakres zmian: wyłącznie responsywność i zachowanie layoutu na laptopach, tabletach i telefonach.

## Zmienione obszary

- Dodano globalny `viewport` w `app/layout.tsx`.
- Utwardzono szerokości i `min-width: 0`, żeby teksty, inputy i tabele nie rozpychały kart.
- Poprawiono panel admina: sidebar, nagłówki, akcje, formularze, siatki metryk, filtry, szczegóły klienta, zamówienia i tabele.
- Poprawiono ekran `Klienci`: panel szczegółów schodzi niżej na laptopowych szerokościach, a formularz nie ściska pól.
- Poprawiono tabele: desktop ma przewijanie poziome, mobile zmienia tabele w czytelne karty z etykietami.
- Poprawiono landing, `/botseller`, pricing, formularz publiczny, stepper, upload plików, cookie banner i stopkę.
- Dodano breakpoints dla dużych laptopów, tabletów, małych telefonów i bardzo wąskich ekranów.

## Test

- `npm ci` OK
- `npm run build` OK
- Podstawowe trasy zwracają 200: `/`, `/botseller`, `/admin`, `/client/login`, `/polityka-prywatnosci`, `/regulamin`, `/rodo`, `/cookies`
