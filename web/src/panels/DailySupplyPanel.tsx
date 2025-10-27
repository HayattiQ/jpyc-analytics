import type { FC } from 'react'
import type { DailySeriesPoint } from '../lib/dailySeries'

interface DailySupplyPanelProps {
  data: DailySeriesPoint[]
  isLoading: boolean
}

export const DailySupplyPanel: FC<DailySupplyPanelProps> = () => (
  <section className="panel panel--compact">
    <div className="panel-header">
      <div>
        <h2>日別チェーン別発行量</h2>
        <p className="panel-subtitle">Coming soon</p>
      </div>
    </div>
    <div className="coming-soon-placeholder" aria-hidden>
      Coming Soon
    </div>
  </section>
)
