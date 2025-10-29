import type { ChainConfig } from '../hooks/useChainMetrics'

interface ChainTablePanelProps {
  chains: ChainConfig[]
}

export const ChainTablePanel = ({ chains }: ChainTablePanelProps) => (
  <section className="panel table-panel">
    <div className="panel-header">
      <div>
        <h2>チェーン別 JPYC 情報</h2>
        <p className="panel-subtitle">コントラクトアドレスや Issuer / Redeem を一覧化</p>
      </div>
    </div>
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>チェーン</th>
            <th>Issuer</th>
            <th>Redeem</th>
            <th>コントラクトアドレス</th>
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
                <td>
                  <div className="chain-cell">
                    <span
                      className="accent-dot"
                      style={{ backgroundColor: chain.accent }}
                    />
                    {chain.name}
                  </div>
                </td>
                <td>
                  {issuerAddress ? (
                    issuerExplorerHref ? (
                      <a
                        className="contract-link"
                        href={issuerExplorerHref}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {issuerAddress}
                      </a>
                    ) : (
                      <span className="contract-address">{issuerAddress}</span>
                    )
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {redeemAddress ? (
                    redeemExplorerHref ? (
                      <a
                        className="contract-link"
                        href={redeemExplorerHref}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {redeemAddress}
                      </a>
                    ) : (
                      <span className="contract-address">{redeemAddress}</span>
                    )
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {explorerHref ? (
                    <a
                      className="contract-link"
                      href={explorerHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {chain.tokenAddress}
                    </a>
                  ) : (
                    <span className="contract-address">{chain.tokenAddress}</span>
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
