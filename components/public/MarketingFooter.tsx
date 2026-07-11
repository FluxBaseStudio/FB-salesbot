"use client";

import Link from "next/link";

import BotSellerLogo from "@/components/brand/BotSellerLogo";
import { useLanguage } from "@/components/i18n/LanguageContext";

const footerCopy = {
  pl: {
    brandLine: "AI prospecting, maile sprzedażowe i panel klienta.",
    body: "Automatyczny system pozyskiwania leadów, generowania pierwszych wiadomości i kontroli kampanii sprzedażowych.",
    product: "Produkt",
    home: "Strona główna",
    signup: "Załóż własnego SalesBota",
    clientLogin: "Zaloguj się do panelu",
    admin: "Panel administratora",
    docs: "Dokumenty",
    terms: "Regulamin",
    privacy: "Polityka prywatności",
    rodo: "RODO",
    cookies: "Polityka cookies",
    panels: "Panele",
    client: "Panel klienta",
    trader: "TraderBot – panel rynku",
  },
  en: {
    brandLine: "AI prospecting, sales emails and client panel.",
    body: "Automated system for lead generation, first-message drafting and sales campaign control.",
    product: "Product",
    home: "Home",
    signup: "Start your own SalesBot",
    clientLogin: "Log in to panel",
    admin: "Admin panel",
    docs: "Documents",
    terms: "Terms",
    privacy: "Privacy policy",
    rodo: "GDPR",
    cookies: "Cookie policy",
    panels: "Panels",
    client: "Client panel",
    trader: "TraderBot – market panel",
  },
};

export default function MarketingFooter() {
  const { language } = useLanguage();
  const t = footerCopy[language];

  return (
    <footer className="marketing-footer">
      <div className="footer-brand">
        <div className="footer-logo-row">
          <BotSellerLogo variant="header" />
          <span>{t.brandLine}</span>
        </div>
        <p>
          {t.body}
        </p>
      </div>

      <div className="footer-links-grid">
        <div>
          <h3>{t.product}</h3>
          <Link href="/">{t.home}</Link>
          <Link href="/botseller">{t.signup}</Link>
          <Link href="/client/login">{t.clientLogin}</Link>
          <Link href="/admin">{t.admin}</Link>
        </div>
        <div>
          <h3>{t.docs}</h3>
          <Link href="/regulamin">{t.terms}</Link>
          <Link href="/polityka-prywatnosci">{t.privacy}</Link>
          <Link href="/rodo">{t.rodo}</Link>
          <Link href="/cookies">{t.cookies}</Link>
        </div>
        <div>
          <h3>{t.panels}</h3>
          <Link href="/client">{t.client}</Link>
          <Link href="/client/login">{t.clientLogin}</Link>
          <Link href="/admin">{t.admin}</Link>
          <Link href="/trader">{t.trader}</Link>
        </div>
      </div>
    </footer>
  );
}
