# Campaign reset button update

Dodano bezpieczny reset kampanii w panelu admina.

## Co zostało dodane

- Nowy endpoint: `POST /api/campaigns/[id]/reset`.
- Przycisk `Resetuj kampanię` w tabeli kampanii.
- Przycisk `Resetuj` przy kampaniach w szczegółach klienta.
- Komunikat potwierdzający przed resetem.

## Jak działa reset

Reset kampanii:

- czyści `locked_at` i `locked_by` kampanii,
- usuwa globalne locki runnera/crona, jeśli zostały zawieszone,
- zamyka runy kampanii wiszące w statusie `running`,
- anuluje dzisiejszą niewysłaną kolejkę kampanii: `awaiting_approval`, `pending`, `processing`, `failed`,
- nie usuwa i nie zeruje wiadomości faktycznie wysłanych dziś,
- ustawia `next_run_at` na teraz, jeżeli kampania jest w oknie pracy, albo na najbliższy start okna pracy,
- zeruje `consecutive_send_failures`, `paused_reason` i `paused_at`.

Dzięki temu po resecie bot zaczyna świeżą próbę, ale dzisiejszy licznik wysłanych maili zostaje zachowany. Jeżeli dzienny limit to 10, a wysłano już 4, bot będzie mógł dobić tylko brakujące 6.

## Weryfikacja

- `npm ci`
- `npm run build` zakończone sukcesem.
