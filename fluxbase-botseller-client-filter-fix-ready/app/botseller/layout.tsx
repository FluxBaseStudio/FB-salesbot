import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Załóż SalesBota | Automatyzacja maili i lead generation B2B",
  description:
    "Skonfiguruj FluxBase BotSeller: automatyczna wysyłka maili, pozyskiwanie leadów B2B, cold mailing, follow-upy, Gmail SMTP i panel klienta.",
  alternates: { canonical: "/botseller" },
  keywords: [
    "załóż sales bota",
    "automatyzacja maili B2B",
    "automatyczna wysyłka maili",
    "narzędzie do cold mailingu",
    "AI lead generation",
    "FluxBase BotSeller cennik",
    "bot do pozyskiwania klientów",
  ],
  openGraph: {
    title: "Załóż FluxBase BotSeller | Automatyzacja maili B2B",
    description:
      "Wybierz pakiet i uruchom AI Sales Bota, który znajduje leady, pisze maile i wysyła je stopniowo z Twojej skrzynki.",
    url: "/botseller",
    images: [{ url: "/botseller-hero.png", width: 1200, height: 630, alt: "FluxBase BotSeller konfiguracja kampanii" }],
  },
};

export default function BotSellerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
