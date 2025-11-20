import { useTranslation } from 'react-i18next'
import { LanguageToggle } from '../components/LanguageToggle'

export const HeroPanel = () => {
  const { t } = useTranslation()
  return (
    <header className="hero">
      <div className="hero-brand">
        <img
          src="/header-logo.png"
          alt="JPYC info ロゴ"
          className="hero-logo"
          width={320}
          height={100}
        />
        <p className="hero-tagline">{t('hero.tagline')}</p>
      </div>
      <div className="hero-controls">
        <LanguageToggle />
      </div>
    </header>
  )
}
