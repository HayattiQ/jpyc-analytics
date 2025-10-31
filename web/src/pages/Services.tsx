import { useEffect, useMemo, useState } from 'react'
import { ServiceIcon } from '../components/ServiceIcon'

type ServiceItem = {
  id: string
  name: string
  iconUrl: string
  tags: string[]
  description: string
  url?: string
  pressUrl?: string
}

type ServicesFile = {
  services: ServiceItem[]
}

type SortDir = 'asc' | 'desc'

export function ServicesPage() {
  const [data, setData] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  // タグUIは一旦非表示のため、フィルタは使用しない
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

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

  // タグのユニークリスト生成は現状未使用

  const filtered = useMemo(() => {
    // タグフィルタは無効化（全件対象）
    const out = [...data]
    out.sort((a, b) =>
      sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    )
    return out
  }, [data, sortDir])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pageCount)
  const pageItems = filtered.slice((current - 1) * pageSize, current * pageSize)

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  // タグトグルは不要

  const onClickLink = (url?: string) => (e: React.MouseEvent) => {
    if (!url) e.preventDefault()
  }

  return (
    <main className="content flex flex-col gap-4">
      <section className="panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_45px_rgba(15,23,42,0.08)] p-4 md:p-5">
      {/* Controls: 件数とページサイズのみ */}
      <section className="services__controls flex items-center justify-between my-2 text-sm">
        <div>
          件数: <strong>{filtered.length}</strong>
        </div>
        <label className="flex items-center gap-2">
          <span className="text-[color:var(--muted)]">表示件数</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border border-[var(--border)] rounded px-2 py-1 bg-[var(--surface)]"
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </section>

      {/* Mobile cards */}
      <section className="services__cards grid grid-cols-1 gap-3 md:hidden">
        {loading ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 animate-pulse h-[88px]" />
        ) : pageItems.length === 0 ? (
          <div className="text-center text-[color:var(--muted)] py-6">該当なし</div>
        ) : (
          pageItems.map((s) => {
            const hasUrl = Boolean(s.url)
            const href = s.url ?? '#'
            return (
              <div key={s.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="flex items-center gap-2 mb-1">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClickLink(s.url)}
                    aria-label={`${s.name} を開く`}
                    className={hasUrl ? '' : 'pointer-events-none opacity-70'}
                    title={hasUrl ? undefined : 'リンクなし'}
                  >
                    <ServiceIcon src={s.iconUrl} />
                  </a>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClickLink(s.url)}
                    aria-label={`${s.name} を開く`}
                    className={[
                      'font-semibold',
                      hasUrl ? 'text-[color:var(--accent)] hover:underline' : 'pointer-events-none opacity-70'
                    ].join(' ')}
                    title={hasUrl ? undefined : 'リンクなし'}
                  >
                    {s.name}
                  </a>
                </div>
                <div className="mb-1">
                  {s.tags.map((t) => (
                    <span key={t} className="inline-block px-2 py-0.5 mr-1 rounded-full bg-gray-100 text-sm">
                      {t}
                    </span>
                  ))}
                </div>
                <p className="m-0 text-sm text-slate-700">
                  {s.description}
                  {s.pressUrl && (
                    <>
                      {' '}
                      <a
                        href={s.pressUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[color:var(--accent)] hover:underline"
                      >
                        （プレスリリース）
                      </a>
                    </>
                  )}
                </p>
              </div>
            )
          })
        )}
      </section>

      {/* Desktop table */}
      <section className="services__table hidden md:block">
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
                        title={hasUrl ? undefined : 'リンクなし'}
                      >
                        <ServiceIcon src={s.iconUrl} />
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
                        title={hasUrl ? undefined : 'リンクなし'}
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
                      {s.pressUrl && (
                        <>
                          {' '}
                          <a
                            href={s.pressUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[color:var(--accent)] hover:underline"
                          >
                            （プレスリリース）
                          </a>
                        </>
                      )}
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
      </section>
      {/* CTA: 掲載募集パネル */}
      <section className="panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_45px_rgba(15,23,42,0.08)] p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="m-0 text-xl font-bold">JPYC を利用したサービスの掲載募集</h3>
            <p className="m-0 mt-1 text-[color:var(--muted)] text-sm">
              JPYC を採用しているサービスを掲載します。以下のフォームより申請してください。
            </p>
          </div>
          <a
            href="https://forms.gle/Z4NF4CukPGL4MNP89"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-[var(--border)] bg-blue-600 text-white font-semibold hover:opacity-90"
          >
            Google フォームで申請
          </a>
        </div>
      </section>
    </main>
  )
}
