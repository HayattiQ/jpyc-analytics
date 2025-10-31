type Props = {
  current: number
  pageCount: number
  onPrev: () => void
  onNext: () => void
}

export function ServicePager({ current, pageCount, onPrev, onNext }: Props) {
  return (
    <section className="services__pager flex items-center justify-center gap-3 my-3">
      <button
        onClick={onPrev}
        disabled={current === 1}
        className="px-3 py-1 rounded border border-[var(--border)] disabled:opacity-50"
      >
        前へ
      </button>
      <span>
        {current} / {pageCount}
      </span>
      <button
        onClick={onNext}
        disabled={current === pageCount}
        className="px-3 py-1 rounded border border-[var(--border)] disabled:opacity-50"
      >
        次へ
      </button>
    </section>
  )
}

