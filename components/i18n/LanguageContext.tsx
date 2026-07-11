"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Language = "pl" | "en";

const STORAGE_KEY = "fluxbase-language";

const languageMeta: Record<Language, { label: string; short: string; flag: string; locale: string }> = {
  pl: { label: "Polski", short: "PL", flag: "🇵🇱", locale: "pl-PL" },
  en: { label: "English", short: "EN", flag: "🇬🇧", locale: "en-GB" },
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  meta: typeof languageMeta;
  locale: string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readInitialLanguage(): Language {
  if (typeof window === "undefined") return "pl";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "en" ? "en" : "pl";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("pl");

  useEffect(() => {
    setLanguageState(readInitialLanguage());
  }, []);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
      document.documentElement.lang = nextLanguage;
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, meta: languageMeta, locale: languageMeta[language].locale }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
