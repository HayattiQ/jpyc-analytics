import './App.css'
import { useCallback, useMemo } from 'react'
import config from './config.json'
import { buildDailySeries } from './lib/dailySeries'
import { useChainMetrics } from './hooks/useChainMetrics'
import { useSubgraphDailyStats } from './hooks/useSubgraphDailyStats'
import { useSubgraphGlobalStats } from './hooks/useSubgraphGlobalStats'
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
  const {
    chainStats: chainDailyStats,
    loading: dailyStatsLoading,
    reload: reloadDailyStats
  } = useSubgraphDailyStats(7)
  const {
    globalStats,
    loading: globalStatsLoading,
    error: globalStatsError,
    reload: reloadGlobalStats
  } = useSubgraphGlobalStats()

  const dailySeries = useMemo(
    () => buildDailySeries(supplies, chainDailyStats, 7),
    [supplies, chainDailyStats]
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

  const handleRefresh = useCallback(() => {
    reload()
    reloadGlobalStats()
    reloadDailyStats()
  }, [reload, reloadDailyStats, reloadGlobalStats])

  return (
    <div className="app-shell">
      <HeroPanel lastUpdated={lastUpdated} isLoading={isInitialLoading} onRefresh={handleRefresh} />
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
        <div className="panel-grid">
          <DailySupplyPanel
            data={dailySeries}
            isLoading={dailyStatsLoading && dailySeries.length === 0}
          />
          <HolderPanel
            data={holderChartData}
            total={holderTotal}
            isLoading={globalStatsLoading}
            errorMessage={globalStatsError}
            onRetry={reloadGlobalStats}
          />
        </div>
        <ChainTablePanel chains={config.chains} supplies={supplies} tokenSymbol={config.token.symbol} />
      </main>
      <Footer />
    </div>
  )
}

export default App
