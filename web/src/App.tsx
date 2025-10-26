import './App.css'
import config from './config.json'
import { useChainMetrics } from './hooks/useChainMetrics'
import { ChainTablePanel } from './panels/ChainTablePanel'
import { Footer } from './panels/Footer'
import { HeroPanel } from './panels/HeroPanel'
import { SupplyPanel } from './panels/SupplyPanel'

function App() {
  const {
    supplies,
    sortedSupplies,
    totalSupply,
    status,
    errorMessage,
    lastUpdated,
    reload,
    isInitialLoading
  } = useChainMetrics()

  return (
    <div className="app-shell">
      <HeroPanel lastUpdated={lastUpdated} isLoading={isInitialLoading} onRefresh={reload} />
      <main className="content">
        <SupplyPanel
          tokenSymbol={config.token.symbol}
          totalSupply={totalSupply}
          sortedSupplies={sortedSupplies}
          status={status}
          errorMessage={errorMessage}
          onRetry={reload}
          isInitialLoading={isInitialLoading}
        />
        <ChainTablePanel chains={config.chains} supplies={supplies} tokenSymbol={config.token.symbol} />
      </main>
      <Footer />
    </div>
  )
}

export default App
