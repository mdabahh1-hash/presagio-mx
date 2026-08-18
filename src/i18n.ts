import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import es from './locales/es.json'
import en from './locales/en.json'

// es.json es la fuente de verdad del catálogo (ver src/i18next.d.ts).
// fallbackLng 'es' garantiza que un key faltante en en.json muestre el
// texto en español, nunca el key crudo.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'veredikt-lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  })

// Mantener <html lang> en sync con el idioma activo.
const syncLang = (lng: string) => {
  document.documentElement.lang = lng.startsWith('en') ? 'en' : 'es'
}
i18n.on('languageChanged', syncLang)
syncLang(i18n.language)

export default i18n
