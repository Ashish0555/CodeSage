import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Chip, Spinner, Eyebrow, ErrorNote, EmptyState } from '../components/ui.jsx';

/**
 * Dashboard: progress analytics + an explainable "readiness" score.
 * Everything here is computed server-side from the user's submissions.
 */
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.get('/me/stats')
      .then((s) => alive && setStats(s))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!stats) return <Spinner label="Loading your dashboard…" />;

  const { readinessScore, solvedByDifficulty, totalSolved, acceptanceRate, totalSubmissions, recentSubmissions } = stats;
  const maxDiff = Math.max(1, solvedByDifficulty.Easy, solvedByDifficulty.Medium, solvedByDifficulty.Hard);

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="stack" style={{ gap: 4 }}>
        <Eyebrow>Your progress</Eyebrow>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
      </div>

      <div className="dash-grid">
        {/* Readiness gauge */}
        <div className="card stack" style={{ gap: 10, alignItems: 'center', justifyContent: 'center' }}>
          <div className="eyebrow">Interview readiness</div>
          <Gauge value={readinessScore} />
          <p className="muted" style={{ margin: 0, textAlign: 'center', fontSize: '0.82rem', maxWidth: 240 }}>
            Difficulty-weighted (E/M/H = 1/2/4), blended 75% coverage + 25% accuracy.
          </p>
        </div>

        {/* Solved by difficulty */}
        <div className="card stack" style={{ gap: 14 }}>
          <div className="spread">
            <Eyebrow>Solved by difficulty</Eyebrow>
            <span className="mono muted">{totalSolved} total</span>
          </div>
          {['Easy', 'Medium', 'Hard'].map((d) => (
            <div key={d} className="stack" style={{ gap: 4 }}>
              <div className="spread">
                <span className={`chip diff-${d}`}>{d}</span>
                <span className="mono">{solvedByDifficulty[d]}</span>
              </div>
              <div className="bar"><div className={`bar-fill diff-fill-${d}`} style={{ width: `${(solvedByDifficulty[d] / maxDiff) * 100}%` }} /></div>
            </div>
          ))}
        </div>

        {/* Accuracy */}
        <div className="card stack" style={{ gap: 12, justifyContent: 'center' }}>
          <Eyebrow>Accuracy</Eyebrow>
          <div className="stack" style={{ gap: 2 }}>
            <span className="mono" style={{ fontSize: '2.4rem', color: 'var(--accent-ink)' }}>{acceptanceRate}%</span>
            <span className="muted">{totalSubmissions} submissions judged</span>
          </div>
        </div>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        <Eyebrow>Recent submissions</Eyebrow>
        {recentSubmissions?.length ? (
          <div className="stack" style={{ gap: 6 }}>
            {recentSubmissions.map((s, i) => (
              <Link key={i} to={`/problems/${s.problem?.slug}`} className="list-row" style={{ color: 'inherit' }}>
                <div className="row" style={{ gap: 10 }}>
                  <Chip kind="verdict" value={s.verdict} />
                  <span style={{ fontFamily: 'var(--font-display)' }}>{s.problem?.title || 'Unknown'}</span>
                </div>
                <span className="muted mono" style={{ fontSize: '0.8rem' }}>{new Date(s.createdAt).toLocaleDateString()}</span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No submissions yet" hint="Solve a problem to start building your readiness score."
            action={<Link className="btn btn-primary btn-sm" to="/">Browse problems</Link>} />
        )}
      </div>
    </div>
  );
}

/** Simple SVG ring gauge — 0..100. */
function Gauge({ value }) {
  const r = 54, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--line)" strokeWidth="12" />
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--accent)" strokeWidth="12" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 70 70)" />
      <text x="70" y="70" textAnchor="middle" dominantBaseline="central"
        style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 600, fill: 'var(--ink)' }}>{pct}</text>
      <text x="70" y="94" textAnchor="middle" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fill: 'var(--muted)' }}>/ 100</text>
    </svg>
  );
}
