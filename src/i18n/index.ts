import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";
import fr from "./fr.json";

// Initialize i18n with inline resources — no browser-only plugins at import time.
// Language detection runs once in the browser after init via changeLanguage().
const savedLang = typeof window !== "undefined" ? localStorage.getItem("i18nextLng") : null;
const detectedLang = savedLang || (typeof navigator !== "undefined" ? navigator.language?.slice(0, 2) : null) || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: detectedLang,
  fallbackLng: "en",
  debug: false,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
