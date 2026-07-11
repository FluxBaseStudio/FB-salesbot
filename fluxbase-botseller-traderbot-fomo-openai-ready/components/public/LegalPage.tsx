import Link from "next/link";
import BotSellerLogo from "@/components/brand/BotSellerLogo";
import MarketingFooter from "@/components/public/MarketingFooter";

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="legal-page">
      <header className="marketing-nav compact">
        <Link className="marketing-brand" href="/"><BotSellerLogo variant="header" /></Link>
        <nav>
          <Link href="/botseller">Załóż SalesBota</Link>
          <Link href="/client/login">Panel klienta</Link>
        </nav>
      </header>
      <section className="legal-card">
        <p className="eyebrow">Dokument prawny</p>
        <h1>{title}</h1>
        <div className="legal-content">{children}</div>
      </section>
      <MarketingFooter />
    </main>
  );
}
