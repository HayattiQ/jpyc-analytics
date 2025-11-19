import { Trans, useTranslation } from 'react-i18next'
import { LanguageToggle } from '../components/LanguageToggle'

interface HeroPanelProps {
  lastUpdated: Date | null
  isLoading: boolean
}

export const HeroPanel = ({ lastUpdated, isLoading }: HeroPanelProps) => {
  const { t } = useTranslation()
  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleString()
    : isLoading
      ? t('hero.loading')
      : t('hero.notAvailable')

  return (
    <header className="hero flex justify-between gap-8 items-start">
      <div>
        <h1 className="m-0 text-4xl leading-tight font-bold">{t('hero.title')}</h1>
        <p className="lede mt-3 text-slate-700 max-w-[720px]">
          {t('hero.description')}
          <br />
          <Trans
            i18nKey="hero.poweredBy"
            components={{
              brand: (
                <a
                  className="text-[color:var(--accent)] font-semibold"
                  href="https://x.com/HayattiQ"
                >
                  HayattiQ
                </a>
              )
            }}
          />
        </p>
      </div>
      <div className="hero-meta flex flex-col items-end gap-3">
        <LanguageToggle />
        <div className="timestamp text-sm text-[color:var(--muted)]">
          {t('hero.lastUpdated')}: {lastUpdatedLabel}
        </div>
        {/* 更新ボタンは不要のため削除 */}
      </div>
    </header>
  )
}
