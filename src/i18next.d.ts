import type es from './locales/es.json'

// es.json es la fuente de verdad: t() está tipado contra sus claves.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof es }
  }
}
