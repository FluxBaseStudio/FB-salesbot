# Campaign Targeting Smart Filter Fix

Naprawa problemu: kampanie wyglądały jak zacięte, ponieważ bot zbyt agresywnie odrzucał firmy na etapie `target_filter`, zanim sprawdził stronę i zanim AI mogło ocenić dopasowanie.

## Zmiany

1. Pozytywny filtr targetu został złagodzony.
   - Bot nie odrzuca już firmy tylko dlatego, że nazwa w Google Places nie zawiera dokładnej frazy z kampanii.
   - Twardy pozytywny filtr zostaje tylko dla jednoznacznych targetów typu klub, akademia, szkoła, organizacja.

2. Bot lepiej wykorzystuje pola z dodawania kampanii.
   - Do budowy fraz wyszukiwania bierze teraz także: `target_customer_description`, `target_business_activities`, `preferred_lead_profile`.

3. Dodano ekstrakcję konkretnych branż z długich opisów.
   - Jeśli admin wpisze długi opis typu drukarnie tekstylne, druk sublimacyjny, szwalnie, znakowanie odzieży, bot wyciąga krótkie frazy do Google Places.

4. Dodano automatyczne wykluczenia dla kampanii tekstylno-odzieżowych.
   - Bot mocniej omija biura rachunkowe, księgowość, wirtualne biura, coworkingi, agencje pracy, IT, kancelarie, hotele, restauracje itd.

## Efekt

Bot powinien mniej wyglądać jak zacięty, bo dobre firmy nie będą wyrzucane zbyt wcześnie przez `target_filter`. Jednocześnie oczywiste śmieciowe leady dalej są odrzucane bez OpenAI.
