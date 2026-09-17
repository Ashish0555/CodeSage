import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { api } from '../lib/api.js';
import { streamSSE } from '../hooks/useSSE.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Chip, Tag, Spinner, Eyebrow, ErrorNote } from '../components/ui.jsx';
import MarkdownView from '../components/MarkdownView.jsx';

const LANGS = [
  { key: 'python', label: 'Python', monaco: 'python' },
  { key: 'cpp', label: 'C++', monaco: 'cpp' },
  { key: 'java', label: 'Java', monaco: 'java' },
  { key: 'javascript', label: 'JavaScript', monaco: 'javascript' },
];

// Verdict → human label. Correctness is decided by the judge, never the LLM.
const VERDICT_LABEL = { AC: 'Accepted', WA: 'Wrong Answer', TLE: 'Time Limit', CE: 'Compile Error', RE: 'Runtime Error' };

export default function ProblemDetail() {
  const { slug } = useParams();
  const { isAuthed } = useAuth();

  const [problem, setProblem] = useState(null);
  const [error, setError] = useState('');
  const [lang, setLang] = useState('python');
  const [code, setCode] = useState('');
  const [tab, setTab] = useState('statement'); // statement | editorial

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null); // last run/submit result

  // Hint panel state (streamed).
  const [hintLevel, setHintLevel] = useState(1);
  const [hintText, setHintText] = useState('');
  const [hinting, setHinting] = useState(false);

  // AI review state.
  const [review, setReview] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const lastSubmissionId = useRef(null);

  // Load problem + seed the editor with starter code for the chosen language.
  useEffect(() => {
    let alive = true;
    api.get(`/problems/${slug}`)
      .then((p) => {
        if (!alive) return;
        setProblem(p);
        const starter = p.starterCode?.[lang] || '';
        setCode(starter);
      })
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // When language changes, swap in that language's starter (only if untouched-ish).
  function changeLang(next) {
    setLang(next);
    const starter = problem?.starterCode?.[next] || '';
    setCode(starter);
    setResult(null);
  }

  async function run(kind) {
    setError(''); setResult(null); setReview(null);
    setRunning(true);
    try {
      if (kind === 'run') {
        const r = await api.post('/run', { problemSlug: slug, language: lang, code });
        setResult({ ...r, kind: 'run' });
      } else {
        const r = await api.post('/submissions', { problemSlug: slug, language: lang, code });
        lastSubmissionId.current = r.submissionId;
        setResult({ ...r, kind: 'submit' });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  function getHint() {
    setHintText(''); setHinting(true);
    streamSSE('/ai/hint', { problemSlug: slug, level: hintLevel, code: code || undefined }, {
      onChunk: (t) => setHintText((prev) => prev + t),
      onError: (m) => { setHintText(`⚠️ ${m}`); setHinting(false); },
      onDone: () => setHinting(false),
    });
  }

  async function getReview() {
    if (!lastSubmissionId.current) return;
    setReviewing(true); setReview(null);
    try {
      const r = await api.post(`/ai/review/${lastSubmissionId.current}`, {});
      setReview(r.review);
    } catch (e) {
      setError(e.message);
    } finally {
      setReviewing(false);
    }
  }

  const monacoLang = useMemo(() => LANGS.find((l) => l.key === lang)?.monaco || 'plaintext', [lang]);

  if (error && !problem) return <ErrorNote>{error}</ErrorNote>;
  if (!problem) return <Spinner label="Loading problem…" />;

  return (
    <div className="workspace">
      {/* LEFT: problem statement, examples, editorial */}
      <section className="stack" style={{ gap: 16, minWidth: 0 }}>
        <div className="stack" style={{ gap: 8 }}>
          <Link to="/" className="muted mono" style={{ fontSize: '0.8rem' }}>← All problems</Link>
          <div className="spread">
            <h1 style={{ margin: 0 }}>{problem.title}</h1>
            <Chip kind="diff" value={problem.difficulty} />
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            {(problem.topics || []).map((t) => <Tag key={t}>{t}</Tag>)}
          </div>
          <Link to={`/interview/${slug}`} className="btn btn-sm" style={{ alignSelf: 'flex-start' }}>
            🎤 Practice this in a mock interview
          </Link>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'statement' ? 'is-active' : ''}`} onClick={() => setTab('statement')}>Statement</button>
          {problem.editorial && (
            <button className={`tab ${tab === 'editorial' ? 'is-active' : ''}`} onClick={() => setTab('editorial')}>Editorial</button>
          )}
        </div>

        {tab === 'statement' ? (
          <div className="card stack" style={{ gap: 16 }}>
            <MarkdownView>{problem.statement}</MarkdownView>
            {problem.constraints && (
              <div>
                <div className="eyebrow">Constraints</div>
                <MarkdownView>{problem.constraints}</MarkdownView>
              </div>
            )}
            {(problem.examples || []).map((ex, i) => (
              <div key={i} className="example">
                <div className="eyebrow">Example {i + 1}</div>
                <div className="mono example-io"><span className="muted">Input</span>{'\n'}{ex.input}</div>
                <div className="mono example-io"><span className="muted">Output</span>{'\n'}{ex.output}</div>
                {ex.explanation && <p className="muted" style={{ margin: '6px 0 0' }}>{ex.explanation}</p>}
              </div>
            ))}
            <p className="muted mono" style={{ fontSize: '0.78rem', margin: 0 }}>
              {problem.hiddenTestCount} hidden test{problem.hiddenTestCount === 1 ? '' : 's'} run on submit.
            </p>
          </div>
        ) : (
          <div className="card"><MarkdownView>{problem.editorial}</MarkdownView></div>
        )}

        {/* Hint panel: tiered, streamed, never spoils the full solution. */}
        <div className="card stack" style={{ gap: 12 }}>
          <div className="spread">
            <div>
              <Eyebrow>AI Hint</Eyebrow>
              <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.86rem' }}>Tiered nudges — never the full solution.</p>
            </div>
            <div className="row">
              <select className="select" style={{ width: 92 }} value={hintLevel} onChange={(e) => setHintLevel(Number(e.target.value))}>
                <option value={1}>Level 1</option>
                <option value={2}>Level 2</option>
                <option value={3}>Level 3</option>
              </select>
              <button className="btn btn-sm" onClick={getHint} disabled={hinting || !isAuthed}>
                {hinting ? 'Streaming…' : 'Get hint'}
              </button>
            </div>
          </div>
          {!isAuthed && <p className="muted" style={{ margin: 0, fontSize: '0.84rem' }}>Sign in to use AI hints.</p>}
          {hintText && <div className="hint-box markdown"><MarkdownView>{hintText}</MarkdownView></div>}
        </div>
      </section>

      {/* RIGHT: editor + actions + results */}
      <section className="stack editor-col" style={{ gap: 12 }}>
        <div className="spread">
          <select className="select" style={{ width: 140 }} value={lang} onChange={(e) => changeLang(e.target.value)}>
            {LANGS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
          <div className="row">
            <button className="btn" onClick={() => run('run')} disabled={running || !isAuthed}>
              {running ? <Spinner /> : 'Run samples'}
            </button>
            <button className="btn btn-primary" onClick={() => run('submit')} disabled={running || !isAuthed}>
              Submit
            </button>
          </div>
        </div>
        {!isAuthed && <ErrorNote>Sign in to run and submit code.</ErrorNote>}

        <div className="editor-shell">
          <Editor
            height="440px"
            language={monacoLang}
            theme="vs-dark"
            value={code}
            onChange={(v) => setCode(v ?? '')}
            options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', scrollBeyondLastLine: false, tabSize: 2 }}
          />
        </div>

        <ErrorNote>{error}</ErrorNote>

        {result && (
          <div className="card stack" style={{ gap: 12 }}>
            <div className="spread">
              <div className="row" style={{ gap: 10 }}>
                <Chip kind="verdict" value={result.verdict}>{VERDICT_LABEL[result.verdict] || result.verdict}</Chip>
                <span className="mono muted" style={{ fontSize: '0.86rem' }}>
                  {result.passedCount}/{result.totalCount} passed · {result.runtimeMs ?? 0}ms
                  {result.kind === 'run' ? ' · samples only' : ''}
                </span>
              </div>
              {result.kind === 'submit' && (
                <button className="btn btn-sm" onClick={getReview} disabled={reviewing}>
                  {reviewing ? 'Reviewing…' : 'AI review'}
                </button>
              )}
            </div>

            {result.compileOutput && (
              <pre className="term term-err">{result.compileOutput}</pre>
            )}

            <div className="stack" style={{ gap: 6 }}>
              {(result.testResults || []).map((t) => (
                <div key={t.index} className="test-row">
                  <span className={`dot ${t.passed ? 'ok' : 'bad'}`} />
                  <span className="mono" style={{ fontSize: '0.82rem' }}>
                    Test {t.index + 1}{t.isHidden ? ' (hidden)' : ''}
                  </span>
                  <span className="mono muted" style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>{t.timeMs ?? 0}ms</span>
                  {!t.passed && !t.isHidden && t.stderr && <pre className="term term-err" style={{ flexBasis: '100%' }}>{t.stderr}</pre>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI review: complexity ESTIMATES + qualitative critique, anchored to the judge verdict. */}
        {review && (
          <div className="card stack" style={{ gap: 12 }}>
            <div className="spread">
              <Eyebrow>AI Review</Eyebrow>
              <span className="tag">judge verdict: {review.groundedVerdict}</span>
            </div>
            <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
              <Metric label="Time (est.)" value={review.timeComplexity} />
              <Metric label="Space (est.)" value={review.spaceComplexity} />
              <Metric label="Code quality" value={`${review.codeQualityScore}/10`} />
            </div>
            <ReviewList title="Strengths" items={review.strengths} />
            <ReviewList title="Improvements" items={review.improvements} />
            <ReviewList title="Edge cases to consider" items={review.edgeCasesMissed} />
            <p className="muted" style={{ margin: 0, fontSize: '0.76rem' }}>
              Complexity is a model estimate, not a proof. The verdict above comes from the deterministic judge.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="stack" style={{ gap: 2 }}>
      <span className="eyebrow">{label}</span>
      <span className="mono" style={{ fontSize: '1.05rem' }}>{value || '—'}</span>
    </div>
  );
}

function ReviewList({ title, items }) {
  if (!items || !items.length) return null;
  return (
    <div className="stack" style={{ gap: 4 }}>
      <div className="eyebrow">{title}</div>
      <ul className="clean-list">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}
