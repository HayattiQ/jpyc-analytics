interface HeroPanelProps {
  lastUpdated: Date | null
  isLoading: boolean
  onRefresh: () => void
}

export const HeroPanel = ({ lastUpdated, isLoading, onRefresh }: HeroPanelProps) => {
  return (
    <header className="hero">
      <div>
        <p className="eyebrow">M0 · Direct Contract Reads</p>
        <h1>USDC Supply Monitor</h1>
        <p className="lede">
          リアルタイムで Polygon / Avalanche / Ethereum の USDC 供給量を取得し、
          ひと目で比較できる横棒グラフにまとめました。
        </p>
      </div>
      <div className="hero-meta">
        <button className="ghost-button" onClick={onRefresh}>
          手動更新
        </button>
        <div className="timestamp">
          最終更新:{' '}
          {lastUpdated
            ? lastUpdated.toLocaleString()
            : isLoading
              ? '読み込み中…'
              : '—'}
        </div>
      </div>
    </header>
  )
}
