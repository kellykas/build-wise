import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";
import fr from "./fr.json";

const isBrowser = typeof window !== "undefined";

const resources = {
  en: { translation: en },
  fr: { translation: fr },
};

if (isBrowser) {
  // Browser: use language detector for automatic locale selection
  import("i18next-browser-languagedetector").then(({ default: LanguageDetector }) => {
    i18n.use(LanguageDetector).use(initReactI18next).init({
      resources,
      fallbackLng: "en",
      debug: false,
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        caches: ["localStorage"],
      },
      react: {
        useSuspense: false,
      },
    });
  });
} else {
  // SSR: init synchronously with English default (no browser APIs available)
  i18n.use(initReactI18next).init({
    resources,
    lng: "en",
    fallbackLng: "en",
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export default i18n;
