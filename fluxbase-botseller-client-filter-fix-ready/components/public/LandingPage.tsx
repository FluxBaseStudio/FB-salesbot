"use client";

import Link from "next/link";

import BotSellerLogo from "@/components/brand/BotSellerLogo";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { useLanguage, type Language } from "@/components/i18n/LanguageContext";
import MarketingFooter from "@/components/public/MarketingFooter";
import { BOTSELLER_PLANS, formatPlanPrice } from "@/lib/pricing";

const copy = {
  pl: {
    nav: ["Jak działa", "Korzyści", "Pakiety", "Bezpieczeństwo", "FAQ"],
    login: "Zaloguj się",
    signup: "Załóż SalesBota",
    heroPill: "FluxBase BotSeller · AI Sales Bot",
    heroTitle: <>Twój handlowiec AI, który <em>codziennie</em> znajduje klientów i pisze do nich pierwszy</>,
    heroSub:
      "SalesBot każdego dnia szuka dopasowanych firm, odfiltrowuje te bez kontaktu, pisze wiadomości w stylu Twojej marki i wysyła je stopniowo, bezpiecznie dla Twojej skrzynki.",
    heroCta: "Załóż SalesBota w 10 minut",
    heroSecondary: "Zobacz jak działa",
    heroPoints: ["Bez śmieciowych leadów", "Wysyłka stopniowa i warm-up", "Panel klienta 24/7"],
    mockup: {
      top: "Panel klienta · BotSeller",
      metrics: [["Wysłane dziś", "27", "+9 vs wczoraj"], ["Dostarczone", "98,2%", "stabilnie"], ["Odpowiedzi", "6", "+2 nowe"]],
      chart: "Wysyłka w tym tygodniu",
      days: "ostatnie 7 dni",
      queue: [["Studio Meblowe Nowak", "Wiadomość dostarczona", "delivered"], ["Kancelaria LexPartner", "Odpowiedź od leada", "replied"], ["Pracownia Reklamy 360", "Zaplanowano 11:24", "queued"]],
      floatA: ["AI pisze wiadomość", "„Dzień dobry, widziałem stronę Państwa studia…”"],
      floatB: ["Nowa odpowiedź", "„Proszę o wycenę i szczegóły oferty.”"],
    },
    audienceIntro: "Najlepiej działa tam, gdzie liczy się regularny pierwszy kontakt:",
    audience: ["Agencje", "Firmy usługowe", "Software house'y", "Lokalne biznesy", "B2B", "Logistyka i produkcja"],
    seo: {
      eyebrow: "SEO / AI Sales Bot",
      title: "Automatyzacja maili, cold mailing i leady B2B w jednym systemie",
      body: "FluxBase BotSeller został zaprojektowany dla firm, które szukają narzędzia typu: automatyzacja maili, bot do wysyłania maili, AI Sales Bot, cold mailing, prospecting B2B, pozyskiwanie leadów i follow-upy.",
      topics: [
        ["Automatyzacja maili sprzedażowych", "FluxBase BotSeller pomaga firmom, które chcą regularnie wysyłać pierwsze wiadomości do nowych klientów B2B bez ręcznego kopiowania adresów, pisania maili od zera i pilnowania follow-upów."],
        ["Pozyskiwanie leadów B2B", "System wyszukuje firmy według branży, lokalizacji, kraju, województwa, typu działalności i zasad kwalifikacji. Dzięki temu kampania może być kierowana do konkretnych firm, a nie do przypadkowej bazy kontaktów."],
        ["Cold mailing z AI", "AI przygotowuje wiadomości w stylu marki, z opisem oferty, argumentami sprzedażowymi i wybranym CTA. To rozwiązanie dla osób szukających narzędzia do cold mailingu, prospectingu i automatyzacji sprzedaży."],
        ["Bezpieczna wysyłka z Gmail SMTP", "BotSeller wysyła wiadomości stopniowo, korzysta z warm-upu i działa z kontem SMTP klienta. Dzięki temu automatyczna wysyłka maili nie wygląda jak jednorazowy wystrzał z armaty spamowej."],
      ],
      phrasesLabel: "Najważniejsze frazy wyszukiwania",
    },
    phrases: ["automatyzacja maili", "automatyczna wysyłka maili", "automatyczne maile do klientów", "automatyczna maili", "bot do wysyłania maili", "AI sales bot", "bot sprzedażowy AI", "pozyskiwanie leadów B2B", "lead generation Polska", "cold mailing narzędzie", "prospecting B2B", "follow-up automation", "system do kampanii mailowych", "FluxBase BotSeller"],
    workflow: {
      eyebrow: "Jak działa",
      title: "Od targetu do odpowiedzi, bez ręcznego chaosu",
      body: "Ty ustawiasz kierunek raz. Bot powtarza cały proces każdego dnia roboczego.",
      steps: [["01", "Wybierasz target", "Branże, kraje, miasta, typ firm i zasady kwalifikacji leadów."], ["02", "Bot znajduje firmy", "Codziennie szuka dopasowanych biznesów w wybranym obszarze."], ["03", "Bot filtruje kontakty", "Firmy bez adresu email nie trafiają do Twojego panelu."], ["04", "AI pisze wiadomość", "Treść powstaje w stylu i tonie Twojej marki, z Twoim CTA."], ["05", "System wysyła stopniowo", "Kolejka rozkłada wysyłkę w godzinach pracy, mail po mailu."], ["06", "Ty odbierasz odpowiedzi", "Panel pokazuje wysłane, dostarczone, otwarte i reakcje."]],
    },
    benefits: {
      eyebrow: "Korzyści",
      title: "System pracuje za Ciebie, Ty rozmawiasz z zainteresowanymi",
      items: [["Codzienny dopływ leadów", "Bot pracuje każdego dnia roboczego. Nie musisz pamiętać o prospectingu, rano kolejka już czeka."], ["Zero śmieciowych kontaktów", "Firmy bez maila i poza targetem są odrzucane, zanim zobaczysz je w panelu."], ["Wiadomości w Twoim stylu", "AI pisze na bazie Twojego opisu oferty, tonu i przykładowego maila. Bez szablonowego spamu."], ["Panel zamiast chaosu", "Wysłane, dostarczone, otwarte, odpowiedzi i follow-upy w jednym czytelnym widoku."]],
    },
    safety: {
      eyebrow: "Bezpieczna wysyłka",
      title: "Dostarczalność ważniejsza niż tempo",
      body: "Bot działa w oknie ustawionym w kampanii i realizuje wysyłkę przez kolejkę. Każdy cykl szuka jednego leada, a limity dzienne wynikają z ręcznie wpisanego schedule warm-upu.",
      points: [["Warm-up kampanii", "Admin ustawia własne progi dzienne, np. 5 → 10 → 25 → 50 albo 25 → 50. Po ostatnim progu bot trzyma ostatnią wartość."], ["Wysyłka w godzinach pracy", "Kolejka działa w oknie ustawionym w kampanii. Limit i odstępy wynikają z ręcznego schedule warm-upu."], ["Lista wypisów i suppression", "Jedno kliknięcie „wypisz mnie” trwale blokuje adres. Bot nigdy nie napisze drugi raz."], ["Follow-up z umiarem", "Maksymalnie kilka delikatnych przypomnień, z odstępem, który sam ustalasz."]],
      schedule: ["Start", "+2h", "+4h", "+6h", "+8h", "Koniec"],
      scheduleStart: "start",
      scheduleEnd: "koniec",
      scheduleMail: "mail",
    },
    panel: {
      eyebrow: "Panel klienta",
      title: "Widzisz tylko wyniki, nie techniczną kolejkę",
      body: "Panel pokazuje realnie wysłane leady i wiadomości, a nie szkice ani firmy bez adresu email. Logujesz się i od razu wiesz, co bot dziś dla Ciebie zrobił.",
      login: "Zaloguj się do panelu",
      stats: ["Wysłane", "Dostarczone", "Otwarte", "Odpowiedzi", "Follow-upy", "Leady"],
    },
    plans: {
      eyebrow: "Pakiety",
      title: "Wybierz rytm pracy swojego SalesBota",
      body: "Ceny netto, płatność Stripe, aktywacja po ręcznej weryfikacji przez FluxBase.",
      recommended: "Najczęstszy wybór",
      choose: "Wybierz plan",
    },
    faq: {
      eyebrow: "FAQ",
      title: "Najczęstsze pytania",
      items: [["Czy firmy bez maila trafiają do panelu?", "Nie. Bot pomija je przed zapisem, żeby panel klienta pokazywał tylko realne leady gotowe do kontaktu."], ["Czy bot wysyła wszystkie maile naraz?", "Nie. Każdy cykl kampanii szuka maksymalnie jednego leada i dodaje jedną wiadomość do kolejki, a worker wysyła stopniowo."], ["Czy mogę wybrać kraje Europy?", "Tak. Możesz działać w Polsce, całej Europie, wybranych krajach, województwach albo własnej liście miast."], ["Czy bot pisze maile moim stylem?", "Tak. W formularzu dodajesz opis oferty, przykładowy mail, ton komunikacji, CTA i rzeczy, których bot ma unikać."], ["Czy mogę dodać załączniki?", "Tak. Załączniki kampanii są dołączane do wiadomości wysyłanych w tej kampanii."], ["Jak działa warm-up?", "Nowa skrzynka zaczyna od 5 maili dziennie, potem rośnie codziennie o 5: 10, 15, 20, aż do docelowego limitu kampanii, np. 50."], ["Czy wysłane oznacza dostarczone?", "W BotSeller przyjęcie wiadomości przez SMTP liczymy w panelu jako dostarczone."]],
    },
    final: {
      eyebrow: "Gotowy na start?",
      title: "Skonfiguruj swojego SalesBota jeszcze dziś",
      body: "Formularz zajmuje około 10 minut. Płatność Stripe, ręczna weryfikacja i start kampanii pod okiem FluxBase.",
      cta: "Załóż SalesBota",
    },
    features: (plan: (typeof BOTSELLER_PLANS)[number]) => [
      `${plan.dailyEmails} maili dziennie`,
      plan.billingMode === "payment" ? `${plan.totalEmails || 100} maili łącznie przez ${plan.durationDays || 5} dni` : "Abonament miesięczny netto",
      "Wiadomości AI w stylu Twojej marki",
      "Warm-up, kolejka i follow-upy",
      "Panel klienta ze statystykami",
    ],
  },
  en: {
    nav: ["How it works", "Benefits", "Plans", "Safety", "FAQ"],
    login: "Log in",
    signup: "Start SalesBot",
    heroPill: "FluxBase BotSeller · AI Sales Bot",
    heroTitle: <>Your AI salesperson that <em>daily</em> finds clients and writes first</>,
    heroSub:
      "SalesBot searches for matched companies every day, filters out contacts without email, writes messages in your brand voice and sends them gradually to protect your mailbox.",
    heroCta: "Start SalesBot in 10 minutes",
    heroSecondary: "See how it works",
    heroPoints: ["No junk leads", "Gradual sending and warm-up", "Client panel 24/7"],
    mockup: {
      top: "Client panel · BotSeller",
      metrics: [["Sent today", "27", "+9 vs yesterday"], ["Delivered", "98.2%", "stable"], ["Replies", "6", "+2 new"]],
      chart: "Sending this week",
      days: "last 7 days",
      queue: [["Nowak Furniture Studio", "Message delivered", "delivered"], ["LexPartner Law Office", "Lead replied", "replied"], ["Ad Studio 360", "Scheduled 11:24", "queued"]],
      floatA: ["AI writes a message", "“Hello, I saw your studio website…”"],
      floatB: ["New reply", "“Please send pricing and offer details.”"],
    },
    audienceIntro: "Works best where regular first contact matters:",
    audience: ["Agencies", "Service companies", "Software houses", "Local businesses", "B2B", "Logistics and production"],
    seo: {
      eyebrow: "SEO / AI Sales Bot",
      title: "Email automation, cold mailing and B2B leads in one system",
      body: "FluxBase BotSeller is built for companies looking for email automation, email sending bots, AI Sales Bots, cold mailing, B2B prospecting, lead generation and follow-ups.",
      topics: [
        ["Sales email automation", "FluxBase BotSeller helps companies regularly send first messages to new B2B clients without manually copying addresses, writing every email from scratch or tracking follow-ups."],
        ["B2B lead generation", "The system searches companies by industry, location, country, region, business type and qualification rules, so campaigns target specific companies instead of random contacts."],
        ["AI cold mailing", "AI prepares messages in the brand voice with the offer description, sales arguments and selected CTA. It is made for cold mailing, prospecting and sales automation."],
        ["Safe sending with Gmail SMTP", "BotSeller sends gradually, uses warm-up and works through the client’s SMTP account, so automatic sending does not look like a one-shot spam cannon."],
      ],
      phrasesLabel: "Main search phrases",
    },
    phrases: ["email automation", "automatic email sending", "automatic emails to clients", "email sending bot", "AI sales bot", "B2B lead generation", "lead generation Poland", "cold mailing tool", "B2B prospecting", "follow-up automation", "email campaign system", "FluxBase BotSeller"],
    workflow: {
      eyebrow: "How it works",
      title: "From target to reply, without manual chaos",
      body: "You set the direction once. The bot repeats the whole process every business day.",
      steps: [["01", "Choose the target", "Industries, countries, cities, company types and lead qualification rules."], ["02", "Bot finds companies", "It searches matched businesses in the selected area every day."], ["03", "Bot filters contacts", "Companies without email addresses do not enter your panel."], ["04", "AI writes the message", "The message is created in your brand tone, with your CTA."], ["05", "System sends gradually", "The queue spreads messages during working hours, email by email."], ["06", "You receive replies", "The panel shows sent, delivered, opened messages and reactions."]],
    },
    benefits: {
      eyebrow: "Benefits",
      title: "The system works for you, you talk to interested leads",
      items: [["Daily lead flow", "The bot works every business day. You do not need to remember prospecting, the queue is already waiting in the morning."], ["No junk contacts", "Companies without emails and outside your target are rejected before you see them in the panel."], ["Messages in your style", "AI writes based on your offer, tone and sample email. No generic spam templates."], ["Panel instead of chaos", "Sent, delivered, opened, replies and follow-ups in one clear view."]],
    },
    safety: {
      eyebrow: "Safe sending",
      title: "Deliverability matters more than speed",
      body: "The bot works inside the campaign window and sends through a queue. Each cycle searches one lead, while daily limits come from the manually entered warm-up schedule.",
      points: [["Campaign warm-up", "Admin sets daily thresholds, e.g. 5 → 10 → 25 → 50 or 25 → 50. After the final threshold, the bot keeps the last value."], ["Sending during working hours", "The queue works inside the campaign window. Limits and spacing come from the manual warm-up schedule."], ["Unsubscribe and suppression list", "One click on “unsubscribe” permanently blocks an address. The bot never writes again."], ["Careful follow-ups", "Only a few gentle reminders, spaced by the delay you set." ]],
      schedule: ["Start", "+2h", "+4h", "+6h", "+8h", "End"],
      scheduleStart: "start",
      scheduleEnd: "end",
      scheduleMail: "email",
    },
    panel: {
      eyebrow: "Client panel",
      title: "You see results, not the technical queue",
      body: "The panel shows real sent leads and messages, not drafts or companies without email addresses. You log in and instantly know what the bot did today.",
      login: "Log in to panel",
      stats: ["Sent", "Delivered", "Opened", "Replies", "Follow-ups", "Leads"],
    },
    plans: {
      eyebrow: "Plans",
      title: "Choose the rhythm of your SalesBot",
      body: "Net prices, Stripe payment, activation after manual FluxBase verification.",
      recommended: "Most popular",
      choose: "Choose plan",
    },
    faq: {
      eyebrow: "FAQ",
      title: "Common questions",
      items: [["Do companies without email enter the panel?", "No. The bot skips them before saving, so the client panel shows only real leads ready for contact."], ["Does the bot send all emails at once?", "No. Each campaign cycle finds at most one lead and adds one message to the queue, then the worker sends gradually."], ["Can I choose European countries?", "Yes. You can operate in Poland, across Europe, selected countries, regions or your own city list."], ["Does the bot write in my style?", "Yes. In the form you add your offer description, sample email, tone, CTA and things the bot should avoid."], ["Can I add attachments?", "Yes. Campaign attachments are included in messages sent in that campaign."], ["How does warm-up work?", "A new mailbox starts from 5 emails per day, then grows daily by 5: 10, 15, 20, up to the target campaign limit, e.g. 50."], ["Does sent mean delivered?", "In BotSeller, SMTP acceptance is counted in the panel as delivered." ]],
    },
    final: {
      eyebrow: "Ready to start?",
      title: "Configure your SalesBot today",
      body: "The form takes about 10 minutes. Stripe payment, manual verification and campaign launch under FluxBase supervision.",
      cta: "Start SalesBot",
    },
    features: (plan: (typeof BOTSELLER_PLANS)[number]) => [
      `${plan.dailyEmails} emails per day`,
      plan.billingMode === "payment" ? `${plan.totalEmails || 100} emails total over ${plan.durationDays || 5} days` : "Net monthly subscription",
      "AI messages in your brand voice",
      "Warm-up, queue and follow-ups",
      "Client panel with statistics",
    ],
  },
} satisfies Record<Language, Record<string, unknown>>;

