"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Locale, Translations } from "./types";
import { fr } from "./translations/fr";
import { en } from "./translations/en";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

const translationsMap: Record<Locale, Translations> = {
  fr,
  en,
};

const I18nContext = createContext<I18nContextValue>({
  locale: "fr",
  setLocale: () => {},
  t: fr,
});

export function detectBrowserLanguage(): Locale {
  if (typeof window === "undefined") return "fr";
  try {
    const saved = localStorage.getItem("va_lang");
    if (saved === "fr" || saved === "en") return saved;

    const browserLangs =
      navigator.languages && navigator.languages.length > 0
        ? navigator.languages
        : [
            navigator.language ||
              (navigator as unknown as { userLanguage?: string }).userLanguage ||
              "",
          ];

    for (const lang of browserLangs) {
      if (typeof lang === "string" && lang.toLowerCase().startsWith("fr")) {
        return "fr";
      }
    }
    // Si la langue n'est pas français, l'anglais est appliqué par défaut pour tout le reste
    return "en";
  } catch {
    return "fr";
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const detected = detectBrowserLanguage();
    setLocaleState(detected);
    setMounted(true);
    if (typeof document !== "undefined") {
      document.documentElement.lang = detected;
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("va_lang", newLocale);
      if (typeof document !== "undefined") {
        document.documentElement.lang = newLocale;
      }
    } catch {
      // Ignorer les erreurs d'écriture localStorage
    }
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: translationsMap[locale] || fr,
    }),
    [locale, setLocale],
  );

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

