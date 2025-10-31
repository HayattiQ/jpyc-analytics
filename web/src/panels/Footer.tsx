export const Footer = () => (
  <footer className="app-footer mt-6 p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex justify-between items-center gap-4">
    <div className="footer-brand text-[color:var(--muted)] font-semibold">
      <span>
        Powered by{' '}
        <a className="text-[color:var(--accent)] font-semibold" href="https://x.com/HayattiQ">HayattiQ</a>
      </span>
    </div>
    <a
      className="footer-github text-[color:var(--accent)] font-semibold hover:underline"
      href="https://github.com/HayattiQ/jpyc-analytics"
      target="_blank"
      rel="noopener noreferrer"
    >
      GitHub
    </a>
  </footer>
)
