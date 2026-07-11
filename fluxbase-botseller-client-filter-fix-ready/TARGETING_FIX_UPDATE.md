# Targeting fix update

Poprawka rozdziela dwie rzeczy:

1. **Kogo bot ma szukać** – pola targetu, np. kluby sportowe, akademie, szkoły.
2. **Co klient sprzedaje** – oferta, np. odzież sportowa, koszulki, nadruki.

Przed poprawką bot mógł używać zbyt szerokich opisów potrzeb/oferty jako inspiracji do Google Places, przez co znajdował producentów odzieży, sklepy z koszulkami albo drukarnie zamiast klubów i organizacji sportowych.

## Zmienione pliki

- `lib/bot/dailyPlanner.ts`
  - Google Places używa teraz tylko bezpiecznych pól targetu.
  - Długie zdania opisujące potrzeby targetu nie trafiają już jako główne zapytania wyszukiwania.
  - Dodano twardy filtr rozpoznający typy targetu, np. klub, akademia, szkoła, organizacja.
  - Jeśli kampania szuka klubów/akademii/szkół, wynik typu producent odzieży albo sklep z koszulkami zostanie pominięty przed szukaniem emaila.

- `lib/bot/aiLead.ts`
  - AI dostało jasną zasadę, że oferta klienta opisuje nadawcę, a nie target.
  - AI ma oceniać nisko firmy, które są dostawcami/producentami podobnego produktu zamiast potencjalnymi kupującymi.

- `components/admin/adminSections.tsx`
  - Ulepszono opisy pól w programowaniu kampanii.
  - Pole „Jakich firm szukamy?” ostrzega, żeby nie wpisywać produktu/oferty.
  - Pole „Czym zajmują się te firmy?” nie służy już jako główne zapytanie Google.

## Test

- `npx tsc --noEmit` przeszedł bez błędów.
- `npm run build` przeszedł kompilację i TypeScript. Proces został przerwany przez limit czasu narzędzia podczas generowania statycznych stron, bez błędów w kodzie.
