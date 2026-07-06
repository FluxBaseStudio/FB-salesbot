"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import BotSellerLogo from "@/components/brand/BotSellerLogo";
import MarketingFooter from "@/components/public/MarketingFooter";
import { ADDITIONAL_MAILBOX_DAILY_EMAILS, ADDITIONAL_MAILBOX_PRICE_PLN, BOTSELLER_PLANS } from "@/lib/pricing";
import { EUROPE_COUNTRY_NAMES_FOR_EUROPE_PLAN, VOIVODESHIP_NAMES } from "@/lib/locationOptions";

const initialForm = {
  company_name: "",
  nip: "",
  contact_name: "",
  contact_email: "",
  phone: "",
  website: "",
  wants_vat_invoice: false,
  invoice_details: "",
  plan_id: "growth",
  location_scope: "poland",
  selected_locations: "Cała Polska",
  target_industries: "",
  company_description: "",
  promoted_service: "",
  value_proposition: "",
  target_audience_niche: "",
  decision_maker_roles: "",
  target_business_model: "",
  target_company_stage: "",
  target_price_segment: "",
  exact_target_business_type: "",
  target_business_activities: "",
  target_company_size: "",
  required_online_signals: "",
  lead_qualification_rules: "",
  lead_disqualification_rules: "",
  sample_email_style: "",
  must_have_signals: "",
  excluded_company_types: "",
  search_keywords: "",
  negative_keywords: "",
  preferred_lead_profile: "",
  target_customer_description: "",
  customer_pain_points: "",
  avoid_in_messages: "",
  call_to_action: "",
  tone: "Spokojny, konkretny, profesjonalny",
  bot_first_name: "",
  bot_last_name: "",
  bot_role: "",
  signature_company: "",
  signature_website: "",
  signature_email: "",
  signature_phone: "",
  signature_address: "",
  signature_footer_note: "",
  smtp_host: "smtp.gmail.com",
  smtp_port: "465",
  smtp_secure: true,
  smtp_user: "",
  smtp_pass: "",
  smtp_from: "",
  smtp_reply_to: "",
  mailbox_setup_mode: "fluxbase_setup",
  desired_mailbox_local_part: "oferta",
  reply_destination_email: "",
  additional_mailbox_requested: false,
  accepts_terms: false,
  accepts_recurring_contract: false,
};

const steps = [
  "Pakiet",
  "Dane firmy",
  "Kogo szukamy",
  "Skrzynka",
  "Podsumowanie",
];

function allowedScopeForPlan(planScope: string, scope: string) {
  if (planScope === "europe") {
    return scope === "europe_countries" ? "europe_countries" : "europe";
  }
  return scope === "voivodeship" ? "voivodeship" : "poland";
}

function selectedLocations(planScope: string, scope: string, raw: string) {
  const safeScope = allowedScopeForPlan(planScope, scope);
  if (safeScope === "poland") return "Cała Polska";
  if (safeScope === "europe") return "Cała Europa";
  if (safeScope === "europe_countries") {
    const countries = raw
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item && item !== "Polska" && item !== "Cała Polska" && item !== "Cała Europa");
    return countries.join(", ");
  }
  if (safeScope === "voivodeship" && ["Cała Polska", "Cała Europa"].includes(raw)) return "";
  return raw;
}

function locationStateForPlan(planScope: string, scope: string, raw: string) {
  const nextScope = allowedScopeForPlan(planScope, scope);
  return { location_scope: nextScope, selected_locations: selectedLocations(planScope, nextScope, raw) };
}

function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <label className="public-field">
      <span>{label}</span>
      {children}
      {help ? <small>{help}</small> : null}
    </label>
  );
}

