# FluxBase BotSeller - Scheduled Queue + Europe Targeting Update

## Co dodano

### 1. Planer dnia + ukryta kolejka wysyłki
- `/api/cron/run-campaigns` nie wysyła maili hurtowo.
- Cron planuje dzień kampanii i zapisuje wiadomości do ukrytej tabeli `send_queue`.
- Leady i wiadomości pojawiają się w panelu dopiero po udanej wysyłce SMTP.
- Firmy bez e-maila nie są zapisywane w panelu.

### 2. Worker wysyłkowy
- Nowy endpoint: `/api/cron/send-worker`.
- Worker sprawdza rekordy `send_queue`, których `scheduled_at <= now`.
- Wysyła małe porcje wiadomości, domyślnie `SEND_WORKER_BATCH_SIZE=3`.
- Po błędzie usuwa widoczny lead/message, więc panel pozostaje czysty.

### 3. Automatyczny warm-up dzienny
- Domyślna sekwencja: `5,8,13,15,17`.
- Potem limit rośnie o `WARMUP_AFTER_SEQUENCE_STEP`, domyślnie +5 dziennie.
- System dochodzi stopniowo do docelowego limitu dziennego kampanii/klienta, np. 50 maili dziennie.

### 4. Rozłożenie maili w godzinach pracy
- Kampania ma pola:
  - `workday_start_hour`, domyślnie 6
  - `workday_end_hour`, domyślnie 16
  - `sending_timezone`, domyślnie `Europe/Warsaw`
- Przykład: 50 maili w godzinach 06:00-16:00 daje około 1 mail co 12 minut.

### 5. Europa i kraje europejskie
- Dodano wybór obszaru:
  - Cała Polska
  - Cała Europa
  - Wybrane kraje Europy
  - Wybrane województwa
  - Własne miasta
- Lista krajów Europy rozwija się automatycznie na miasta większe, średnie i mniejsze.

### 6. Precyzyjniejsze wyszukiwanie leadów
Dodano pola kampanii i onboardingu klienta:
- konkretny typ firm
- czym firmy się zajmują
- preferowana wielkość firmy
- słowa kluczowe do wyszukiwania
- słowa wykluczające
- wymagane sygnały
- firmy wykluczone
- idealny profil leada

## Wymagane po wdrożeniu

1. Odpal w Supabase SQL Editor:

```sql
supabase/schema.sql
```

2. W Vercel dodaj/upewnij się, że masz env:

```env
CRON_SECRET=losowy_długi_klucz
SEND_WORKER_BATCH_SIZE=3
SEND_QUEUE_MAX_ATTEMPTS=3
WARMUP_DAILY_SEQUENCE=5,8,13,15,17
WARMUP_AFTER_SEQUENCE_STEP=5
WARMUP_STAGE_DAYS=1
```

3. Cron co minutę dla `/api/cron/send-worker` wymaga Vercel Pro. Na Hobby Vercel nie obsłuży takiej częstotliwości.
