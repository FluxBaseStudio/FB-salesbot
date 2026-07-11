import type { Metadata, Viewport } from "next";
import CookieBanner from "@/components/public/CookieBanner";
import { LanguageProvider } from "@/components/i18n/LanguageContext";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.fluxbase.pl";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "FluxBase BotSeller",
  title: {
    default: "FluxBase BotSeller | Automatyzacja maili, leady B2B i AI Sales Bot",
    template: "%s | FluxBase BotSeller",
  },
  description:
    "FluxBase BotSeller to AI Sales Bot do automatyzacji maili, prospectingu B2B, pozyskiwania leadów, cold mailingu, follow-upów i bezpiecznej wysyłki z panelu klienta.",
  keywords: [
    "automatyzacja maili",
    "automatyczna wysyłka maili",
    "automatyczne maile",
    "automatyczna maili",
    "AI Sales Bot",
    "sales bot",
    "FluxBase BotSeller",
    "BotSeller",
    "pozyskiwanie leadów",
    "leady B2B",
    "lead generation",
    "prospecting B2B",
    "cold mailing",
    "cold email",
    "kampanie mailowe",
    "follow-upy",
    "automatyzacja sprzedaży",
    "automatyzacja kontaktu z klientami",
    "wysyłka email z Gmail SMTP",
    "narzędzie do prospectingu",
    "AI do sprzedaży",
    "system do leadów",
    "FluxBase",
  ],
  authors: [{ name: "FluxBase", url: siteUrl }],
  creator: "FluxBase",
  publisher: "FluxBase",
  category: "SaaS, automatyzacja sprzedaży, lead generation",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: "/",
    siteName: "FluxBase BotSeller",
    title: "FluxBase BotSeller | Automatyzacja maili i leady B2B",
    description:
      "AI Sales Bot, który znajduje firmy, kwalifikuje leady, pisze wiadomości i wysyła maile stopniowo z Twojej skrzynki.",
    images: [
      {
        url: "/botseller-hero.png",
        width: 1200,
        height: 630,
        alt: "FluxBase BotSeller - automatyzacja maili i panel leadów B2B",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FluxBase BotSeller | Automatyzacja maili i leady B2B",
    description:
      "AI Sales Bot do prospectingu, cold mailingu, follow-upów i codziennego pozyskiwania leadów B2B.",
    images: ["/botseller-hero.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <LanguageProvider>
          {children}
          <CookieBanner />
        </LanguageProvider>
      </body>
    </html>
  );
}
