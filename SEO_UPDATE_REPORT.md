# SEO update - FluxBase BotSeller

Dodano rozbudowane SEO dla FluxBase BotSeller:

- globalne metadata Next.js: title template, description, keywords, canonical, Open Graph, Twitter Card,
- osobne metadata dla `/botseller`, żeby formularz sprzedażowy indeksował się pod frazy zakupowe,
- `app/sitemap.ts` generujący `/sitemap.xml`,
- `app/robots.ts` generujący `/robots.txt` z indeksowaniem publicznych stron i blokadą panelu/API,
- `app/manifest.ts` generujący `/manifest.webmanifest`,
- dane strukturalne JSON-LD: Organization, SoftwareApplication, FAQPage,
- widoczną sekcję SEO na landing page z frazami: automatyzacja maili, automatyczna wysyłka maili, bot do wysyłania maili, AI Sales Bot, leady B2B, cold mailing, prospecting B2B itd.,
- responsywne style sekcji SEO w `app/globals.css`.

Build produkcyjny po zmianach przeszedł poprawnie przez `npm run build`.
