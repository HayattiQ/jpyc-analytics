import { ServiceIcon } from '../../components/ServiceIcon'

type ServiceItem = {
  id: string
  name: string
  iconUrl: string
  tags: string[]
  description: string
  url?: string
}

type Props = {
  items: ServiceItem[]
  loading: boolean
  onClickLink: (url?: string) => (e: React.MouseEvent) => void
}

export function ServiceListPanel({ items, loading, onClickLink }: Props) {
  return (
    <div className="service-list">
      {/* Mobile cards */}
      <section className="services__cards grid grid-cols-1 gap-3 md:hidden">
        {loading ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 animate-pulse h-[88px]" />
        ) : items.length === 0 ? (
          <div className="text-center text-[color:var(--muted)] py-6">該当なし</div>
        ) : (
          items.map((s) => {
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
                    <ServiceIcon src={s.iconUrl} showBrokenLabel={s.id === 'wowoo'} />
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
                <p className="m-0 text-sm text-slate-700">{s.description}</p>
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
                  名前
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
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center">
                    該当なし
                  </td>
                </tr>
              )}
              {items.map((s) => {
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
                        <ServiceIcon src={s.iconUrl} showBrokenLabel={s.id === 'wowoo'} />
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
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
