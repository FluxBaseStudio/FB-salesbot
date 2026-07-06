# Bot live status update

Dodano w panelu admina widoczny status pracy bota i kampanii.

## Co widać w panelu

Na dashboardzie pojawiła się sekcja „Co boty robią teraz”. Pokazuje m.in.:

- Bot szuka leadów / przygotowuje maile
- Bot wysyła wiadomość
- Czeka na akceptację maili
- Czeka na kolejną wysyłkę
- Czeka na kolejny automatyczny run
- Weekend, bot czeka
- Po godzinach pracy
- Bot zatrzymany ręcznie
- Bot w serwisie
- Brak przypisanego bota
- Gotowy do pracy
- Błąd w kolejce

## Gdzie dodano statusy

- Dashboard / Start
- Lista botów
- Lista kampanii
- Szczegóły kampanii

## Ważne

Status jest liczony z aktualnych danych: kampanii, botów, runów, logów i kolejki wysyłki. Nie wymaga dodatkowych tabel SQL.
