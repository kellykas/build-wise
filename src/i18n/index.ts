import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";
import fr from "./fr.json";

// Initialize i18n with inline resources — no browser-only plugins at import time.
// Always start on the default language so SSR and the client's first render match
// exactly (avoids hydration mismatches). The saved/browser language is applied
// after hydration in I18nProvider.
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

// Named export so bundlers cannot tree-shake this side-effect module.
// The i18n instance is also the default export for convenience.
export { i18n as default, i18n as i18nInstance };
