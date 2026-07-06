import Link from "next/link";

import BotSellerLogo from "@/components/brand/BotSellerLogo";
import MarketingFooter from "@/components/public/MarketingFooter";
import { BOTSELLER_PLANS } from "@/lib/pricing";

const workflowSteps = [
  ["01", "Wybierasz target", "Branże, kraje, miasta, typ firm i zasady kwalifikacji leadów."],
  ["02", "Bot znajduje firmy", "Codziennie szuka dopasowanych biznesów w wybranym obszarze."],
  ["03", "Bot filtruje kontakty", "Firmy bez adresu email nie trafiają do Twojego panelu."],
  ["04", "AI pisze wiadomość", "Treść powstaje w stylu i tonie Twojej marki, z Twoim CTA."],
  ["05", "System wysyła stopniowo", "Kolejka rozkłada wysyłkę w godzinach pracy, mail po mailu."],
  ["06", "Ty odbierasz odpowiedzi", "Panel pokazuje wysłane, dostarczone, otwarte i reakcje."],
];

const heroQueue = [
  ["Studio Meblowe Nowak", "Wiadomość dostarczona", "delivered"],
  ["Kancelaria LexPartner", "Odpowiedź od leada", "replied"],
  ["Pracownia Reklamy 360", "Zaplanowano 11:24", "queued"],
];

const benefits = [
  ["Codzienny dopływ leadów", "Bot pracuje każdego dnia roboczego. Nie musisz pamiętać o prospectingu — rano kolejka już czeka."],
  ["Zero śmieciowych kontaktów", "Firmy bez maila i poza targetem są odrzucane, zanim zobaczysz je w panelu."],
  ["Wiadomości w Twoim stylu", "AI pisze na bazie Twojego opisu oferty, tonu i przykładowego maila. Bez szablonowego spamu."],
  ["Panel zamiast chaosu", "Wysłane, dostarczone, otwarte, odpowiedzi i follow-upy w jednym czytelnym widoku."],
];

const audience = ["Agencje", "Firmy usługowe", "Software house'y", "Lokalne biznesy", "B2B", "Logistyka i produkcja"];

const trustPoints = [
  ["Warm-up kampanii", "Admin ustawia własne progi dzienne, np. 5 → 10 → 25 → 50 albo 25 → 50. Po ostatnim progu bot trzyma ostatnią wartość."],
  ["Wysyłka w godzinach pracy", "Kolejka działa w oknie ustawionym w kampanii. Limit i odstępy wynikają z ręcznego schedule warm-upu."],
  ["Lista wypisów i suppression", "Jedno kliknięcie „wypisz mnie” trwale blokuje adres. Bot nigdy nie napisze drugi raz."],
  ["Follow-up z umiarem", "Maksymalnie kilka delikatnych przypomnień, z odstępem, który sam ustalasz."],
];

const faq = [
  ["Czy firmy bez maila trafiają do panelu?", "Nie. Bot pomija je przed zapisem, żeby panel klienta pokazywał tylko realne leady gotowe do kontaktu."],
  ["Czy bot wysyła wszystkie maile naraz?", "Nie. Każdy cykl kampanii szuka maksymalnie jednego leada i dodaje jedną wiadomość do kolejki, a worker wysyła stopniowo."],
  ["Czy mogę wybrać kraje Europy?", "Tak. Możesz działać w Polsce, całej Europie, wybranych krajach, województwach albo własnej liście miast."],
  ["Czy bot pisze maile moim stylem?", "Tak. W formularzu dodajesz opis oferty, przykładowy mail, ton komunikacji, CTA i rzeczy, których bot ma unikać."],
  ["Czy mogę dodać załączniki?", "Tak. Załączniki kampanii są dołączane do wiadomości wysyłanych w tej kampanii."],
  ["Jak działa warm-up?", "Nowa skrzynka zaczyna od 5 maili dziennie, potem rośnie codziennie o 5: 10, 15, 20, aż do docelowego limitu kampanii, np. 50."],
  ["Czy wysłane oznacza dostarczone?", "W BotSeller przyjęcie wiadomości przez SMTP liczymy w panelu jako dostarczone."],
];

