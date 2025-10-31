export function ServiceCtaPanel() {
  return (
    <section className="panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_45px_rgba(15,23,42,0.08)] p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="m-0 text-xl font-bold">JPYC を利用したサービスの掲載募集</h3>
          <p className="m-0 mt-1 text-[color:var(--muted)] text-sm">
            JPYC を採用しているサービスを掲載します。以下のフォームより申請してください。
          </p>
        </div>
        <a
          href="https://forms.gle/your-form-id"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-[var(--border)] bg-blue-600 text-white font-semibold hover:opacity-90"
        >
          Google フォームで申請
        </a>
      </div>
    </section>
  )
}

