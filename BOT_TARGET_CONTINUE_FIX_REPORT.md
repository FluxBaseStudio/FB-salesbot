# Bot target continue fix

Zmiany wprowadzone w `lib/bot/dailyPlanner.ts`:

1. Odrzucony lead nie zatrzymuje cyklu.
   - `target_filter` loguje teraz jasno, że bot szuka kolejnego kandydata.
   - Lead odrzucony przez target nie trafia do panelu i nie blokuje kampanii.

2. Szybsza ponowna próba, gdy nie ma dopasowanego leada.
   - Jeśli cykl nie doda maila do kolejki, `next_run_at` ustawia kolejną próbę domyślnie po 3 minutach.
   - Można zmienić przez `UNDER_TARGET_RETRY_MINUTES`.

3. Bezpiecznik przed timeoutem/zawieszeniem na Vercel.
   - Dodany limit czasu pojedynczego cyklu: domyślnie 45 sekund.
   - Po limicie bot zapisuje stan i wraca przy następnym ticku crona, zamiast zostać na ostatnim logu.
   - Można zmienić przez `LEAD_SEARCH_MAX_SECONDS`.

4. Lepsze targetowanie kampanii sportowych.
   - Bot tworzy dokładniejsze frazy Google Places z tego, co jest wpisane w kampanii: klub sportowy, akademia sportowa, szkółka sportowa, szkoła sportowa, organizacja sportowa, marka sportowa itd.
   - Dodatkowo dopasowuje dyscypliny, jeśli kampania zawiera piłkę nożną, siatkówkę, koszykówkę, sporty walki, fitness itd.

5. Mocniejszy filtr śmieciowych leadów dla kampanii sportowych.
   - Odrzuca m.in. sklep, serwis komputerowy, druk 3D, części/parts, motoryzację, drukarnie, szwalnie i szkółki roślin, jeśli kampania jest stricte sportowa.

6. Usunięty błąd techniczny w `globalSchedulerGuard`.
   - Była zdublowana deklaracja `maxActiveCampaigns`, która mogła wywalić typecheck/build.

Sprawdzone:
- `npx tsc --noEmit` OK
- `npm test` OK
- `npm run build` OK
