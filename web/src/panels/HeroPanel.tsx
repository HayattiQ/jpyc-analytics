interface HeroPanelProps {
  lastUpdated: Date | null
  isLoading: boolean
}

export const HeroPanel = ({ lastUpdated, isLoading }: HeroPanelProps) => {
  return (
    <header className="hero flex justify-between gap-8 items-start">
      <div>
        <h1 className="m-0 text-4xl leading-tight font-bold">JPYC Info</h1>
        <p className="lede mt-3 text-slate-700 max-w-[720px]">
          JPYC のオンチェーン情報や、掲載サービスなど、お役立ち情報をまとめました。<br />
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
        {/* 更新ボタンは不要のため削除 */}
      </div>
    </header>
  )
}
