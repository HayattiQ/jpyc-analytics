import type { ChainConfig } from '../hooks/useChainMetrics'

interface ChainTablePanelProps {
  chains: ChainConfig[]
}

export const ChainTablePanel = ({ chains }: ChainTablePanelProps) => (
  <section className="panel table-panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
    <div className="panel-header flex justify-between gap-4 items-start mb-4">
      <div>
        <h2 className="font-bold">チェーン別 JPYC 情報</h2>
        <p className="panel-subtitle">コントラクトアドレスや Issuer / Redeem を一覧化</p>
      </div>
    </div>

    {/* モバイル: カード型 */}
    <div className="md:hidden space-y-3">
      {chains.map((chain) => {
        const explorerHref = chain.explorerBaseUrl
          ? `${chain.explorerBaseUrl}${chain.tokenAddress}`
          : null
        const issuerAddress = (chain as { issuerAddress?: string }).issuerAddress
        const issuerExplorerHref = (chain as { explorerAddressBaseUrl?: string })
          .explorerAddressBaseUrl
          ? `${(chain as { explorerAddressBaseUrl?: string }).explorerAddressBaseUrl}${issuerAddress}`
          : null
        const redeemAddress = (chain as { redeemAddress?: string }).redeemAddress
        const redeemExplorerHref = (chain as { explorerAddressBaseUrl?: string })
          .explorerAddressBaseUrl
          ? `${(chain as { explorerAddressBaseUrl?: string }).explorerAddressBaseUrl}${redeemAddress}`
          : null

        return (
          <div key={chain.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
            <div className="flex items-center gap-2 font-semibold mb-2">
              <span className="w-[10px] h-[10px] inline-block rounded-full" style={{ backgroundColor: chain.accent }} />
              {chain.name}
            </div>
            <div className="text-sm grid grid-cols-1 gap-1">
              <div>
                <span className="text-[color:var(--muted)] mr-2">Issuer:</span>
                {issuerAddress ? (
                  issuerExplorerHref ? (
                    <a className="text-[color:var(--accent)] font-semibold break-all" href={issuerExplorerHref} target="_blank" rel="noopener noreferrer">
                      {issuerAddress}
                    </a>
                  ) : (
                    <span className="font-mono break-all">{issuerAddress}</span>
                  )
                ) : (
                  '—'
                )}
              </div>
              <div>
                <span className="text-[color:var(--muted)] mr-2">Redeem:</span>
                {redeemAddress ? (
                  redeemExplorerHref ? (
                    <a className="text-[color:var(--accent)] font-semibold break-all" href={redeemExplorerHref} target="_blank" rel="noopener noreferrer">
                      {redeemAddress}
                    </a>
                  ) : (
                    <span className="font-mono break-all">{redeemAddress}</span>
                  )
                ) : (
                  '—'
                )}
              </div>
              <div>
                <span className="text-[color:var(--muted)] mr-2">Contract:</span>
                {explorerHref ? (
                  <a className="text-[color:var(--accent)] font-semibold break-all" href={explorerHref} target="_blank" rel="noopener noreferrer">
                    {chain.tokenAddress}
                  </a>
                ) : (
                  <span className="font-mono break-all">{chain.tokenAddress}</span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>

    {/* デスクトップ: テーブル表示 */}
    <div className="table-wrapper w-full overflow-x-auto hidden md:block">
      <table className="min-w-[600px] w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left py-3 px-3 bg-[var(--surface-hover)] text-[color:var(--muted)] font-semibold border-b border-[var(--border)]">チェーン</th>
            <th className="text-left py-3 px-3 bg-[var(--surface-hover)] text-[color:var(--muted)] font-semibold border-b border-[var(--border)]">Issuer</th>
            <th className="text-left py-3 px-3 bg-[var(--surface-hover)] text-[color:var(--muted)] font-semibold border-b border-[var(--border)]">Redeem</th>
            <th className="text-left py-3 px-3 bg-[var(--surface-hover)] text-[color:var(--muted)] font-semibold border-b border-[var(--border)]">コントラクトアドレス</th>
          </tr>
        </thead>
        <tbody>
          {chains.map((chain) => {
            const explorerHref = chain.explorerBaseUrl
              ? `${chain.explorerBaseUrl}${chain.tokenAddress}`
              : null
            const issuerAddress = (chain as { issuerAddress?: string }).issuerAddress
            const issuerExplorerHref = (chain as { explorerAddressBaseUrl?: string })
              .explorerAddressBaseUrl
              ? `${(chain as { explorerAddressBaseUrl?: string }).explorerAddressBaseUrl}${issuerAddress}`
              : null
            const redeemAddress = (chain as { redeemAddress?: string }).redeemAddress
            const redeemExplorerHref = (chain as { explorerAddressBaseUrl?: string })
              .explorerAddressBaseUrl
              ? `${(chain as { explorerAddressBaseUrl?: string }).explorerAddressBaseUrl}${redeemAddress}`
              : null
            return (
              <tr key={chain.id}>
                <td className="text-left py-3 px-3 border-b border-[var(--border)]">
                  <div className="chain-cell flex items-center gap-2 font-semibold">
                    <span
                      className="accent-dot w-[10px] h-[10px] inline-block rounded-full"
                      style={{ backgroundColor: chain.accent }}
                    />
                    {chain.name}
                  </div>
                </td>
                <td className="text-left py-3 px-3 border-b border-[var(--border)]">
                  {issuerAddress ? (
                    issuerExplorerHref ? (
                      <a
                        className="contract-link text-[color:var(--accent)] font-semibold inline-flex items-center gap-1 hover:underline"
                        href={issuerExplorerHref}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {issuerAddress}
                      </a>
                    ) : (
                      <span className="contract-address font-mono text-sm break-all">{issuerAddress}</span>
                    )
                  ) : (
                    '—'
                  )}
                </td>
                <td className="text-left py-3 px-3 border-b border-[var(--border)]">
                  {redeemAddress ? (
                    redeemExplorerHref ? (
                      <a
                        className="contract-link text-[color:var(--accent)] font-semibold inline-flex items-center gap-1 hover:underline"
                        href={redeemExplorerHref}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {redeemAddress}
                      </a>
                    ) : (
                      <span className="contract-address font-mono text-sm break-all">{redeemAddress}</span>
                    )
                  ) : (
                    '—'
                  )}
                </td>
                <td className="text-left py-3 px-3 border-b border-[var(--border)]">
                  {explorerHref ? (
                    <a
                      className="contract-link text-[color:var(--accent)] font-semibold inline-flex items-center gap-1 hover:underline"
                      href={explorerHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {chain.tokenAddress}
                    </a>
                  ) : (
                    <span className="contract-address font-mono text-sm break-all">{chain.tokenAddress}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  </section>
)
