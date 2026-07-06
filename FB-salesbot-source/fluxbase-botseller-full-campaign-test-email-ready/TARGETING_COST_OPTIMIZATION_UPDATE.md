# Targeting cost optimization update

Cel: ograniczyć niepotrzebne użycie OpenAI przez tańsze filtrowanie leadów przed generowaniem maila.

Zmiany:

1. Google Places zwraca więcej tanich sygnałów przed AI:
   - address,
   - primaryType,
   - types.

2. Pre-AI target filter w `dailyPlanner.ts`:
   - odrzuca leady zgodne ze słowami wykluczającymi,
   - odrzuca leady, które nie wyglądają jak target z pola „Jakich firm szukamy”,
   - dodaje konserwatywne wykluczenia dostawców/konkurentów, np. przy kampanii dla klubów sportowych nie pali AI na sklepach sportowych, drukarniach i producentach odzieży,
   - przy kampaniach sprzedaży stron/marketingu nie pali AI na agencjach marketingowych i software house’ach, jeżeli targetem są firmy usługowe.

3. Pre-AI audit filter:
   - jeżeli kampania ma wymagane sygnały, system sprawdza je tanio na podstawie danych Google Places i audytu strony,
   - jeśli sygnałów nie ma, OpenAI nie jest uruchamiane dla takiego leada.

4. Email finder:
   - filtruje adresy typu noreply, donotreply, newsletter, unsubscribe, rodo/dpo/iod itd.,
   - wybiera lepsze adresy biznesowe typu kontakt, biuro, office, info, sales.

5. Preview AI:
   - zaktualizowano przykładowy `PlaceLead`, żeby pasował do rozszerzonego typu.

Weryfikacja:

- `npm run build` przeszedł poprawnie.

Efekt:

- Bot nadal szuka jednego leada przed jedną wysyłką,
- ale OpenAI odpala się później, dopiero po tańszych filtrach: target, blacklist/duplikat, email, audyt i wymagane sygnały.
