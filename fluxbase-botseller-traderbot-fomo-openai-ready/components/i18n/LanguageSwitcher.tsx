"use client";

import { useLanguage, type Language } from "@/components/i18n/LanguageContext";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, meta } = useLanguage();
  const languages: Language[] = ["pl", "en"];

  return (
    <div className={compact ? "language-switcher compact" : "language-switcher"} aria-label="Language switcher">
      {languages.map((item) => (
        <button
          key={item}
          className={language === item ? "active" : ""}
          type="button"
          aria-label={meta[item].label}
          aria-pressed={language === item}
          onClick={() => setLanguage(item)}
        >
          <span aria-hidden="true">{meta[item].flag}</span>
          <b>{meta[item].short}</b>
        </button>
      ))}
    </div>
  );
}
