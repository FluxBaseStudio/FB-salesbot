"use client";

import Link from "next/link";

import BotSellerLogo from "@/components/brand/BotSellerLogo";

export default function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="footer-brand">
        <div className="footer-logo-row">
          <BotSellerLogo variant="header" />
          <span>AI prospecting, maile sprzedażowe i panel klienta.</span>
        </div>
        <p>
          Automatyczny system pozyskiwania leadów, generowania pierwszych wiadomości i kontroli kampanii sprzedażowych.
        </p>
      </div>

      <div className="footer-links-grid">
        <div>
          <h3>Produkt</h3>
          <Link href="/">Strona główna</Link>
          <Link href="/botseller">Załóż własnego SalesBota</Link>
          <Link href="/client/login">Zaloguj się do panelu</Link>
          <Link href="/admin">Panel administratora</Link>
        </div>
        <div>
          <h3>Dokumenty</h3>
          <Link href="/regulamin">Regulamin</Link>
          <Link href="/polityka-prywatnosci">Polityka prywatności</Link>
          <Link href="/rodo">RODO</Link>
          <Link href="/cookies">Polityka cookies</Link>
        </div>
        <div>
          <h3>Panele</h3>
          <Link href="/client">Panel klienta</Link>
          <Link href="/client/login">Logowanie klienta</Link>
          <Link href="/admin">Panel administratora</Link>
        </div>
      </div>
    </footer>
  );
}
