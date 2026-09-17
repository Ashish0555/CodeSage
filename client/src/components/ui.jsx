/** Small shared UI atoms — keeps pages clean and the look consistent. */

export function Chip({ kind, value, children }) {
  // kind: 'verdict' | 'diff'
  const cls = kind === 'verdict' ? `verdict-${value}` : `diff-${value}`;
  return <span className={`chip ${cls}`}>{children || value}</span>;
}

export function Tag({ children }) {
  return <span className="tag">{children}</span>;
}

export function Spinner({ label }) {
  return (
    <span className="row" style={{ gap: 8 }}>
      <span className="spinner" /> {label && <span className="muted">{label}</span>}
    </span>
  );
}

export function Eyebrow({ children }) {
  return <div className="eyebrow">{children}</div>;
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="card pad-lg stack" style={{ textAlign: 'center', alignItems: 'center' }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      {hint && <p className="muted" style={{ margin: 0, maxWidth: 420 }}>{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <div className="card" style={{ borderColor: 'var(--wa)', color: 'var(--wa)', background: 'rgba(214,69,69,0.06)' }}>
      {children}
    </div>
  );
}