function AppPasswordGuide() {
  return (
    <div className="public-guide public-smtp-guide public-smtp-guide-expanded">
      <div className="public-smtp-guide-head">
        <div>
          <strong>Jak wygenerować hasło aplikacji Gmail?</strong>
          <p>
            Do pola „SMTP pass / hasło aplikacji” nie wpisuj zwykłego hasła do Gmaila.
            Potrzebne jest specjalne hasło aplikacji Google, czyli osobny 16-znakowy kod
            do bezpiecznej wysyłki maili przez SalesBota.
          </p>
        </div>
      </div>

      <ol className="public-smtp-guide-list">
        <li>Kliknij przycisk „Wygeneruj hasło aplikacji Google”.</li>
        <li>Zaloguj się na konto Google, z którego SalesBot ma wysyłać wiadomości.</li>
        <li>Jeżeli Google poprosi, włącz weryfikację dwuetapową.</li>
        <li>W nazwie aplikacji wpisz „FluxBase SalesBot”.</li>
        <li>Kliknij „Utwórz” albo „Wygeneruj”.</li>
        <li>Skopiuj pokazany 16-znakowy kod.</li>
        <li>Wklej go w pole „SMTP pass / hasło aplikacji”.</li>
        <li>Na końcu kliknij „Sprawdź SMTP”, żeby upewnić się, że skrzynka działa poprawnie.</li>
      </ol>

      <p className="public-smtp-guide-warning">
        Jeżeli Google nie pokazuje tej opcji, najczęściej oznacza to, że na koncie
        nie jest włączona weryfikacja dwuetapowa albo konto firmowe/szkolne ma
        zablokowane hasła aplikacji przez administratora.
      </p>
    </div>
  );
}

const MAX_PUBLIC_ATTACHMENTS = 5;
const MAX_PUBLIC_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const allowedPublicAttachmentTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/csv",
]);

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function fileListError(files: File[]) {
  if (files.length > MAX_PUBLIC_ATTACHMENTS) return `Możesz dodać maksymalnie ${MAX_PUBLIC_ATTACHMENTS} plików.`;
  const tooLarge = files.find((file) => file.size > MAX_PUBLIC_ATTACHMENT_BYTES);
  if (tooLarge) return `Plik ${tooLarge.name} jest za duży. Maksymalnie 5 MB na załącznik.`;
  const unsupported = files.find((file) => file.type && !allowedPublicAttachmentTypes.has(file.type));
  if (unsupported) return `Plik ${unsupported.name} ma nieobsługiwany format. Dozwolone: PDF, DOC/DOCX, XLS/XLSX, PNG, JPG, WEBP, TXT, CSV.`;
  return null;
}

function SignaturePreview({ form }: { form: typeof initialForm }) {
  const fullName = [form.bot_first_name, form.bot_last_name].filter(Boolean).join(" ") || form.contact_name || "Imię Nazwisko";
  const company = form.signature_company || form.company_name || "Nazwa firmy";
  const email = form.signature_email || form.smtp_reply_to || form.smtp_user || form.contact_email || "kontakt@firma.pl";
  const website = (form.signature_website || form.website || "").trim();
  const showWebsite = website && website !== "-";
  return (
    <div className="signature-preview-card">
      <strong>Podgląd podpisu</strong>
      <p>
        {fullName}<br />
        {form.bot_role || "Business Development"}<br />
        {company}<br />
        {showWebsite ? <>{website}<br /></> : null}
        {email}{form.signature_phone ? <><br />{form.signature_phone}</> : null}
      </p>
    </div>
  );
}

