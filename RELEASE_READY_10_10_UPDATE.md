# FluxBase BotSeller — release ready 10/10 update

W tej wersji domknięto ostatnie blokery produkcyjne znalezione po audycie paczki:

1. Aktywacja kampanii przez szybki przycisk `Aktywuj` przechodzi teraz przez walidację bota.
   - Kampania nie może zostać aktywowana bez przypisanego bota.
   - Kampania nie może zostać aktywowana z botem nieaktywnym.
   - Kampania nie może zostać aktywowana, jeśli bot przekroczył limit aktywnych kampanii.

2. Usuwanie bota zostało zabezpieczone.
   - Admin nie usunie bota, który ma aktywne kampanie.
   - System zwraca czytelny komunikat, aby najpierw wstrzymać kampanie albo przypisać innego bota.

3. Panel klienta pokazuje pełne maile do akceptacji.
   - Odbiorca.
   - Temat.
   - Pełna treść wiadomości.
   - Przyciski Akceptuj / Odrzuć.
   - Maile oczekujące na akceptację są pobierane niezależnie od aktualnego filtra dat.

4. Ostatnie wysyłki w panelu klienta nie mieszają już szkiców z realnymi wysyłkami.

5. `.env.example` został uzupełniony o brakujące zmienne używane w kodzie.

6. Strony RODO i polityki prywatności nie mają już tekstów typu „uzupełnić przed publikacją”. Zostawiono neutralną informację, że przy wdrożeniu pod konkretną firmą należy wpisać pełne dane rejestrowe.

Build sprawdzony komendą:

```bash
npm run build
```

Wynik:
- kompilacja OK,
- TypeScript OK,
- generowanie routingu OK.

Uwaga: w środowisku sandbox proces Next.js wypisał kompletną tabelę routingu, ale komenda została przerwana timeoutem narzędzia po finalizacji. W logach nie było błędów kompilacji ani TypeScript.
