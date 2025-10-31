import { useEffect, useState } from 'react'

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
  const pathname = usePathname()
  const isAnalytics = pathname === '/' || pathname.startsWith('/analytics')
  const isServices = pathname.startsWith('/services')
  return (
    <nav
      className="top-tabs inline-flex gap-4 justify-center px-5 py-2 mx-auto rounded-full border-2 bg-[var(--surface)] border-[var(--border)] shadow-[0_3px_14px_rgba(15,23,42,0.06)]"
      aria-label="ページ切替タブ"
    >
      <a
        href="/analytics"
        className={[
          'inline-block font-semibold px-3 py-2 border-b-4 border-transparent hover:opacity-90',
          isAnalytics ? 'text-[color:var(--accent)] border-[var(--accent)]' : ''
        ].join(' ')}
        aria-current={isAnalytics ? 'page' : undefined}
      >
        Analytics
      </a>
      <a
        href="/services"
        className={[
          'inline-block font-semibold px-3 py-2 border-b-4 border-transparent hover:opacity-90',
          isServices ? 'text-[color:var(--accent)] border-[var(--accent)]' : ''
        ].join(' ')}
        aria-current={isServices ? 'page' : undefined}
      >
        Services
      </a>
    </nav>
  )
}
