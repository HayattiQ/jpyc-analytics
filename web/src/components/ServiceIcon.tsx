import { useState } from 'react'

type Props = {
  src: string
  name?: string
  size?: number
}

export function ServiceIcon({ src, size = 24 }: Props) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) {
    return (
      <span
        className="inline-block rounded bg-gray-200"
        style={{ width: size, height: size }}
        aria-hidden
      />
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