export default function LandingPage() {
  const { language } = useLanguage();
  const t = copy[language] as typeof copy.pl;

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
      description: language === "pl" ? "AI Sales Bot do automatyzacji maili, prospectingu B2B, pozyskiwania leadów, cold mailingu i follow-upów." : "AI Sales Bot for email automation, B2B prospecting, lead generation, cold mailing and follow-ups.",
      url: "https://www.fluxbase.pl/",
      offers: BOTSELLER_PLANS.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        price: plan.pricePln,
        priceCurrency: "PLN",
        availability: "https://schema.org/InStock",
        url: "https://www.fluxbase.pl/botseller",
      })),
      featureList: t.phrases,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: t.faq.items.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
  ];

  return (
    <main className="marketing-page marketing-v2 lp">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <header className="marketing-nav marketing-nav-v2">
        <Link className="marketing-brand" href="/">
          <BotSellerLogo variant="header" />
        </Link>
        <nav>
          <a href="#jak-dziala">{t.nav[0]}</a>
          <a href="#korzysci">{t.nav[1]}</a>
          <a href="#pakiety">{t.nav[2]}</a>
          <a href="#bezpieczenstwo">{t.nav[3]}</a>
          <a href="#faq">{t.nav[4]}</a>
          <Link className="nav-login" href="/client/login">{t.login}</Link>
          <Link className="nav-cta" href="/botseller">{t.signup}</Link>
          <LanguageSwitcher />
        </nav>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <p className="hero-pill">{t.heroPill}</p>
          <h1>{t.heroTitle}</h1>
          <p className="lp-hero-sub">{t.heroSub}</p>
          <div className="hero-actions">
            <Link className="primary-link lp-cta" href="/botseller">{t.heroCta}</Link>
            <a className="secondary-link" href="#jak-dziala">{t.heroSecondary}</a>
          </div>
          <div className="hero-points">
            {t.heroPoints.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>

        <div className="lp-hero-visual" aria-hidden="true">
          <div className="lp-mockup">
            <div className="lp-mockup-topbar">
              <span className="lp-dot" /><span className="lp-dot" /><span className="lp-dot" />
              <strong>{t.mockup.top}</strong>
            </div>
            <div className="lp-mockup-metrics">
              {t.mockup.metrics.map(([label, value, detail]) => (
                <div key={label}><span>{label}</span><strong>{value}</strong><small className="lp-up">{detail}</small></div>
              ))}
            </div>
            <div className="lp-mockup-chart">
              <div className="lp-chart-head"><span>{t.mockup.chart}</span><b>{t.mockup.days}</b></div>
              <div className="lp-bars">{[42, 58, 47, 72, 64, 88, 76].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
            </div>
            <div className="lp-mockup-queue">
              {t.mockup.queue.map(([name, detail, tone]) => (
                <div key={name} className="lp-queue-row"><div><strong>{name}</strong><span>{detail}</span></div><i className={`lp-queue-status ${tone}`} /></div>
              ))}
            </div>
          </div>
          <div className="lp-float-card lp-float-a"><strong>{t.mockup.floatA[0]}</strong><span>{t.mockup.floatA[1]}</span></div>
          <div className="lp-float-card lp-float-b"><strong>{t.mockup.floatB[0]}</strong><span>{t.mockup.floatB[1]}</span></div>
        </div>
      </section>

      <section className="lp-audience-band"><span>{t.audienceIntro}</span><div>{t.audience.map((item) => <b key={item}>{item}</b>)}</div></section>

      <section className="seo-section" aria-labelledby="seo-title">
        <div className="section-heading left"><span className="eyebrow">{t.seo.eyebrow}</span><h2 id="seo-title">{t.seo.title}</h2><p>{t.seo.body}</p></div>
        <div className="seo-grid">{t.seo.topics.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
        <div className="seo-phrases" aria-label={t.seo.phrasesLabel}>{t.phrases.map((phrase) => <span key={phrase}>{phrase}</span>)}</div>
      </section>

      <section className="soft-section" id="jak-dziala">
        <div className="section-heading left"><span className="eyebrow">{t.workflow.eyebrow}</span><h2>{t.workflow.title}</h2><p>{t.workflow.body}</p></div>
        <div className="workflow-grid">{t.workflow.steps.map(([number, title, body]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      </section>

      <section className="lp-benefits" id="korzysci">
        <div className="section-heading"><span className="eyebrow">{t.benefits.eyebrow}</span><h2>{t.benefits.title}</h2></div>
        <div className="lp-benefits-grid">{t.benefits.items.map(([title, body]) => <article key={title}><i className="lp-benefit-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4 10-11" /></svg></i><h3>{title}</h3><p>{body}</p></article>)}</div>
      </section>

      <section className="schedule-section" id="bezpieczenstwo">
        <div className="schedule-copy"><span className="eyebrow">{t.safety.eyebrow}</span><h2>{t.safety.title}</h2><p>{t.safety.body}</p><div className="lp-trust-list">{t.safety.points.map(([title, body]) => <div key={title}><strong>{title}</strong><span>{body}</span></div>)}</div></div>
        <div className="schedule-visual" aria-label={language === "pl" ? "Przykładowy harmonogram wysyłki" : "Sample sending schedule"}>{t.safety.schedule.map((hour, index) => <div key={hour} className={index % 2 ? "slot muted" : "slot"}><span>{hour}</span><strong>{index === 0 ? t.safety.scheduleStart : index === 5 ? t.safety.scheduleEnd : t.safety.scheduleMail}</strong></div>)}</div>
      </section>

      <section className="panel-preview-section">
        <div className="section-heading left"><span className="eyebrow">{t.panel.eyebrow}</span><h2>{t.panel.title}</h2><p>{t.panel.body}</p><Link className="secondary-link lp-inline-cta" href="/client/login">{t.panel.login}</Link></div>
        <div className="panel-stat-grid">{t.panel.stats.map((stat) => <div key={stat}>{stat}</div>)}</div>
      </section>

      <section className="plans-section plans-section-v2" id="pakiety">
        <div className="section-heading"><span className="eyebrow">{t.plans.eyebrow}</span><h2>{t.plans.title}</h2><p>{t.plans.body}</p></div>
        <div className="plans-grid plans-grid-v2">
          {BOTSELLER_PLANS.map((plan) => <article className={plan.recommended ? "plan-card featured" : "plan-card"} key={plan.id}>{plan.recommended ? <span className="pill">{t.plans.recommended}</span> : null}<h3>{plan.name.replace("BotSeller ", "")}</h3><div className="lp-plan-price"><strong>{formatPlanPrice(plan)}</strong></div><ul className="lp-plan-features">{t.features(plan).map((feature) => <li key={feature}>{feature}</li>)}</ul><Link className={plan.recommended ? "lp-plan-cta featured" : "lp-plan-cta"} href="/botseller">{t.plans.choose}</Link></article>)}
        </div>
      </section>

      <section className="faq-section" id="faq"><div className="section-heading"><span className="eyebrow">{t.faq.eyebrow}</span><h2>{t.faq.title}</h2></div><div className="faq-grid">{t.faq.items.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

      <section className="final-cta"><span className="eyebrow lp-cta-eyebrow">{t.final.eyebrow}</span><h2>{t.final.title}</h2><p className="lp-final-sub">{t.final.body}</p><Link className="primary-link lp-cta" href="/botseller">{t.final.cta}</Link></section>

      <MarketingFooter />
    </main>
  );
}
