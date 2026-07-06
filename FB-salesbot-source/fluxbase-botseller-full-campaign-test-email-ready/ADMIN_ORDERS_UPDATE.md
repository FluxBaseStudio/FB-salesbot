# Aktualizacja panelu zamówień BotSeller

W tej wersji poprawiono panel administratora zgodnie z prośbą o pełną kontrolę nad zamówieniami.

## Dodane funkcje

- Pełny, kartowy widok zamówień zamiast ciasnej tabeli.
- Lepsza czytelność każdej rubryki: firma, kontakt, pakiet, płatność, kampania, SMTP, Stripe, aktywacja i faktura.
- Edycja zamówienia z panelu admina.
- Możliwość edycji pól:
  - dane firmy,
  - NIP,
  - dane kontaktowe,
  - faktura VAT,
  - pakiet,
  - cena,
  - limit dzienny,
  - limit miesięczny,
  - status zamówienia,
  - lokalizacja,
  - branże,
  - opis firmy,
  - promowana usługa,
  - wartość oferty,
  - klient docelowy,
  - problemy klientów,
  - czego AI ma unikać,
  - CTA,
  - ton komunikacji,
  - SMTP host,
  - SMTP port,
  - SSL,
  - SMTP user,
  - SMTP from,
  - Reply-To,
  - Stripe Checkout Session ID,
  - Stripe Customer ID,
  - Stripe Subscription ID,
  - Stripe payment status,
  - Stripe Price ID,
  - Stripe Product ID,
  - data płatności,
  - converted client ID,
  - converted campaign ID,
  - notatka/błąd płatności.
- Możliwość usunięcia zamówienia.
- Możliwość aktywacji opłaconego zamówienia.
- Możliwość odrzucenia zamówienia.
- Możliwość nadpisania SMTP pass / Gmail App Password.
- Możliwość wyczyszczenia zapisanego SMTP pass.
- Poprawiona responsywność panelu admina na telefonie i wąskich ekranach.
- Naprawione duplikowanie `paid_at` w `supabase/schema.sql`.

## Ważne o haśle Gmail SMTP

Nie zmieniłem systemu tak, aby przechowywał i wyświetlał hasło Gmail w zwykłym tekście.

Powód: 16-znakowe Gmail App Password daje realny dostęp do wysyłki z konta klienta. Wyświetlanie go w panelu oznaczałoby, że każdy, kto otworzy panel lub przechwyci odpowiedź API, zobaczy sekret skrzynki.

Zamiast tego panel pozwala:

- zobaczyć, czy hasło jest zapisane,
- zobaczyć końcówkę hasła,
- wkleić nowe hasło,
- wyczyścić zapisane hasło,
- zapisać nowe hasło zaszyfrowane po stronie serwera.

To daje kontrolę operacyjną bez trzymania sekretów jako zwykłego tekstu w przeglądarce.

## Testy wykonane

```bash
npm ci --no-audit --no-fund
npx tsc --noEmit
NEXT_TELEMETRY_DISABLED=1 npm run build
```

Status: TypeScript OK, build OK.
