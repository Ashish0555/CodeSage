import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorNote, Eyebrow } from '../components/ui.jsx';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const dest = loc.state?.from || '/';

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      nav(dest, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto' }} className="stack">
      <div className="stack" style={{ gap: 6 }}>
        <Eyebrow>{mode === 'login' ? 'Welcome back' : 'Create your desk'}</Eyebrow>
        <h1 style={{ margin: 0 }}>{mode === 'login' ? 'Sign in to CodeSage' : 'Start practicing'}</h1>
      </div>
      <form className="card pad-lg stack" onSubmit={submit}>
        {mode === 'register' && (
          <div>
            <label className="field">Name</label>
            <input className="input" value={form.name} onChange={set('name')} required />
          </div>
        )}
        <div>
          <label className="field">Email</label>
          <input className="input" type="email" value={form.email} onChange={set('email')} required />
        </div>
        <div>
          <label className="field">Password</label>
          <input className="input" type="password" value={form.password} onChange={set('password')} required minLength={6} />
        </div>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? "New here? Create an account" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
