import './App.css'
import { useMemo } from 'react'
import config from './config.json'
import { buildDailySeries } from './lib/dailySeries'
import { useChainMetrics } from './hooks/useChainMetrics'
import { useSubgraphGlobalStats } from './hooks/useSubgraphGlobalStats'
import { useSubgraphStats } from './hooks/useSubgraphStats'
import { ChainTablePanel } from './panels/ChainTablePanel'
import { DailySupplyPanel } from './panels/DailySupplyPanel'
import { Footer } from './panels/Footer'
import { HeroPanel } from './panels/HeroPanel'
import { HolderPanel } from './panels/HolderPanel'
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
  const { dailyStats, loading: statsLoading } = useSubgraphStats(7)
  const {
    globalStats,
    loading: globalStatsLoading,
    error: globalStatsError,
    reload: reloadGlobalStats
  } = useSubgraphGlobalStats()

  const dailySeries = useMemo(
    () => buildDailySeries(supplies, dailyStats, 7),
    [supplies, dailyStats]
  )

  const holderChartData = useMemo(
    () =>
      globalStats
        .map((stat) => ({
          chainId: stat.chainId,
          name: stat.name,
          accent: stat.accent,
          holderCount: stat.holderCount
        }))
        .sort((a, b) => b.holderCount - a.holderCount),
    [globalStats]
  )

  const holderTotal = useMemo(
    () => globalStats.reduce((acc, stat) => acc + stat.holderCount, 0),
    [globalStats]
  )

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
        <DailySupplyPanel
          data={dailySeries}
          isLoading={isInitialLoading || (statsLoading && dailySeries.length === 0)}
        />
        <HolderPanel
          data={holderChartData}
          total={holderTotal}
          isLoading={globalStatsLoading}
          errorMessage={globalStatsError}
          onRetry={reloadGlobalStats}
        />
        <ChainTablePanel chains={config.chains} supplies={supplies} tokenSymbol={config.token.symbol} />
      </main>
      <Footer />
    </div>
  )
}

export default App
