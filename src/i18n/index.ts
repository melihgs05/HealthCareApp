import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import enCommon from '../locales/en/common.json'
import enAuth from '../locales/en/auth.json'
import enPortal from '../locales/en/portal.json'
import enDoctor from '../locales/en/doctor.json'
import enAdmin from '../locales/en/admin.json'

import trCommon from '../locales/tr/common.json'
import trAuth from '../locales/tr/auth.json'
import trPortal from '../locales/tr/portal.json'
import trDoctor from '../locales/tr/doctor.json'
import trAdmin from '../locales/tr/admin.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        portal: enPortal,
        doctor: enDoctor,
        admin: enAdmin,
      },
      tr: {
        common: trCommon,
        auth: trAuth,
        portal: trPortal,
        doctor: trDoctor,
        admin: trAdmin,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'portal', 'doctor', 'admin'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'carebridge_lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
