import type { FC } from 'react'
// Coming Soon placeholder: chart removed for initial release

interface HolderPanelProps {
  data: Array<{
    chainId: string
    name: string
    accent: string
    holderCount: number
  }>
  total: number
  isLoading: boolean
  errorMessage: string | null
  onRetry: () => void
}

export const HolderPanel: FC<HolderPanelProps> = () => {
  return (
    <section className="panel panel--compact">
      <div className="panel-header">
        <div>
          <h2>チェーン別ホルダー数</h2>
          <p className="panel-subtitle">Coming soon</p>
        </div>
      </div>

      <div className="coming-soon-placeholder" aria-hidden>
        Coming Soon
      </div>
    </section>
  )
}
