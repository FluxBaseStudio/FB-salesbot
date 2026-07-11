# Package scope, European locations and message language update

## What changed

- Public `/botseller` form now limits location choices by package:
  - Poland packages show only: `Cała Polska` and `Wybrane województwa`.
  - Pro shows only: `Cała Europa` and `Wybrane kraje Europy`.
- Server-side signup order validation also enforces the package scope, so the browser cannot bypass the package/location rules.
- Admin order editing uses the selected package to limit visible location options.
- Campaign location presets now include a larger European country/city database with major, medium and smaller cities.
- `Cała Europa` now expands to European locations outside Poland. Polish campaigns still use the Poland/voivodeship presets.
- Google Places search uses Polish language results for Polish locations and English results for European/non-Polish locations.
- AI-generated first emails now follow the language rule:
  - Polish locations/campaigns → Polish emails.
  - Non-Polish European locations/campaigns → English emails.
- Follow-ups and opt-out footer text also switch between Polish and English based on the campaign/location.

## Files changed

- `app/botseller/page.tsx`
- `components/admin/adminSections.tsx`
- `components/admin/adminShared.tsx`
- `lib/locationOptions.ts`
- `lib/bot/locationPresets.ts`
- `lib/bot/googlePlaces.ts`
- `lib/bot/dailyPlanner.ts`
- `lib/bot/aiLead.ts`
- `lib/bot/messageWorkflow.ts`
- `lib/bot/mailer.ts`
- `lib/signupOrder.ts`

## Build

`npm run build` passed successfully.

## Notes

No new environment variables are required.
No destructive SQL migration is required for this update.
