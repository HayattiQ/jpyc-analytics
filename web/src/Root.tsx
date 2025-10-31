import { useEffect, useState } from 'react'
import App from './App'
import { HeroPanel } from './panels/HeroPanel'
import { SimpleTabs } from './components/SimpleTabs'
import { Footer } from './panels/Footer'
import { ServicesPage } from './pages/Services'

export default function Root() {
  const [pathname, setPathname] = useState<string>(window.location.pathname)
  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const isServices = pathname.startsWith('/services')

  return (
    <div className="app-shell flex flex-col gap-8">
      <HeroPanel lastUpdated={null} isLoading={false} />
      <SimpleTabs />
      {!isServices && <App />}
      {isServices && <ServicesPage />}
      <Footer />
    </div>
  )
}

