import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppLanguage } from '../i18n'

const SUPPORTED_LANGUAGES: { code: AppLanguage; label: string }[] = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' }
]

export const LanguageToggle = () => {
  const { i18n } = useTranslation()
  const current = (i18n.resolvedLanguage ?? i18n.language ?? 'ja').split('-')[0] as AppLanguage

  const handleChange = useCallback(
    (next: AppLanguage) => {
      if (next !== current) {
        void i18n.changeLanguage(next)
      }
    },
    [current, i18n]
  )

  return (
    <div className="language-toggle" role="group" aria-label="Language selection">
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isActive = lang.code === current
        return (
          <button
            type="button"
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className={[
              'language-toggle__btn',
              isActive ? 'language-toggle__btn--active' : ''
            ].join(' ')}
            aria-pressed={isActive}
          >
            {lang.label}
          </button>
        )
      })}
    </div>
  )
}
