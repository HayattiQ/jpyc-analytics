import type { MouseEvent } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

function usePathname() {
  const [pathname, setPathname] = useState<string>(window.location.pathname)
  useEffect(() => {
    const handler = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])
  return pathname
}

export function SimpleTabs() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const isAnalytics = pathname === '/' || pathname.startsWith('/analytics')
  const isServices = pathname.startsWith('/services')
  const goto = (to: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    if (window.location.pathname !== to) {
      window.history.pushState({}, '', to)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }
  const baseClass =
    'relative inline-flex items-center justify-center font-semibold px-5 py-2 rounded-full border border-transparent text-[color:var(--muted)] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--accent)]'
  return (
    <nav
      className="top-tabs inline-flex items-center gap-2 justify-center px-2 py-1 mx-auto rounded-full border bg-[var(--surface)] border-[var(--border)] shadow-[0_3px_14px_rgba(15,23,42,0.06)]"
      aria-label={t('tabs.navLabel')}
      role="tablist"
    >
      <a
        href="/analytics"
        onClick={goto('/analytics')}
        className={[
          baseClass,
          isAnalytics
            ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)] border-[var(--accent)]'
            : 'hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--accent)]'
        ].join(' ')}
        aria-current={isAnalytics ? 'page' : undefined}
        aria-selected={isAnalytics}
        role="tab"
      >
        {t('tabs.analytics')}
      </a>
      <span
        aria-hidden="true"
        className="mx-1 h-6 w-px rounded-full bg-[var(--border)]"
      />
      <a
        href="/services"
        onClick={goto('/services')}
        className={[
          baseClass,
          isServices
            ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)] border-[var(--accent)]'
            : 'hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--accent)]'
        ].join(' ')}
        aria-current={isServices ? 'page' : undefined}
        aria-selected={isServices}
        role="tab"
      >
        {t('tabs.services')}
      </a>
    </nav>
  )
}
