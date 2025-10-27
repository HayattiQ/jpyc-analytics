interface HeroPanelProps {
  lastUpdated: Date | null
  isLoading: boolean
  onRefresh: () => void
}

export const HeroPanel = ({ lastUpdated, isLoading, onRefresh }: HeroPanelProps) => {
  return (
    <header className="hero">
      <div>
        <h1>JPYC Analytics</h1>
        <p className="lede">
          リアルタイムで JPYC のオンチェーン情報を取得し、
          ひと目で比較できるグラフにまとめました。
          Powered by <a href="https://x.com/HayattiQ">HayattiQ</a>
        </p>
      </div>
      <div className="hero-meta">
        <div className="timestamp">
          最終更新:{' '}
          {lastUpdated
            ? lastUpdated.toLocaleString()
            : isLoading
              ? '読み込み中…'
              : '—'}
        </div>
        <button type="button" onClick={onRefresh} disabled={isLoading}>
          更新
        </button>
      </div>
    </header>
  )
}
