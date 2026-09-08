import { useEffect, type ReactNode } from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/i18n/en.json";
import fr from "@/i18n/fr.json";

// Initialize i18n once — this module is imported by the provider component
// which is guaranteed to be included in the SSR bundle because it wraps children.
// Always start on the default language ("fr") so SSR and the client's first
// render match exactly; the saved/browser language is applied after hydration.
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
  // After hydration, switch to the user's saved (or browser) language.
  // Doing this post-mount keeps SSR HTML and the first client render identical.
  useEffect(() => {
    const saved = localStorage.getItem("i18nextLng");
    const browser = navigator.language?.slice(0, 2);
    const target = saved || (browser === "en" ? "en" : "fr");
    if (target !== i18n.language) {
      i18n.changeLanguage(target);
    }
    document.documentElement.lang = i18n.language;
  }, []);

  return <>{children}</>;
}