const seoTopics = [
  [
    "Automatyzacja maili sprzedażowych",
    "FluxBase BotSeller pomaga firmom, które chcą regularnie wysyłać pierwsze wiadomości do nowych klientów B2B bez ręcznego kopiowania adresów, pisania maili od zera i pilnowania follow-upów.",
  ],
  [
    "Pozyskiwanie leadów B2B",
    "System wyszukuje firmy według branży, lokalizacji, kraju, województwa, typu działalności i zasad kwalifikacji. Dzięki temu kampania może być kierowana do konkretnych firm, a nie do przypadkowej bazy kontaktów.",
  ],
  [
    "Cold mailing z AI",
    "AI przygotowuje wiadomości w stylu marki, z opisem oferty, argumentami sprzedażowymi i wybranym CTA. To rozwiązanie dla osób szukających narzędzia do cold mailingu, prospectingu i automatyzacji sprzedaży.",
  ],
  [
    "Bezpieczna wysyłka z Gmail SMTP",
    "BotSeller wysyła wiadomości stopniowo, korzysta z warm-upu i działa z kontem SMTP klienta. Dzięki temu automatyczna wysyłka maili nie wygląda jak jednorazowy wystrzał z armaty spamowej.",
  ],
];

const searchPhrases = [
  "automatyzacja maili",
  "automatyczna wysyłka maili",
  "automatyczne maile do klientów",
  "automatyczna maili",
  "bot do wysyłania maili",
  "AI sales bot",
  "bot sprzedażowy AI",
  "pozyskiwanie leadów B2B",
  "lead generation Polska",
  "cold mailing narzędzie",
  "prospecting B2B",
  "follow-up automation",
  "system do kampanii mailowych",
  "FluxBase BotSeller",
];

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "FluxBase",
    url: "https://www.fluxbase.pl",
    logo: "https://www.fluxbase.pl/icon.png",
    sameAs: ["https://www.fluxbase.pl"],
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "FluxBase BotSeller",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "AI Sales Bot do automatyzacji maili, prospectingu B2B, pozyskiwania leadów, cold mailingu i follow-upów.",
    url: "https://www.fluxbase.pl/",
    offers: BOTSELLER_PLANS.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      price: plan.pricePln,
      priceCurrency: "PLN",
      availability: "https://schema.org/InStock",
      url: "https://www.fluxbase.pl/botseller",
    })),
    featureList: [
      "automatyzacja maili",
      "pozyskiwanie leadów B2B",
      "AI cold mailing",
      "follow-upy",
      "panel klienta",
      "wysyłka SMTP",
      "warm-up skrzynki",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  },
];

const planFeatures = (daily: number, description: string) => [
  `${daily} maili dziennie`,
  description,
  "Wiadomości AI w stylu Twojej marki",
  "Warm-up, kolejka i follow-upy",
  "Panel klienta ze statystykami",
];

