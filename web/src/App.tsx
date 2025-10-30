import './App.css'
import { useMemo } from 'react'
import config from './config.json'
import { buildDailyHolderSeries, buildDailySeries } from './lib/dailySeries'
import { useChainMetrics } from './hooks/useChainMetrics'
import { useSubgraphDailyStats } from './hooks/useSubgraphDailyStats'
import { ChainTablePanel } from './panels/ChainTablePanel'
import { DailySupplyPanel } from './panels/DailySupplyPanel'
import { Footer } from './panels/Footer'
import { HeroPanel } from './panels/HeroPanel'
import { HolderPanel } from './panels/HolderPanel'
import { SupplyPanel } from './panels/SupplyPanel'
import { ChainHolderBucketsPanel } from './panels/ChainHolderBucketsPanel'

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
  const ETH_START = Math.floor(Date.parse('2025-10-27T00:00:00Z') / 1000)
  const daysFromStart = Math.max(
    1,
    Math.floor(Date.now() / 1000 - ETH_START) / 86400 + 1
  )
  const {
    chainStats: chainDailyStats,
    loading: dailyStatsLoading
  } = useSubgraphDailyStats(0, ETH_START)
  // Holder の日次グラフは dailyStats を使用するため、globalStats は使用しない

  const dailySeries = useMemo(() => {
    const target = chainDailyStats.filter(
      (cs) => cs.chainId === 'ethereum' || cs.chainId === 'polygon' || cs.chainId === 'avalanche'
    )
    return buildDailySeries(supplies, target, Math.floor(daysFromStart))
  }, [supplies, chainDailyStats, daysFromStart])

  const holderDailySeries = useMemo(() => {
    const target = chainDailyStats.filter(
      (cs) => cs.chainId === 'ethereum' || cs.chainId === 'polygon' || cs.chainId === 'avalanche'
    )
    return buildDailyHolderSeries(target, Math.floor(daysFromStart))
  }, [chainDailyStats, daysFromStart])

  return (
    <div className="app-shell">
      <HeroPanel lastUpdated={lastUpdated} isLoading={isInitialLoading} />
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
          <HolderPanel data={holderDailySeries} isLoading={dailyStatsLoading} />
        </div>
        <div className="panel-grid panel-grid--thirds">
          <ChainHolderBucketsPanel chainId="ethereum" />
          <ChainHolderBucketsPanel chainId="polygon" />
          <ChainHolderBucketsPanel chainId="avalanche" />
        </div>
        <ChainTablePanel chains={config.chains} />
      </main>
      <Footer />
    </div>
  )
}

export default App
