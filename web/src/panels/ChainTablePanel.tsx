import type { ChainMetrics, ChainConfig } from '../hooks/useChainMetrics'

interface ChainTablePanelProps {
  chains: ChainConfig[]
  supplies: ChainMetrics[]
  tokenSymbol: string
}

export const ChainTablePanel = ({ chains, supplies, tokenSymbol }: ChainTablePanelProps) => (
  <section className="panel table-panel">
    <div className="panel-header">
      <div>
        <h2>チェーン別 JPYC 情報</h2>
        <p className="panel-subtitle">
          config.json のコントラクトアドレスと供給量・ホルダー数を表形式で一覧化
        </p>
      </div>
    </div>
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>チェーン</th>
            <th>供給量 ({tokenSymbol})</th>
            <th>ホルダー数</th>
            <th>コントラクトアドレス</th>
          </tr>
        </thead>
        <tbody>
          {chains.map((chain) => {
            const matched = supplies.find((item) => item.chainId === chain.id)
            const explorerHref = chain.explorerBaseUrl
              ? `${chain.explorerBaseUrl}${chain.tokenAddress}`
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
                <td>{matched ? matched.formattedSupply : '—'}</td>
                <td>{matched ? matched.formattedHolderCount : '—'}</td>
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
