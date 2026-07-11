# Bot stop / resume control update

Dodano produkcyjną opcję zatrzymania i wznowienia bota.

## Co się zmieniło

- W zakładce **Boty** pojawił się przycisk **Zatrzymaj** dla aktywnego bota.
- Dla zatrzymanego bota pojawia się przycisk **Wznów**.
- Status bota jest zapisywany przez backendową akcję `updateStatus`, a nie tylko lokalnie w UI.
- Backend waliduje status bota przez `BOT_STATUSES`.
- Planner kampanii nie planuje kampanii, jeśli przypisany bot jest zatrzymany ręcznie.
- Run logs pokazują stage `bot_stopped` albo `bot_maintenance`, aby było jasne, dlaczego bot nie pracuje.
- Worker kolejki nie wyśle maila z kampanii przypisanej do zatrzymanego bota. Rekord kolejki wraca do `pending` i sprawdza się ponownie za godzinę.

## Efekt

Można bezpiecznie zatrzymać bota bez kasowania kampanii, bez usuwania kolejki i bez ryzyka, że worker wyśle maile mimo zatrzymania.

## Sprawdzenie

- `npx tsc --noEmit` przeszedł bez błędów.
- `npm run build` przeszedł kompilację, TypeScript i wygenerował routing Next.js. Proces w sandboxie zakończył się timeoutem dopiero po finalnej tabeli routingu.
