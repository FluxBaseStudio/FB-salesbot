# Multi-bot, approval workflow and runtime statuses update

Dodane w tej paczce:

1. Zakładka **Boty** w panelu admina.
   - Dodawanie bota.
   - Edycja/usuwanie bota.
   - Status bota: aktywny, pauza, serwis.
   - Limit aktywnych kampanii na bota, domyślnie 1.

2. Przypisanie bota do kampanii.
   - W formularzu kampanii można wybrać bota.
   - API blokuje przypisanie kolejnej aktywnej kampanii do bota, jeśli przekracza limit.
   - Kampania może zostać bez bota, ale przy większej skali zalecane jest 1 bot = 1 aktywna kampania.

3. Akceptacja maili przez klienta przed wysyłką.
   - Nowy przełącznik w kampanii: **Przed wysyłką poproś klienta o akceptację**.
   - Gdy jest włączony, bot generuje lead + mail jako szkic.
   - W panelu klienta pojawia się sekcja **Maile do akceptacji**.
   - Klient może kliknąć **Akceptuj** albo **Odrzuć**.
   - Po akceptacji mail trafia do `send_queue` i wysyła go worker według limitów oraz godzin pracy.

4. Praca w weekendy per kampania.
   - Nowy przełącznik: **Bot może pracować w weekendy**.
   - Jeśli wyłączony, kampania nie planuje i nie wysyła w soboty/niedziele.
   - Jeśli włączony, planner i worker mogą pracować również w weekend.

5. Czytelniejsze statusy pracy.
   - Worker respektuje weekendy per kampania.
   - `sendSafety` blokuje wysyłkę poza oknem pracy i zwraca status typu `OUTSIDE_WORK_HOURS` z terminem ponowienia.
   - Run logs pokazują m.in. `weekend_skip`, `weekend_postpone`, `approval_draft`, `send_queue_limit`.

6. Baza danych.
   - Dodano tabelę `bots`.
   - Dodano pola do `campaigns`: `bot_id`, `requires_approval_before_send`, `send_on_weekends`.
   - Zmiany są dopisane na końcu `supabase/schema.sql` jako `alter table if not exists`, więc można wkleić do Supabase SQL Editor.

Build:
- `next build` przeszedł kompilację, TypeScript, generowanie stron i pokazał finalną tabelę routingu.
- Proces w sandboxie nie zakończył się sam w limicie narzędzia, ale log builda doszedł do etapu końcowej tabeli tras bez błędów TypeScript.
