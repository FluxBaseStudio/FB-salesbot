# Limits dashboard summary update

Zmiana dotyczy kafelka **Subskrypcja i użycie / Limity kampanii** w panelu admina.

## Co zmieniono

- Panel nie pokazuje już `0 / 1` jako sztucznego fallbacku.
- API admina zwraca `usageSummary` z realnym podsumowaniem wszystkich aktywnych kampanii.
- Kafelek limitów pokazuje teraz:
  - wysłane w tym miesiącu / cel miesięczny kampanii,
  - wysłane dzisiaj / dzisiejszy limit kampanii,
  - ile zostało do wysłania dzisiaj,
  - ile zostało do wysłania w miesiącu,
  - ile aktywnych kampanii ma poprawnie policzone limity,
  - ile aktywnych kampanii ma braki konfiguracji.
- Limity sumują aktywne kampanie na podstawie realnych wartości z kampanii: `daily_limit`, `warmup_daily_limits`, `monthly_limit`, `send_on_weekends`, `created_at` i klienta.
- Jeżeli kampania nie ma konfiguracji limitu, trafia do licznika „Brak konfiguracji”, zamiast dostawać domyślny limit.

## Zmienione pliki

- `app/api/admin-data/route.ts`
- `lib/types.ts`
- `components/admin/adminShared.tsx`
- `components/admin/adminSections.tsx`
- `app/globals.css`

## Weryfikacja

`npm run build` przeszedł poprawnie.
