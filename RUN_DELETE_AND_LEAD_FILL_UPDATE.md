# Update: usuwanie runów + lepsze dobijanie dziennego celu leadów

## Co dodano

1. Panel admina / Runy:
   - przy każdym runie dodano przycisk `Usuń run`,
   - usunięcie runa usuwa też powiązane `run_logs`,
   - nie usuwa leadów, wiadomości ani kolejki wysyłki.

2. API admina:
   - dodano obsługę `campaign_runs` jako zasobu tylko do usuwania,
   - operacja jest zapisywana w audycie.

3. Planner kampanii:
   - zwiększono liczbę wyników pobieranych z Google Places na zapytanie, minimum 5,
   - dodano rozszerzenia targetowania dla klubów, akademii, szkółek i organizacji sportowych,
   - bot dalej nie używa opisu oferty jako targetu,
   - dodano log `under_target`, gdy bot nie dobije do dziennego celu.

## Dlaczego bot mógł znaleźć tylko 1 lead przy warm-up 5

Warm-up 5 oznacza maksymalną liczbę maili, którą system może dzisiaj zaplanować/wysłać. To nie jest gwarancja, że bot zawsze znajdzie 5 kwalifikowanych leadów.

Lead musi przejść po kolei:
- target Google Places,
- filtr typu firmy,
- znalezienie emaila,
- blacklistę,
- duplikaty,
- minimalny score AI,
- limity kolejki.

Jeśli większość wyników nie ma emaila albo dostaje niski score, bot zaplanuje mniej niż limit. Teraz panel zapisze to jako `under_target`, żeby było widać, gdzie przepadły leady.
