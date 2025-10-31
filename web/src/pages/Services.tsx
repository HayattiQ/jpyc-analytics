import { useEffect, useMemo, useState } from 'react'

type ServiceItem = {
  id: string
  name: string
  iconUrl: string
  tags: string[]
  description: string
  url?: string
}

type ServicesFile = {
  services: ServiceItem[]
}

type SortDir = 'asc' | 'desc'

export function ServicesPage() {
  const [data, setData] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/data/services.json', { cache: 'no-cache' })
        const json: ServicesFile = await res.json()
        if (mounted) setData(json.services)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const s of data) for (const t of s.tags) set.add(t)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [data])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const byQuery = (s: ServiceItem) => {
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    const byTags = (s: ServiceItem) => {
      if (tagFilter.length === 0) return true
      return tagFilter.every((t) => s.tags.includes(t))
    }
    const out = data.filter((s) => byQuery(s) && byTags(s))
    out.sort((a, b) =>
      sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    )
    return out
  }, [data, query, tagFilter, sortDir])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pageCount)
  const pageItems = filtered.slice((current - 1) * pageSize, current * pageSize)

  useEffect(() => {
    setPage(1)
  }, [query, tagFilter])

  const toggleTag = (t: string) => () => {
    setTagFilter((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  const onClickLink = (url?: string) => (e: React.MouseEvent) => {
    if (!url) e.preventDefault()
  }

  return (
    <main className="content flex flex-col gap-4">
      <section className="services__controls flex items-center gap-3 my-4">
        <input
          type="search"
          placeholder="検索（名前・説明・タグ）"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="サービス検索"
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
        />
        <div className="services__tags flex flex-wrap gap-2">
          {allTags.map((t) => (
            <button
              key={t}
              onClick={toggleTag(t)}
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
      </section>

      <section className="services__table">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 px-2 bg-[var(--surface-hover)] text-[color:var(--muted)] font-semibold border-b border-[var(--border)]">
                  アイコン
                </th>
                <th className="text-left py-2 px-2 bg-[var(--surface-hover)] text-[color:var(--muted)] font-semibold border-b border-[var(--border)]">
                  <button
                    className="appearance-none bg-transparent border-none font-inherit text-inherit cursor-pointer"
                    onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                    aria-label={`名前でソート（現在: ${sortDir}）`}
                  >
                    名前 {sortDir === 'asc' ? '▲' : '▼'}
                  </button>
                </th>
                <th className="text-left py-2 px-2 bg-[var(--surface-hover)] text-[color:var(--muted)] font-semibold border-b border-[var(--border)]">
                  タグ
                </th>
                <th className="text-left py-2 px-2 bg-[var(--surface-hover)] text-[color:var(--muted)] font-semibold border-b border-[var(--border)]">
                  説明
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="py-4 text-center">
                    読み込み中...
                  </td>
                </tr>
              )}
              {!loading && pageItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center">
                    該当なし
                  </td>
                </tr>
              )}
              {pageItems.map((s) => {
                const hasUrl = Boolean(s.url)
                const href = s.url ?? '#'
                return (
                  <tr key={s.id} className={hasUrl ? '' : 'opacity-70'}>
                    <td className="py-2 px-2 border-b border-[var(--border)]">
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onClickLink(s.url)}
                        aria-label={`${s.name} を開く`}
                        className="inline-flex items-center"
                      >
                        <img src={s.iconUrl} alt={`${s.name} のアイコン`} width={24} height={24} />
                      </a>
                    </td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onClickLink(s.url)}
                        aria-label={`${s.name} を開く`}
                        className="text-[color:var(--accent)] font-semibold hover:underline"
                      >
                        {s.name}
                      </a>
                    </td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">
                      {s.tags.map((t) => (
                        <span key={t} className="inline-block px-2 py-0.5 mr-1 rounded-full bg-gray-100 text-sm">
                          {t}
                        </span>
                      ))}
                    </td>
                    <td className="py-2 px-2 border-b border-[var(--border)]">
                      {s.description}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="services__pager flex items-center justify-center gap-3 my-3">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={current === 1}
          className="px-3 py-1 rounded border border-[var(--border)] disabled:opacity-50"
        >
          前へ
        </button>
        <span>
          {current} / {pageCount}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          disabled={current === pageCount}
          className="px-3 py-1 rounded border border-[var(--border)] disabled:opacity-50"
        >
          次へ
        </button>
      </section>
    </main>
  )
}