export default function LandingPage() {
  return (
    <main className="marketing-page marketing-v2 lp">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <header className="marketing-nav marketing-nav-v2">
        <Link className="marketing-brand" href="/">
          <BotSellerLogo variant="header" />
        </Link>
        <nav>
          <a href="#jak-dziala">Jak działa</a>
          <a href="#korzysci">Korzyści</a>
          <a href="#pakiety">Pakiety</a>
          <a href="#bezpieczenstwo">Bezpieczeństwo</a>
          <a href="#faq">FAQ</a>
          <Link className="nav-login" href="/client/login">Zaloguj się</Link>
          <Link className="nav-cta" href="/botseller">Załóż SalesBota</Link>
        </nav>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <p className="hero-pill">FluxBase BotSeller · AI Sales Bot</p>
          <h1>
            Twój handlowiec AI, który <em>codziennie</em> znajduje klientów i pisze do nich pierwszy
          </h1>
          <p className="lp-hero-sub">
            SalesBot każdego dnia szuka dopasowanych firm, odfiltrowuje te bez kontaktu, pisze wiadomości
            w stylu Twojej marki i wysyła je stopniowo, bezpiecznie dla Twojej skrzynki.
          </p>
          <div className="hero-actions">
            <Link className="primary-link lp-cta" href="/botseller">
              Załóż SalesBota w 10 minut
            </Link>
            <a className="secondary-link" href="#jak-dziala">Zobacz jak działa</a>
          </div>
          <div className="hero-points">
            <span>Bez śmieciowych leadów</span>
            <span>Wysyłka stopniowa i warm-up</span>
            <span>Panel klienta 24/7</span>
          </div>
        </div>

        <div className="lp-hero-visual" aria-hidden="true">
          <div className="lp-mockup">
            <div className="lp-mockup-topbar">
              <span className="lp-dot" />
              <span className="lp-dot" />
              <span className="lp-dot" />
              <strong>Panel klienta · BotSeller</strong>
            </div>
            <div className="lp-mockup-metrics">
              <div>
                <span>Wysłane dziś</span>
                <strong>27</strong>
                <small className="lp-up">+9 vs wczoraj</small>
              </div>
              <div>
                <span>Dostarczone</span>
                <strong>98,2%</strong>
                <small className="lp-up">stabilnie</small>
              </div>
              <div>
                <span>Odpowiedzi</span>
                <strong>6</strong>
                <small className="lp-up">+2 nowe</small>
              </div>
            </div>
            <div className="lp-mockup-chart">
              <div className="lp-chart-head">
                <span>Wysyłka w tym tygodniu</span>
                <b>ostatnie 7 dni</b>
              </div>
              <div className="lp-bars">
                {[42, 58, 47, 72, 64, 88, 76].map((height, index) => (
                  <i key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
            <div className="lp-mockup-queue">
              {heroQueue.map(([name, detail, tone]) => (
                <div key={name} className="lp-queue-row">
                  <div>
                    <strong>{name}</strong>
                    <span>{detail}</span>
                  </div>
                  <i className={`lp-queue-status ${tone}`} />
                </div>
              ))}
            </div>
          </div>
          <div className="lp-float-card lp-float-a">
            <strong>AI pisze wiadomość</strong>
            <span>„Dzień dobry, widziałem stronę Państwa studia…”</span>
          </div>
          <div className="lp-float-card lp-float-b">
            <strong>Nowa odpowiedź</strong>
            <span>„Proszę o wycenę i szczegóły oferty.”</span>
          </div>
        </div>
      </section>

      <section className="lp-audience-band">
        <span>Najlepiej działa tam, gdzie liczy się regularny pierwszy kontakt:</span>
        <div>
          {audience.map((item) => (
            <b key={item}>{item}</b>
          ))}
        </div>
      </section>

      <section className="seo-section" aria-labelledby="seo-title">
        <div className="section-heading left">
          <span className="eyebrow">SEO / AI Sales Bot</span>
          <h2 id="seo-title">Automatyzacja maili, cold mailing i leady B2B w jednym systemie</h2>
          <p>
            FluxBase BotSeller został zaprojektowany dla firm, które szukają narzędzia typu: automatyzacja maili,
            bot do wysyłania maili, AI Sales Bot, cold mailing, prospecting B2B, pozyskiwanie leadów i follow-upy.
          </p>
        </div>
        <div className="seo-grid">
          {seoTopics.map(([title, body]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <div className="seo-phrases" aria-label="Najważniejsze frazy wyszukiwania">
          {searchPhrases.map((phrase) => (
            <span key={phrase}>{phrase}</span>
          ))}
        </div>
      </section>

      <section className="soft-section" id="jak-dziala">
        <div className="section-heading left">
          <span className="eyebrow">Jak działa</span>
          <h2>Od targetu do odpowiedzi, bez ręcznego chaosu</h2>
          <p>Ty ustawiasz kierunek raz. Bot powtarza cały proces każdego dnia roboczego.</p>
        </div>
        <div className="workflow-grid">
          {workflowSteps.map(([number, title, body]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-benefits" id="korzysci">
        <div className="section-heading">
          <span className="eyebrow">Korzyści</span>
          <h2>System pracuje za Ciebie, Ty rozmawiasz z zainteresowanymi</h2>
        </div>
        <div className="lp-benefits-grid">
          {benefits.map(([title, body]) => (
            <article key={title}>
              <i className="lp-benefit-check" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4 10-11" />
                </svg>
              </i>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="schedule-section" id="bezpieczenstwo">
        <div className="schedule-copy">
          <span className="eyebrow">Bezpieczna wysyłka</span>
          <h2>Dostarczalność ważniejsza niż tempo</h2>
          <p>
            Bot działa w oknie ustawionym w kampanii i realizuje wysyłkę przez kolejkę. Każdy cykl szuka jednego
            leada, a limity dzienne wynikają z ręcznie wpisanego schedule warm-upu.
          </p>
          <div className="lp-trust-list">
            {trustPoints.map(([title, body]) => (
              <div key={title}>
                <strong>{title}</strong>
                <span>{body}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="schedule-visual" aria-label="Przykładowy harmonogram wysyłki">
          {["Start", "+2h", "+4h", "+6h", "+8h", "Koniec"].map((hour, index) => (
            <div key={hour} className={index % 2 ? "slot muted" : "slot"}>
              <span>{hour}</span>
              <strong>{index === 0 ? "start" : index === 5 ? "koniec" : "mail"}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel-preview-section">
        <div className="section-heading left">
          <span className="eyebrow">Panel klienta</span>
          <h2>Widzisz tylko wyniki, nie techniczną kolejkę</h2>
          <p>
            Panel pokazuje realnie wysłane leady i wiadomości — a nie szkice ani firmy bez adresu email.
            Logujesz się i od razu wiesz, co bot dziś dla Ciebie zrobił.
          </p>
          <Link className="secondary-link lp-inline-cta" href="/client/login">Zaloguj się do panelu</Link>
        </div>
        <div className="panel-stat-grid">
          {["Wysłane", "Dostarczone", "Otwarte", "Odpowiedzi", "Follow-upy", "Leady"].map((stat) => (
            <div key={stat}>{stat}</div>
          ))}
        </div>
      </section>

      <section className="plans-section plans-section-v2" id="pakiety">
        <div className="section-heading">
          <span className="eyebrow">Pakiety</span>
          <h2>Wybierz rytm pracy swojego SalesBota</h2>
          <p>Jasny limit dzienny, płatność Stripe i aktywacja po ręcznej weryfikacji przez FluxBase.</p>
        </div>
        <div className="plans-grid plans-grid-v2">
          {BOTSELLER_PLANS.map((plan) => (
            <article className={plan.recommended ? "plan-card featured" : "plan-card"} key={plan.id}>
              {plan.recommended ? <span className="pill">Najczęstszy wybór</span> : null}
              <h3>{plan.name.replace("BotSeller ", "")}</h3>
              <div className="lp-plan-price">
                <strong>{plan.pricePln.toLocaleString("pl-PL")} zł netto</strong>
                <span>{plan.billingType === "subscription" ? "/ miesiąc" : "/ 5 dni"}</span>
              </div>
              <ul className="lp-plan-features">
                {planFeatures(plan.dailyEmails, plan.shortDescription).map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link className={plan.recommended ? "lp-plan-cta featured" : "lp-plan-cta"} href="/botseller">
                Wybierz plan
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="section-heading">
          <span className="eyebrow">FAQ</span>
          <h2>Najczęstsze pytania</h2>
        </div>
        <div className="faq-grid">
          {faq.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <span className="eyebrow lp-cta-eyebrow">Gotowy na start?</span>
        <h2>Skonfiguruj swojego SalesBota jeszcze dziś</h2>
        <p className="lp-final-sub">
          Formularz zajmuje około 10 minut. Płatność Stripe, ręczna weryfikacja i start kampanii pod okiem FluxBase.
        </p>
        <Link className="primary-link lp-cta" href="/botseller">Załóż SalesBota</Link>
      </section>

      <MarketingFooter />
    </main>
  );
}
