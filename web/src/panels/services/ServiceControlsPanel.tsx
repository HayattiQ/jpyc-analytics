type Props = {
  allTags: string[]
  tagFilter: string[]
  onToggleTag: (t: string) => void
  onClear: () => void
  count: number
  pageSize: number
  onChangePageSize: (n: number) => void
}

export function ServiceControlsPanel({
  allTags,
  tagFilter,
  onToggleTag,
  onClear,
  count,
  pageSize,
  onChangePageSize,
}: Props) {
  return (
    <section className="services__controls flex flex-col gap-3 my-2">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="services__tags flex flex-wrap gap-2">
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => onToggleTag(t)}
              className={[
                'px-2 py-1 rounded-full border text-sm',
                tagFilter.includes(t)
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-transparent border-[var(--border)]'
              ].join(' ')}
              aria-pressed={tagFilter.includes(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {tagFilter.length > 0 && (
          <button
            className="ml-auto text-sm text-[color:var(--accent)] hover:underline"
            onClick={onClear}
          >
            フィルターをクリア
          </button>
        )}
      </div>
      <div className="flex items-center justify-between text-sm">
        <div>
          件数: <strong>{count}</strong>
          {tagFilter.length > 0 && (
            <span className="ml-2 text-[color:var(--muted)]">選択タグ: {tagFilter.join(', ')}</span>
          )}
        </div>
        <label className="flex items-center gap-2">
          <span className="text-[color:var(--muted)]">表示件数</span>
          <select
            value={pageSize}
            onChange={(e) => onChangePageSize(Number(e.target.value))}
            className="border border-[var(--border)] rounded px-2 py-1 bg-[var(--surface)]"
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}

