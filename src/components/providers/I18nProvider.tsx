import { useEffect, type ReactNode } from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/i18n/en.json";
import fr from "@/i18n/fr.json";

// Initialize i18n once — this module is imported by the provider component
// which is guaranteed to be included in the SSR bundle because it wraps children.
// Always start on the default language ("fr") so SSR and the client's first
// render match exactly; the saved language is applied after hydration.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    lng: "fr",
    fallbackLng: "fr",
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // After hydration, honor an explicitly saved choice (set via the language
  // switcher) and otherwise stay on the default French. The browser language
  // is deliberately NOT used to auto-switch to English — French is the app's
  // primary language unless the user picks another one.
  useEffect(() => {
    const saved = localStorage.getItem("i18nextLng");
    const target = saved === "en" ? "en" : "fr";
    if (target !== i18n.language) {
      i18n.changeLanguage(target);
    }
    document.documentElement.lang = i18n.language;
  }, []);

  return <>{children}</>;
}
