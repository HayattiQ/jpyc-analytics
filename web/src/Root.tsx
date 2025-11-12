import { useEffect, useState } from 'react'
import { AnalyticsPage } from './pages/Analytics'
import { HeroPanel } from './panels/HeroPanel'
import { SimpleTabs } from './components/SimpleTabs'
import { Footer } from './panels/Footer'
import { ServicesPage } from './pages/Services'
import { LiquidityPage } from './pages/Liquidity'

export default function Root() {
  const [pathname, setPathname] = useState<string>(window.location.pathname)
  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const isServices = pathname.startsWith('/services')
  const isLiquidity = pathname.startsWith('/liquidity')
  const isAnalytics = pathname === '/' || pathname.startsWith('/analytics')

  let page = <AnalyticsPage />
  if (isServices) {
    page = <ServicesPage />
  } else if (isLiquidity) {
    page = <LiquidityPage />
  } else if (isAnalytics) {
    page = <AnalyticsPage />
  } else {
    page = <AnalyticsPage />
  }

  return (
    <div className="app-shell flex flex-col gap-8">
      <HeroPanel lastUpdated={null} isLoading={false} />
      <SimpleTabs />
      {page}
      <Footer />
    </div>
  )
}
