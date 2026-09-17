import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner, Eyebrow, ErrorNote } from '../components/ui.jsx';

/**
 * RAG concept tutor. Answers are grounded in retrieved knowledge-base chunks
 * and rendered with the cited sources the backend returns.
 */
export default function Tutor() {
  const { isAuthed } = useAuth();
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function ask(e) {
    e.preventDefault();
    setError(''); setResult(null); setLoading(true);
    try {
      setResult(await api.post('/ai/ask', { question }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 760 }}>
      <div className="stack" style={{ gap: 6 }}>
        <Eyebrow>Concept Tutor · RAG</Eyebrow>
        <h1 style={{ margin: 0 }}>Ask about any DSA concept</h1>
        <p className="muted" style={{ margin: 0 }}>
          Answers are grounded in a curated knowledge base and cite their sources — so you can trust and verify them.
        </p>
      </div>

      {!isAuthed && <ErrorNote>Sign in to use the tutor (it calls the AI backend).</ErrorNote>}

      <form className="card stack" onSubmit={ask}>
        <textarea className="input" rows={3} placeholder="e.g. When should I use a monotonic stack?"
          value={question} onChange={(e) => setQuestion(e.target.value)} required minLength={3} />
        <div className="spread">
          <span className="muted mono" style={{ fontSize: '0.78rem' }}>Retrieval-augmented · cited</span>
          <button className="btn btn-primary" disabled={loading || !isAuthed}>{loading ? 'Thinking…' : 'Ask'}</button>
        </div>
      </form>

      <ErrorNote>{error}</ErrorNote>
      {loading && <Spinner label="Retrieving context & answering…" />}

      {result && (
        <div className="stack" style={{ gap: 14 }}>
          <div className="card markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.answer}</ReactMarkdown>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <div className="eyebrow">{result.grounded ? 'Sources' : 'No grounding sources found'}</div>
            {(result.sources || []).map((s) => (
              <div key={s.n} className="card" style={{ padding: '10px 14px' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong className="mono" style={{ fontSize: '0.85rem' }}>[{s.n}] {s.title || s.source}</strong>
                  <span className="tag">score {Number(s.score || 0).toFixed(3)}</span>
                </div>
                <p className="muted" style={{ margin: '6px 0 0', fontSize: '0.88rem' }}>{s.preview}…</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
