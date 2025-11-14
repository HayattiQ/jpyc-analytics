import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enCommon from '../locales/en/common.json'
import jaCommon from '../locales/ja/common.json'

export const resources = {
  ja: { common: jaCommon },
  en: { common: enCommon }
} as const

void i18n.use(initReactI18next).init({
  resources,
  lng: 'ja',
  fallbackLng: 'ja',
  supportedLngs: ['ja', 'en'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false
  }
})

export type AppLanguage = keyof typeof resources

export default i18n
