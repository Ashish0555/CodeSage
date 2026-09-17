import { Routes, Route, Link, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { PREVIEW } from './lib/preview.js';
import ProblemList from './pages/ProblemList.jsx';
import ProblemDetail from './pages/ProblemDetail.jsx';
import Interview from './pages/Interview.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Tutor from './pages/Tutor.jsx';
import AuthPage from './pages/AuthPage.jsx';

/** Thin banner shown only in preview mode so sample data is never mistaken for live. */
function PreviewBanner() {
  if (!PREVIEW) return null;
  return (
    <div style={{
      background: 'var(--accent-ink, #22347a)', color: '#fff', textAlign: 'center',
      fontFamily: 'var(--font-mono, monospace)', fontSize: '0.78rem', padding: '6px 12px',
    }}>
      Preview mode · sample data, no backend — hints, judging &amp; scores are canned for a UI walkthrough
    </div>
  );
}

function Nav() {
  const { isAuthed, user, logout } = useAuth();
  return (
    <nav className="nav">
      <div className="container">
        <Link to="/" className="brand"><span className="mark">CS</span> CodeSage</Link>
        <div className="nav-links">
          <NavLink to="/" end>Problems</NavLink>
          <NavLink to="/tutor">Tutor</NavLink>
          {isAuthed && <NavLink to="/dashboard">Dashboard</NavLink>}
          {isAuthed ? (
            <>
              <span className="muted mono" style={{ fontSize: '0.82rem' }}>{user?.name}</span>
              <button className="btn btn-sm" onClick={logout}>Sign out</button>
            </>
          ) : (
            <NavLink to="/auth" className="btn btn-sm btn-primary" style={{ color: '#fff' }}>Sign in</NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}

/** Gate routes that need auth; bounce to /auth preserving intent. */
function Protected({ children }) {
  const { isAuthed } = useAuth();
  const loc = useLocation();
  if (!isAuthed) return <Navigate to="/auth" state={{ from: loc.pathname }} replace />;
  return children;
}

export default function App() {
  return (
    <>
      <PreviewBanner />
      <Nav />
      <main className="container" style={{ padding: '26px 20px 60px' }}>
        <Routes>
          <Route path="/" element={<ProblemList />} />
          <Route path="/problems/:slug" element={<ProblemDetail />} />
          <Route path="/tutor" element={<Tutor />} />
          <Route path="/interview/:slug" element={<Protected><Interview /></Protected>} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
