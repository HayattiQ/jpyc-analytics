import { useMemo } from 'react'
import config from '../config.json'
import {
  buildDailyFlowSeries,
  buildDailyHolderSeries,
  buildDailySeries,
  buildDailyStackedMetricSeries
} from '../lib/dailySeries'
import { useChainMetrics } from '../hooks/useChainMetrics'
import { useSubgraphDailyStats } from '../hooks/useSubgraphDailyStats'
import { ChainTablePanel } from '../panels/ChainTablePanel'
import { DailySupplyPanel } from '../panels/DailySupplyPanel'
import { HolderPanel } from '../panels/HolderPanel'
import { SupplyPanel } from '../panels/SupplyPanel'
import { ChainHolderBucketsPanel } from '../panels/ChainHolderBucketsPanel'
import { TransactionVolumePanel } from '../panels/TransactionVolumePanel'
import { NetFlowPanel } from '../panels/NetFlowPanel'
import { DailyIssuancePanel } from '../panels/DailyIssuancePanel'
import { DailyRedemptionPanel } from '../panels/DailyRedemptionPanel'

export function AnalyticsPage() {
  const {
    supplies,
    sortedSupplies,
    totalSupply,
    status,
    errorMessage,
    reload,
    isInitialLoading
  } = useChainMetrics()
  const ETH_START = Math.floor(Date.parse('2025-10-27T00:00:00Z') / 1000)
  // 経過日数の算出で除算の優先順位による端数ズレを避ける
  const daysFromStart = Math.max(
    1,
    Math.floor((Date.now() / 1000 - ETH_START) / 86400) + 1
  )
  const {
    chainStats: chainDailyStats,
    loading: dailyStatsLoading,
    error: dailyStatsError,
    reload: reloadDailyStats
  } = useSubgraphDailyStats(0, ETH_START)

  const trackedChains = useMemo(
    () =>
      chainDailyStats.filter(
        (cs) => cs.chainId === 'ethereum' || cs.chainId === 'polygon' || cs.chainId === 'avalanche'
      ),
    [chainDailyStats]
  )

  const dailySeries = useMemo(
    () => buildDailySeries(supplies, trackedChains, Math.floor(daysFromStart)),
    [supplies, trackedChains, daysFromStart]
  )

  const holderDailySeries = useMemo(
    () => buildDailyHolderSeries(trackedChains, Math.floor(daysFromStart)),
    [trackedChains, daysFromStart]
  )

  const transactionVolumeSeries = useMemo(
    () => buildDailyStackedMetricSeries(trackedChains, Math.floor(daysFromStart), 'transactionVolume'),
    [trackedChains, daysFromStart]
  )

  const issuanceStackedSeries = useMemo(
    () => buildDailyStackedMetricSeries(trackedChains, Math.floor(daysFromStart), 'inflowVolume'),
    [trackedChains, daysFromStart]
  )

  const redemptionStackedSeries = useMemo(
    () => buildDailyStackedMetricSeries(trackedChains, Math.floor(daysFromStart), 'outflowVolume'),
    [trackedChains, daysFromStart]
  )

  const netFlowSeries = useMemo(
    () => buildDailyFlowSeries(trackedChains, Math.floor(daysFromStart)),
    [trackedChains, daysFromStart]
  )

  return (
    <div className="analytics-page flex flex-col gap-6">
      <SupplyPanel
        tokenSymbol={config.token.symbol}
        totalSupply={totalSupply}
        sortedSupplies={sortedSupplies}
        status={status}
        errorMessage={errorMessage}
        onRetry={reload}
        isInitialLoading={isInitialLoading}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DailySupplyPanel
          data={dailySeries}
          isLoading={dailyStatsLoading && dailySeries.length === 0}
          errorMessage={dailyStatsError}
          onRetry={reloadDailyStats}
        />
        <HolderPanel
          data={holderDailySeries}
          isLoading={dailyStatsLoading && holderDailySeries.length === 0}
          errorMessage={dailyStatsError}
          onRetry={reloadDailyStats}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TransactionVolumePanel
          data={transactionVolumeSeries}
          isLoading={dailyStatsLoading && transactionVolumeSeries.length === 0}
          errorMessage={dailyStatsError}
          onRetry={reloadDailyStats}
        />
        <NetFlowPanel
          data={netFlowSeries}
          isLoading={dailyStatsLoading && netFlowSeries.length === 0}
          errorMessage={dailyStatsError}
          onRetry={reloadDailyStats}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DailyIssuancePanel
          data={issuanceStackedSeries}
          isLoading={dailyStatsLoading && issuanceStackedSeries.length === 0}
          errorMessage={dailyStatsError}
          onRetry={reloadDailyStats}
        />
        <DailyRedemptionPanel
          data={redemptionStackedSeries}
          isLoading={dailyStatsLoading && redemptionStackedSeries.length === 0}
          errorMessage={dailyStatsError}
          onRetry={reloadDailyStats}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ChainHolderBucketsPanel chainId="ethereum" />
        <ChainHolderBucketsPanel chainId="polygon" />
        <ChainHolderBucketsPanel chainId="avalanche" />
      </div>
      <ChainTablePanel chains={config.chains} />
    </div>
  )
}
