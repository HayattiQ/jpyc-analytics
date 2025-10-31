interface HeroPanelProps {
  lastUpdated: Date | null
  isLoading: boolean
}

export const HeroPanel = ({ lastUpdated, isLoading }: HeroPanelProps) => {
  return (
    <header className="hero flex justify-between gap-8 items-start">
      <div>
        <h1 className="m-0 text-4xl leading-tight font-bold">JPYC Analytics</h1>
        <p className="lede mt-3 text-slate-700 max-w-[720px]">
          リアルタイムで JPYC のオンチェーン情報を取得し、
          ひと目で比較できるグラフにまとめました。
          Powered by <a className="text-[color:var(--accent)] font-semibold" href="https://x.com/HayattiQ">HayattiQ</a>
        </p>
      </div>
      <div className="hero-meta flex flex-col items-end gap-3">
        <div className="timestamp text-sm text-[color:var(--muted)]">
          最終更新:{' '}
          {lastUpdated
            ? lastUpdated.toLocaleString()
            : isLoading
              ? '読み込み中…'
              : '—'}
        </div>
        <button
          type="button"
          className="ghost-button border border-[var(--border)] rounded-full px-4 py-2 font-semibold hover:border-[var(--accent)] hover:bg-[rgba(37,99,235,0.08)] disabled:opacity-60"
          onClick={() => window.location.reload()}
          disabled={isLoading}
        >
          更新
        </button>
      </div>
    </header>
  )
}
