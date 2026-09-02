import { type ReactNode } from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/i18n/en.json";
import fr from "@/i18n/fr.json";

// Initialize i18n once — this module is imported by the provider component
// which is guaranteed to be included in the SSR bundle because it wraps children.
if (!i18n.isInitialized) {
  const savedLang = typeof window !== "undefined" ? localStorage.getItem("i18nextLng") : null;
  const detectedLang = savedLang || (typeof navigator !== "undefined" ? navigator.language?.slice(0, 2) : null) || "fr";

  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    lng: detectedLang,
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
  // i18n is already initialized above at module scope.
  // This component exists solely to guarantee the bundler includes this module
  // (it cannot tree-shake a component that renders children).
  return <>{children}</>;
}
