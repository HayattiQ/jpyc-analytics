import { useState } from 'react'

type Props = {
  src: string
  name?: string
  size?: number
  showBrokenLabel?: boolean
}

export function ServiceIcon({ src, size = 24, showBrokenLabel = false }: Props) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) {
    return (
      <span className="inline-flex items-center gap-1" aria-hidden>
        <span
          className="inline-block rounded bg-gray-200"
          style={{ width: size, height: size }}
        />
        {showBrokenLabel && (
          <span className="text-[color:var(--muted)] text-xs">リンク切れ</span>
        )}
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="inline-block"
      aria-hidden
    />
  )
}