export default function BotSellerPage() {
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState<{ tone: "success" | "danger" | "info"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTest, setSmtpTest] = useState<{ ok: boolean; message: string; key: string } | null>(null);
  const [draftOrderId, setDraftOrderId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const plan = useMemo(() => BOTSELLER_PLANS.find((item) => item.id === form.plan_id) || BOTSELLER_PLANS[0], [form.plan_id]);

  useEffect(() => {
    const savedDraftId = window.localStorage.getItem("botseller_signup_draft_id");
    if (savedDraftId) setDraftOrderId(savedDraftId);
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const order = params.get("order");
    if (payment === "success") {
      setNotice({ tone: "success", message: `Płatność zakończona. Zamówienie ${order || ""} jest w panelu admina jako opłacone i czeka na ręczną aktywację przez FluxBase.` });
    }
    if (payment === "cancelled") {
      setNotice({ tone: "info", message: "Płatność została przerwana. Możesz wrócić do formularza i spróbować ponownie." });
    }
  }, []);

  const progress = Math.round(((step + 1) / steps.length) * 100);
  const safeLocationScope = allowedScopeForPlan(plan.scope, form.location_scope);
  const smtpFingerprint = [form.smtp_host, form.smtp_port, String(form.smtp_secure), form.smtp_user, form.smtp_pass, form.smtp_from].join("|");

  function normalizeOptionalWebsiteInput(value: string) {
    const next = value.trim();
    const noWebsiteValues = new Set(["-", "–", "—", "−", "brak", "brak strony", "nie mam", "nie ma", "none", "no website", "no site"]);
    if (!next || noWebsiteValues.has(next.toLowerCase())) return "-";
    return value;
  }

  function updateForm(next: typeof initialForm) {
    const nextFingerprint = [next.smtp_host, next.smtp_port, String(next.smtp_secure), next.smtp_user, next.smtp_pass, next.smtp_from].join("|");
    if (nextFingerprint !== smtpFingerprint) setSmtpTest(null);
    setForm(next);
  }

  function toggleVoivodeship(name: string, checked: boolean) {
    const current = form.selected_locations.split(",").map((item) => item.trim()).filter(Boolean);
    const next = checked ? Array.from(new Set([...current, name])) : current.filter((item) => item !== name);
    setForm({ ...form, location_scope: "voivodeship", selected_locations: next.join(", ") });
  }

  function toggleEuropeCountry(name: string, checked: boolean) {
    const current = form.selected_locations.split(",").map((item) => item.trim()).filter(Boolean);
    const next = checked ? Array.from(new Set([...current, name])) : current.filter((item) => item !== name);
    setForm({ ...form, location_scope: "europe_countries", selected_locations: next.join(", ") });
  }

  function addAttachments(fileList: FileList | null) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    const next = [...attachments, ...incoming];
    const error = fileListError(next);
    if (error) {
      setNotice({ tone: "danger", message: error });
      return;
    }
    setAttachments(next);
    setNotice(null);
  }

  async function testPublicSmtp() {
    if (!form.smtp_user.trim() || !form.smtp_pass.trim()) {
      setNotice({ tone: "danger", message: "Uzupełnij SMTP user i hasło aplikacji, zanim sprawdzisz skrzynkę." });
      return;
    }
    setTestingSmtp(true);
    setSmtpTest(null);
    setNotice({ tone: "info", message: "Sprawdzam połączenie SMTP..." });
    try {
      const response = await fetch("/api/public/smtp-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtp_host: form.smtp_host,
          smtp_port: form.smtp_port,
          smtp_secure: form.smtp_secure,
          smtp_user: form.smtp_user,
          smtp_pass: form.smtp_pass,
          smtp_from: form.smtp_from,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; checkedAt?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Test SMTP nie powiódł się.");
      setSmtpTest({ ok: true, message: `SMTP działa. Sprawdzono: ${new Date(payload.checkedAt || Date.now()).toLocaleString("pl-PL")}.`, key: smtpFingerprint });
      setNotice({ tone: "success", message: "SMTP działa poprawnie. Możesz przejść do podsumowania i płatności Stripe." });
    } catch (error) {
      setSmtpTest({ ok: false, message: error instanceof Error ? error.message : "Test SMTP nie powiódł się.", key: smtpFingerprint });
      setNotice({ tone: "danger", message: error instanceof Error ? error.message : "Test SMTP nie powiódł się." });
    } finally {
      setTestingSmtp(false);
    }
  }

  function removeAttachment(index: number) {
    setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function draftStepLabel(stepIndex = step) {
    return steps[stepIndex] || "Formularz";
  }

  async function saveDraft(stepIndex = step, nextForm = form) {
    setSavingDraft(true);
    try {
      const normalizedLocation = locationStateForPlan(plan.scope, nextForm.location_scope, nextForm.selected_locations);
      const payload = {
        ...nextForm,
        ...normalizedLocation,
        selected_locations: normalizedLocation.selected_locations,
        order_id: draftOrderId,
        onboarding_step: stepIndex,
        onboarding_step_label: draftStepLabel(stepIndex),
        onboarding_completed: stepIndex >= steps.length - 1,
      };
      const response = await fetch("/api/signup-orders/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; id?: string; error?: string };
      if (!response.ok || !result.ok || !result.id) throw new Error(result.error || "Nie udało się zapisać szkicu zamówienia.");
      setDraftOrderId(result.id);
      window.localStorage.setItem("botseller_signup_draft_id", result.id);
      return result.id;
    } catch (error) {
      console.warn("Nie udało się zapisać kroku formularza", error);
      return draftOrderId;
    } finally {
      setSavingDraft(false);
    }
  }

  function validateCurrentStep() {
    if (step === 1 && (!form.company_name.trim() || !form.contact_email.trim())) return "Uzupełnij nazwę firmy i email kontaktowy.";
    if (step === 2 && (!form.company_description.trim() || !form.target_industries.trim() || !form.promoted_service.trim())) return "Uzupełnij czym zajmuje się firma, jakich firm bot ma szukać i jaką usługę promujemy.";
    if (step === 2 && plan.scope === "europe" && safeLocationScope === "europe_countries" && !selectedLocations(plan.scope, safeLocationScope, form.selected_locations)) return "Wybierz co najmniej jeden kraj europejski albo ustaw Całą Europę.";
    if (step === 2 && plan.scope !== "europe" && safeLocationScope === "voivodeship" && !selectedLocations(plan.scope, safeLocationScope, form.selected_locations)) return "Wybierz co najmniej jedno województwo albo ustaw Całą Polskę.";
    if (step === 3 && !form.reply_destination_email.trim()) return "Podaj główny email, na który mają trafiać odpowiedzi.";
    return null;
  }

  async function nextStep() {
    const error = validateCurrentStep();
    if (error) {
      setNotice({ tone: "danger", message: error });
      return;
    }
    setNotice(null);
    const nextStepIndex = Math.min(step + 1, steps.length - 1);
    await saveDraft(nextStepIndex);
    setStep(nextStepIndex);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateCurrentStep();
    const locationError = plan.scope === "europe" && safeLocationScope === "europe_countries" && !selectedLocations(plan.scope, safeLocationScope, form.selected_locations)
      ? "Wybierz co najmniej jeden kraj europejski albo ustaw Całą Europę."
      : plan.scope !== "europe" && safeLocationScope === "voivodeship" && !selectedLocations(plan.scope, safeLocationScope, form.selected_locations)
        ? "Wybierz co najmniej jedno województwo albo ustaw Całą Polskę."
        : null;
    const smtpReady = Boolean(form.reply_destination_email.trim());
    const fullError = error || locationError || (!form.company_name.trim() || !form.contact_email.trim() || !form.company_description.trim() || !form.target_industries.trim() || !form.promoted_service.trim() || !smtpReady
      ? "Uzupełnij wymagane dane: firma, email, opis firmy, target, promowana usługa oraz konfiguracja skrzynki."
      : null);
    if (fullError) {
      setNotice({ tone: "danger", message: fullError });
      return;
    }
    const attachmentError = fileListError(attachments);
    if (attachmentError) {
      setNotice({ tone: "danger", message: attachmentError });
      return;
    }
    if (!form.accepts_terms || !form.accepts_recurring_contract) {
      setNotice({ tone: "danger", message: plan.billingType === "subscription" ? "Przed przejściem do płatności zaakceptuj regulamin oraz potwierdź zgodę na cykliczną umowę abonamentową." : "Przed przejściem do płatności zaakceptuj regulamin oraz potwierdź płatność jednorazową za wersję próbną." });
      return;
    }
    setSubmitting(true);
    setNotice({ tone: "info", message: "Tworzę bezpieczne zamówienie i przekierowuję do Stripe..." });
    try {
      const normalizedLocation = locationStateForPlan(plan.scope, form.location_scope, form.selected_locations);
      const savedOrderId = await saveDraft(steps.length - 1);
      const payload = { ...form, ...normalizedLocation, selected_locations: normalizedLocation.selected_locations, order_id: savedOrderId || draftOrderId };
      const body = new FormData();
      body.set("payload", JSON.stringify(payload));
      attachments.forEach((file) => body.append("attachments", file));
      const response = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        body,
      });
      const responsePayload = (await response.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!response.ok) throw new Error(responsePayload.error || "Nie udało się utworzyć płatności Stripe.");
      if (responsePayload.url) {
        window.location.href = responsePayload.url;
        return;
      }
      setNotice({ tone: "success", message: "Zgłoszenie zapisane. FluxBase aktywuje konto ręcznie po weryfikacji danych." });
      window.localStorage.removeItem("botseller_signup_draft_id");
      setDraftOrderId(null);
      setForm(initialForm);
      setAttachments([]);
      setStep(0);
    } catch (error) {
      setNotice({ tone: "danger", message: error instanceof Error ? error.message : "Wystąpił błąd." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="public-page openai-public-page">
      <header className="marketing-nav compact">
        <Link className="marketing-brand" href="/"><BotSellerLogo variant="header" /></Link>
        <nav>
          <Link href="/">Strona główna</Link>
          <Link href="/client/login">Zaloguj się do panelu</Link>
          <Link className="nav-cta" href="/botseller">Załóż własnego SalesBota →</Link>
        </nav>
      </header>

      <section className="public-hero">
        <BotSellerLogo variant="landing" />
        <p className="eyebrow">FluxBase BotSeller · Onboarding</p>
        <h1>Skonfiguruj swojego SalesBota</h1>
        <p>
          Pięć krótkich kroków: pakiet, dane firmy, target, mail do odpowiedzi i płatność. Po opłaceniu FluxBase
          ręcznie weryfikuje konfigurację i aktywuje kampanię.
        </p>
      </section>

      {notice?.tone === "success" && notice.message.includes("Płatność zakończona") ? (
        <section className="public-success-card">
          <h2>Gotowe, płatność przeszła ✅</h2>
          <p>{notice.message}</p>
          <p className="public-mini-note">System nie tworzy klienta i kampanii automatycznie po Stripe. Zamówienie trafia do zakładki Zamówienia, a admin ręcznie sprawdza SMTP, dane firmy, target i dopiero potem aktywuje klienta oraz kampanię.</p>
        </section>
      ) : null}

      <section className="pricing-grid">
        {BOTSELLER_PLANS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === form.plan_id ? "pricing-card active" : "pricing-card"}
            onClick={() => setForm({ ...form, plan_id: item.id, additional_mailbox_requested: item.billingType === "subscription" ? form.additional_mailbox_requested : false, ...locationStateForPlan(item.scope, item.scope === "europe" ? "europe" : "poland", item.scope === "europe" ? "Cała Europa" : "Cała Polska") })}
          >
            {item.recommended ? <span className="pill">Najczęstszy wybór</span> : null}
            <strong>{item.name}</strong>
            <span>{item.dailyEmails} maili dziennie</span>
            <b>{item.priceLabel}</b>
            <small>{item.shortDescription}</small>
            <em className="pricing-card-select" aria-hidden="true">
              {item.id === form.plan_id ? "✓ Wybrany pakiet" : "Wybierz pakiet"}
            </em>
          </button>
        ))}
      </section>

      <section className="public-summary">
        <div><span>Wybrany pakiet</span><strong>{plan.name}</strong></div>
        <div><span>Limit</span><strong>{plan.dailyEmails}/dzień</strong></div>
        <div><span>Cena</span><strong>{plan.priceLabel}</strong></div>
        <div><span>Aktywacja</span><strong>Ręcznie po kontroli</strong></div>
      </section>

      <form className="public-form slim-form" onSubmit={submit}>
        <div className="public-stepper" aria-label="Postęp formularza">
          <div className="public-stepper-top"><span>Krok {step + 1} z {steps.length}: {steps[step]}</span><span>{progress}%</span></div>
          <div className="public-stepper-track"><div className="public-stepper-fill" style={{ width: `${progress}%` }} /></div>
          <div className="public-stepper-dots">
            {steps.map((label, index) => (
              <button
                key={label}
                type="button"
                className={index === step ? "public-step-dot active" : index < step ? "public-step-dot done" : "public-step-dot"}
                onClick={() => {
                  // Do przodu prowadzi tylko przycisk "Dalej" (z walidacją kroku),
                  // dots pozwalają wracać do już wypełnionych kroków.
                  if (index <= step) setStep(index);
                }}
                aria-current={index === step ? "step" : undefined}
                disabled={index > step}
              >
                <i aria-hidden="true">{index < step ? "✓" : index + 1}</i>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {step === 0 ? (
          <section className="form-section">
            <h2>Pakiet</h2>
            <p className="form-section-lead">
              Wybrany pakiet: <strong>{plan.name}</strong> — {plan.dailyEmails} maili dziennie za{" "}
              {plan.priceLabel}. Możesz zmienić wybór, klikając kartę powyżej.
            </p>
            <p className="public-mini-note">Limity i szczegóły kampanii będzie można dopracować w panelu admina przed aktywacją. Płatność obsługuje Stripe, a subskrypcję można anulować z panelu klienta.</p>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="form-section">
            <h2>Dane firmy</h2>
            <div className="public-grid">
              <Field label="Nazwa firmy"><input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required /></Field>
              <Field label="Email kontaktowy"><input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} required /></Field>
              <Field label="Osoba kontaktowa"><input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></Field>
              <Field label="Telefon"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Strona www (opcjonalnie)" help="Strona internetowa nie jest wymagana. Jeżeli firma nie ma strony, wpisz „-”."><input type="text" value={form.website} onChange={(e) => setForm({ ...form, website: normalizeOptionalWebsiteInput(e.target.value) })} placeholder="https://firma.pl albo -" formNoValidate /></Field>
              <Field label="NIP"><input value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} /></Field>
              <label className="public-check"><input type="checkbox" checked={form.wants_vat_invoice} onChange={(e) => setForm({ ...form, wants_vat_invoice: e.target.checked })} /> Potrzebuję faktury VAT</label>
              {form.wants_vat_invoice ? <Field label="Dane do faktury"><textarea value={form.invoice_details} onChange={(e) => setForm({ ...form, invoice_details: e.target.value })} placeholder="Nazwa, NIP, adres" /></Field> : null}
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="form-section">
            <h2>Kogo bot ma szukać?</h2>
            <div className="public-grid">
              <Field label="Czym zajmuje się firma, która wysyła maila?" help="Najważniejszy opis Twojej firmy i oferty."><textarea value={form.company_description} onChange={(e) => setForm({ ...form, company_description: e.target.value })} required placeholder="Np. tworzymy strony internetowe dla lokalnych firm usługowych..." /></Field>
              <Field label="Jakich firm szukamy?" help="Branże po przecinku, najlepiej konkretnie."><input value={form.target_industries} onChange={(e) => setForm({ ...form, target_industries: e.target.value })} required placeholder="restauracje, kawiarnie, gabinety fizjoterapii" /></Field>
              <Field label="Docelowa grupa odbiorców / nisza" help="Zawęź target, aby bot nie szukał zbyt szeroko."><textarea value={form.target_audience_niche} onChange={(e) => setForm({ ...form, target_audience_niche: e.target.value })} placeholder="lokalne firmy bez nowoczesnej strony, właściciele restauracji premium, małe firmy budowlane" /></Field>
              <Field label="Jaką usługę promujemy?"><textarea value={form.promoted_service} onChange={(e) => setForm({ ...form, promoted_service: e.target.value })} placeholder="Np. nowoczesna strona internetowa, automatyzacja obsługi leadów..." /></Field>
              <Field label="Obszar działania">
                <select
                  value={safeLocationScope}
                  onChange={(e) => setForm({ ...form, ...locationStateForPlan(plan.scope, e.target.value, form.selected_locations) })}
                >
                  {plan.scope === "europe" ? (
                    <>
                      <option value="europe">Cała Europa</option>
                      <option value="europe_countries">Wybrane kraje Europy</option>
                    </>
                  ) : (
                    <>
                      <option value="poland">Cała Polska</option>
                      <option value="voivodeship">Wybrane województwa</option>
                    </>
                  )}
                </select>
              </Field>
              {safeLocationScope === "voivodeship" ? <div className="public-voivodeships">{VOIVODESHIP_NAMES.map((name) => <label key={name}><input type="checkbox" checked={form.selected_locations.split(",").map((i) => i.trim()).includes(name)} onChange={(e) => toggleVoivodeship(name, e.target.checked)} /> {name}</label>)}</div> : null}
              {safeLocationScope === "europe_countries" ? <div className="public-voivodeships">{EUROPE_COUNTRY_NAMES_FOR_EUROPE_PLAN.map((name) => <label key={name}><input type="checkbox" checked={form.selected_locations.split(",").map((i) => i.trim()).includes(name)} onChange={(e) => toggleEuropeCountry(name, e.target.checked)} /> {name}</label>)}</div> : null}
              <div className="public-upload-box span">
                <div>
                  <strong>Załączniki do maili bota</strong>
                  <p>Opcjonalnie dodaj ofertę PDF, cennik, katalog albo prezentację. Pliki trafią do zamówienia i po ręcznej aktywacji zostaną podpięte do kampanii.</p>
                </div>
                <label className="public-file-drop">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt,.csv"
                    onChange={(event) => { addAttachments(event.target.files); event.currentTarget.value = ""; }}
                  />
                  <span>Dodaj pliki</span>
                  <small>Maks. 5 plików, po 5 MB. PDF, DOCX, XLSX, obrazy, TXT, CSV.</small>
                </label>
                {attachments.length ? (
                  <div className="public-file-list">
                    {attachments.map((file, index) => (
                      <div className="public-file-item" key={`${file.name}-${file.size}-${index}`}>
                        <span>{file.name}</span>
                        <small>{formatBytes(file.size)}</small>
                        <button type="button" onClick={() => removeAttachment(index)}>Usuń</button>
                      </div>
                    ))}
                  </div>
                ) : <small className="public-file-empty">Brak załączników. Możesz też dodać je później w panelu admina.</small>}
              </div>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="form-section">
            <h2>Skrzynka wysyłkowa i odpowiedzi</h2>
            <div className="mailbox-mode-card">
              <div>
                <strong>FluxBase zakłada i konfiguruje skrzynkę wysyłkową</strong>
                <p>
                  Klient nie musi podawać SMTP, hasła aplikacji ani danych technicznych.
                  FluxBase przygotuje skrzynkę, z której SalesBot będzie wysyłał wiadomości.
                  W formularzu klient podaje tylko adres, na który mają trafiać odpowiedzi od zainteresowanych firm.
                </p>
              </div>
              <label className="mode-option extra-mailbox-option">
                <input type="checkbox" checked={form.additional_mailbox_requested} disabled={plan.billingType !== "subscription"} onChange={(e) => updateForm({ ...form, additional_mailbox_requested: plan.billingType === "subscription" ? e.target.checked : false })} />
                <span>Dodaj dodatkową skrzynkę wysyłkową +{ADDITIONAL_MAILBOX_DAILY_EMAILS} maili dziennie za {ADDITIONAL_MAILBOX_PRICE_PLN} zł netto/mies. Odpowiedzi nadal będą trafiać na jeden główny email.</span>
              </label>
            </div>

            <div className="public-smtp-test-card fluxbase-mailbox-card">
              <div>
                <strong>Gdzie mają trafiać odpowiedzi?</strong>
                <p>
                  Podaj główny adres email, na który SalesBot ma kierować odpowiedzi.
                  Przykład: bot wysyła z nowej skrzynki kampanijnej, ale odpowiedzi trafiają na Twój główny email firmowy.
                </p>
              </div>
            </div>

            <div className="public-grid">
              <Field label="Główny email do odpowiedzi" help="Na ten adres będą trafiać odpowiedzi od klientów, np. biuro@firma.pl.">
                <input
                  type="email"
                  value={form.reply_destination_email}
                  onChange={(e) => updateForm({
                    ...form,
                    mailbox_setup_mode: "fluxbase_setup",
                    reply_destination_email: e.target.value,
                    smtp_reply_to: e.target.value,
                  })}
                  placeholder="biuro@firma.pl"
                  required
                />
              </Field>
            </div>

            <div className="public-grid signature-fields-grid">
              <Field label="Imię bota"><input value={form.bot_first_name} onChange={(e) => setForm({ ...form, bot_first_name: e.target.value })} placeholder="Jan" /></Field>
              <Field label="Nazwisko bota"><input value={form.bot_last_name} onChange={(e) => setForm({ ...form, bot_last_name: e.target.value })} placeholder="Kowalski" /></Field>
              <Field label="Rola / stanowisko"><input value={form.bot_role} onChange={(e) => setForm({ ...form, bot_role: e.target.value })} placeholder="Business Development Manager" /></Field>
              <Field label="Strona w podpisie (opcjonalnie)" help="Jeżeli nie chcesz dodawać strony do podpisu albo firma jej nie ma, wpisz „-”."><input type="text" value={form.signature_website} onChange={(e) => setForm({ ...form, signature_website: normalizeOptionalWebsiteInput(e.target.value) })} placeholder={form.website || "https://firma.pl albo -"} formNoValidate /></Field>
              <SignaturePreview form={form} />
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="form-section">
            <h2>Podsumowanie</h2>
            <div className="public-summary">
              <div><span>Pakiet</span><strong>{plan.name}</strong></div>
              <div><span>Cena</span><strong>{plan.priceLabel}</strong></div>
              <div><span>Rozliczenie</span><strong>{plan.billingType === "subscription" ? "Płatność cykliczna miesięczna, automatycznie odnawiana" : "Płatność jednorazowa za 5 dni testu"}</strong></div>
              <div><span>Dodatkowa skrzynka</span><strong>{form.additional_mailbox_requested ? `${ADDITIONAL_MAILBOX_PRICE_PLN} zł netto / miesiąc` : "Nie"}</strong></div>
              <div><span>Łącznie</span><strong>{plan.billingType === "subscription" ? `${plan.pricePln + (form.additional_mailbox_requested ? ADDITIONAL_MAILBOX_PRICE_PLN : 0)} zł netto / miesiąc` : `${plan.pricePln} zł netto / 5 dni`}</strong></div>
              <div><span>Firma</span><strong>{form.company_name || "-"}</strong></div>
              <div><span>Target</span><strong>{form.target_industries || "-"}</strong></div>
              <div><span>Zasięg</span><strong>{selectedLocations(plan.scope, safeLocationScope, form.selected_locations) || "-"}</strong></div>
              <div><span>Załączniki</span><strong>{attachments.length ? `${attachments.length} plików` : "Brak"}</strong></div>
            </div>
            <p className="public-mini-note">Po płatności Stripe zamówienie pojawi się w panelu admina. Klient i kampania nie są tworzone automatycznie. Admin ręcznie sprawdza SMTP, DNS, target, styl wiadomości i dopiero wtedy aktywuje SalesBota.</p>

            <div className="public-consent-box">
              <h3>Zgody przed płatnością</h3>
              <label className="public-check consent-check">
                <input
                  type="checkbox"
                  checked={form.accepts_terms}
                  onChange={(e) => setForm({ ...form, accepts_terms: e.target.checked })}
                  required
                />
                <span>Akceptuję <Link href="/regulamin" target="_blank">regulamin usługi FluxBase BotSeller</Link> oraz <Link href="/polityka-prywatnosci" target="_blank">politykę prywatności</Link>. Rozumiem zakres usługi, cenę, okres rozliczeniowy i zasady realizacji.</span>
              </label>
              <label className="public-check consent-check">
                <input
                  type="checkbox"
                  checked={form.accepts_recurring_contract}
                  onChange={(e) => setForm({ ...form, accepts_recurring_contract: e.target.checked })}
                  required
                />
                <span>{plan.billingType === "subscription" ? "Potwierdzam, że płatność uruchamia umowę abonamentową, która odnawia się automatycznie przy każdej kolejnej płatności za wybrany pakiet, do czasu jej anulowania zgodnie z regulaminem." : "Potwierdzam, że płatność za wersję próbną jest jednorazowa i obejmuje 5 dni testu oraz 100 wiadomości łącznie."}</span>
              </label>
              <p className="public-mini-note">Kliknięcie „Zamawiam z obowiązkiem zapłaty” oznacza złożenie zamówienia i zgodę na rozpoczęcie realizacji usługi po opłaceniu zamówienia oraz ręcznej aktywacji przez FluxBase.</p>
            </div>
          </section>
        ) : null}

        {notice ? <div className={`public-notice ${notice.tone}`}>{notice.message}</div> : null}

        <div className="public-step-actions">
          <button className="button" type="button" onClick={() => setStep((value) => Math.max(value - 1, 0))} disabled={step === 0}>Wstecz</button>
          {step < steps.length - 1 ? (
            <button className="public-submit" type="button" onClick={nextStep}>Dalej</button>
          ) : (
            <button className="public-submit" type="submit" disabled={submitting}>{submitting ? "Przekierowuję do Stripe..." : "Zamawiam z obowiązkiem zapłaty"}</button>
          )}
        </div>
      </form>
      <MarketingFooter />
    </main>
  );
}
