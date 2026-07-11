# LANGUAGE_SWITCHER_UPDATE

Dodano przełącznik języka PL/EN z flagami na stronie głównej oraz w panelu klienta.

## Zmienione elementy

- Dodano globalny `LanguageProvider`, który zapisuje wybrany język w `localStorage` pod kluczem `fluxbase-language`.
- Dodano komponent `LanguageSwitcher` z flagami 🇵🇱 i 🇬🇧.
- Dodano przełącznik w prawym górnym rogu na stronie głównej.
- Dodano przełącznik w prawym górnym rogu panelu klienta, obok filtrów daty i przycisku odświeżania.
- Po zmianie języka teksty na stronie głównej i w panelu klienta przełączają się między polskim i angielskim bez przeładowania strony.
- Dodano style CSS dla przełącznika, aktywnego języka i widoku mobilnego.

## Pliki

- `components/i18n/LanguageContext.tsx`
- `components/i18n/LanguageSwitcher.tsx`
- `app/layout.tsx`
- `components/public/LandingPage.tsx`
- `components/client/ClientPortalPage.tsx`
- `app/globals.css`

## Testy

- `npm run typecheck` zakończone poprawnie.
- `npm run build` zakończone poprawnie.
