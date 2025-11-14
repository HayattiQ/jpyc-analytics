import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import config from '../config.json'
import type { DailySeriesPoint } from '../lib/dailySeries'
import { StackedMetricPanel } from './StackedMetricPanel'

interface TransactionVolumePanelProps {
  data: DailySeriesPoint[]
  isLoading: boolean
  errorMessage?: string | null
  onRetry?: () => void
}

export const TransactionVolumePanel: FC<TransactionVolumePanelProps> = ({
  data,
  isLoading,
  errorMessage,
  onRetry
}) => {
  const { t } = useTranslation()
  const tokenSymbol = config.token.symbol
  const series = config.chains
    .filter((c) => c.id === 'ethereum' || c.id === 'polygon' || c.id === 'avalanche')
    .map((c) => ({ name: c.name, accent: c.accent }))

  return (
    <StackedMetricPanel
      title={t('panels.transactionVolume.title')}
      subtitle={t('panels.transactionVolume.subtitle')}
      data={data}
      series={series}
      tokenSymbol={tokenSymbol}
      isLoading={isLoading}
      errorMessage={errorMessage}
      onRetry={onRetry}
    />
  )
}
