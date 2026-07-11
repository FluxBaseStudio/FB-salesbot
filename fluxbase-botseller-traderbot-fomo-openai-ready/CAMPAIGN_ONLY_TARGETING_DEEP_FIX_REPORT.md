# Campaign-only targeting deep fix

Najważniejsza zmiana: kampania jest jedynym źródłem prawdy dla wyszukiwania leadów.

## Co było nie tak

- Google Places dostawało zapytania zbyt mocno rozszerzane przez kod.
- Dla kampanii sportowych słowo „szkółka” mogło zostać potraktowane za szeroko i Google zwracało szkółki drzew/krzewów.
- Pozytywny filtr dopuszczał ogólne „szkółka”, więc szkółka roślin mogła przejść pierwszy etap.
- Domyślne/fallbackowe frazy z modelu biznesu mogły mieszać target z opisem oferty klienta.

## Co poprawiono

1. Usunięto generowanie zapytań z domyślnych presetów i modelu biznesu.
2. Google Places używa tylko pól kampanii:
   - search_keywords,
   - target_industries,
   - exact_target_business_type,
   - target_audience_niche,
   - target_customer_description,
   - target_business_activities,
   - preferred_lead_profile,
   - must_have_signals,
   - required_online_signals,
   - lead_qualification_rules.
3. Oferta klienta, opis klienta i promowana usługa nie są używane do wyszukiwania firm.
4. Jeżeli admin wpisał `search_keywords`, to pole ma pierwszeństwo i bot nie dobiera dodatkowych branż spoza kampanii.
5. Zablokowano niebezpieczne zapytanie „szkółka” bez doprecyzowania sport/piłka.
6. Dla kampanii sportowych dodano twardy bezpiecznik przeciw:
   - szkółkom drzew,
   - szkółkom krzewów,
   - szkółkom roślin,
   - gospodarstwom szkółkarskim,
   - centrom ogrodniczym,
   - choinkom,
   - kwiaciarniom.
7. Dla kampanii klubowych filtr pozytywny wymaga, aby Places wyglądało jak klub, akademia, szkoła, organizacja, stowarzyszenie, związek albo marka sportowa.
8. Prompt AI dostał ostrzejszą instrukcję, że nie wolno naciągać dopasowania i że szkółki roślin przy kampanii sportowej mają score 0-2.
9. Log `search_terms` pokazuje teraz: `Zapytania Google WYŁĄCZNIE z kampanii...` oraz metadata `rule: campaign_only_no_defaults`.

## Sprawdzenie

- `npm run typecheck` przeszło.
- `npm test` przeszło.
- `next build` skompilował projekt i wygenerował trasy, ale w tym środowisku komenda nie oddała procesu przed timeoutem narzędzia. Nie było błędów kompilacji w logu budowania.
