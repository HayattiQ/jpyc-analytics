import { Trans, useTranslation } from 'react-i18next'

export const Footer = () => {
  const { t } = useTranslation()
  return (
    <footer className="app-footer mt-6 p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex justify-between items-center gap-4">
      <div className="footer-brand text-[color:var(--muted)] font-semibold">
        <Trans
          i18nKey="footer.poweredBy"
          components={{
            brand: (
              <a className="text-[color:var(--accent)] font-semibold" href="https://x.com/HayattiQ">
                HayattiQ / はやっちさん
              </a>
            )
          }}
        />
      </div>
      <a
        className="footer-github text-[color:var(--accent)] font-semibold hover:underline"
        href="https://github.com/HayattiQ/jpyc-analytics"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t('footer.github')}
      </a>
    </footer>
  )
}
