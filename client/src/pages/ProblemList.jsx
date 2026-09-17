import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Chip, Tag, Spinner, Eyebrow, ErrorNote } from '../components/ui.jsx';

const DIFFS = ['', 'Easy', 'Medium', 'Hard'];

export default function ProblemList() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [difficulty, setDifficulty] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (difficulty) params.set('difficulty', difficulty);
    if (search) params.set('search', search);
    api.get(`/problems?${params}`)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [difficulty, search]);

  return (
    <div className="stack" style={{ gap: 24 }}>
      {/* Hero: the thesis — practice + AI coaching grounded in a real judge. */}
      <header className="card pad-lg" style={{ background: 'linear-gradient(180deg,#fff, #fbfcfe)' }}>
        <Eyebrow>AI Interview &amp; DSA Coach</Eyebrow>
        <h1 style={{ maxWidth: 640, fontSize: '2.2rem', lineHeight: 1.1 }}>
          Solve. Get coached. <span style={{ color: 'var(--accent-ink)' }}>Interview-ready.</span>
        </h1>
        <p className="muted" style={{ maxWidth: 620, margin: '4px 0 0' }}>
          A real code judge decides correctness. An AI coach explains the <em>why</em> — tiered hints that
          never spoil the solution, complexity-aware reviews, and full mock interviews.
        </p>
      </header>

      <div className="spread">
        <h2 style={{ margin: 0 }}>Problems <span className="muted mono" style={{ fontSize: '0.9rem' }}>({data.total})</span></h2>
        <div className="row">
          <input className="input" style={{ width: 200 }} placeholder="Search…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
          <select className="select" style={{ width: 130 }} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {DIFFS.map((d) => <option key={d} value={d}>{d || 'All levels'}</option>)}
          </select>
        </div>
      </div>

      <ErrorNote>{error}</ErrorNote>
      {loading ? <Spinner label="Loading problems…" /> : (
        <div className="grid">
          {data.items.map((p) => (
            <Link key={p.slug} to={`/problems/${p.slug}`} className="list-row" style={{ color: 'inherit' }}>
              <div className="stack" style={{ gap: 7 }}>
                <strong style={{ fontFamily: 'var(--font-display)' }}>{p.title}</strong>
                <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                  {(p.topics || []).slice(0, 4).map((t) => <Tag key={t}>{t}</Tag>)}
                </div>
              </div>
              <Chip kind="diff" value={p.difficulty} />
            </Link>
          ))}
          {!data.items.length && <p className="muted">No problems match. Try clearing filters, or run the seed script.</p>}
        </div>
      )}
    </div>
  );
}
