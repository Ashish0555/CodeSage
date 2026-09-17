import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { streamSSE } from '../hooks/useSSE.js';
import { Spinner, Eyebrow, ErrorNote } from '../components/ui.jsx';
import MarkdownView from '../components/MarkdownView.jsx';

/**
 * Mock interview. The transcript (messages[]) IS the conversation state — the
 * backend persists it and replays it to the model each turn. We stream the
 * interviewer's replies token-by-token over SSE.
 */
export default function Interview() {
  const { slug } = useParams();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]); // {role, content}
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const bottom = useRef(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streaming]);

  // Start the session on mount: server sends a `session` event then streams the opening turn.
  useEffect(() => {
    let started = false;
    if (started) return;
    started = true;
    setStreaming(true);
    setMessages([{ role: 'interviewer', content: '' }]);
    streamSSE('/interviews', { problemSlug: slug }, {
      onEvent: (name, data) => { if (name === 'session') setSessionId(data.sessionId); },
      onChunk: (t) => setMessages((m) => patchLast(m, t)),
      onError: (msg) => { setError(msg); setStreaming(false); },
      onDone: () => setStreaming(false),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function patchLast(list, text) {
    const copy = [...list];
    copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + text };
    return copy;
  }

  async function send(e) {
    e.preventDefault();
    if (!draft.trim() || !sessionId || streaming) return;
    const text = draft.trim();
    setDraft('');
    setError('');
    // optimistic: candidate bubble + empty interviewer bubble to fill by stream
    setMessages((m) => [...m, { role: 'candidate', content: text }, { role: 'interviewer', content: '' }]);
    setStreaming(true);
    streamSSE(`/interviews/${sessionId}/message`, { message: text }, {
      onChunk: (t) => setMessages((m) => patchLast(m, t)),
      onError: (msg) => { setError(msg); setStreaming(false); },
      onDone: () => setStreaming(false),
    });
  }

  async function finish() {
    if (!sessionId) return;
    setFinishing(true); setError('');
    try {
      const r = await api.post(`/interviews/${sessionId}/finish`, {});
      setEvaluation(r.evaluation);
    } catch (e) {
      setError(e.message);
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 16, maxWidth: 820 }}>
      <div className="spread">
        <div>
          <Eyebrow>Mock Interview</Eyebrow>
          <h1 style={{ margin: '2px 0 0' }}>Problem: <span className="mono">{slug}</span></h1>
        </div>
        <div className="row">
          <Link className="btn btn-sm" to={`/problems/${slug}`}>Open problem</Link>
          <button className="btn btn-sm" onClick={finish} disabled={finishing || !sessionId || !!evaluation}>
            {finishing ? 'Scoring…' : 'End & score'}
          </button>
        </div>
      </div>

      <ErrorNote>{error}</ErrorNote>

      <div className="chat">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <div className="bubble-role">{m.role === 'interviewer' ? 'Interviewer' : 'You'}</div>
            {m.content
              ? <MarkdownView>{m.content}</MarkdownView>
              : (streaming && i === messages.length - 1 ? <Spinner label="thinking…" /> : null)}
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {evaluation ? (
        <div className="card stack" style={{ gap: 10 }}>
          <Eyebrow>Scorecard</Eyebrow>
          <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
            <Score label="Problem solving" v={evaluation.problemSolving} />
            <Score label="Communication" v={evaluation.communication} />
            <Score label="Code quality" v={evaluation.codeQuality} />
            <Score label="Overall" v={evaluation.overall} strong />
          </div>
          {evaluation.notes && <p className="muted" style={{ margin: 0 }}>{evaluation.notes}</p>}
        </div>
      ) : (
        <form className="row" onSubmit={send} style={{ gap: 8 }}>
          <input className="input" style={{ flex: 1 }} placeholder="Type your answer…" value={draft}
            onChange={(e) => setDraft(e.target.value)} disabled={streaming || !sessionId} />
          <button className="btn btn-primary" disabled={streaming || !sessionId || !draft.trim()}>Send</button>
        </form>
      )}
    </div>
  );
}

function Score({ label, v, strong }) {
  return (
    <div className="stack" style={{ gap: 2 }}>
      <span className="eyebrow">{label}</span>
      <span className="mono" style={{ fontSize: strong ? '1.5rem' : '1.15rem', color: strong ? 'var(--accent-ink)' : 'inherit' }}>
        {v ?? 0}<span className="muted" style={{ fontSize: '0.8rem' }}>/10</span>
      </span>
    </div>
  );
}
