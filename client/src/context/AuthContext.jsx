import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAuthToken } from '../lib/api.js';
import { PREVIEW, PREVIEW_TOKEN, PREVIEW_USER } from '../lib/preview.js';

/**
 * Auth state. The JWT lives in React state + a module-level variable in
 * api.js (NOT localStorage, which isn't available in this sandbox and is also
 * XSS-exposed). On refresh the user re-logs in — acceptable for an MVP; a
 * production build would use an httpOnly refresh cookie.
 *
 * PREVIEW MODE: when VITE_PREVIEW is set we auto-sign-in a fake user so gated
 * pages render and action buttons are enabled — purely for the UI walkthrough.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(PREVIEW ? PREVIEW_TOKEN : null);
  const [user, setUser] = useState(PREVIEW ? PREVIEW_USER : null);
  const [ready, setReady] = useState(true);

  useEffect(() => { setAuthToken(token); }, [token]);

  const login = useCallback(async (email, password) => {
    const { token: t, user: u } = await api.post('/auth/login', { email, password });
    setToken(t); setUser(u); return u;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { token: t, user: u } = await api.post('/auth/register', { name, email, password });
    setToken(t); setUser(u); return u;
  }, []);

  const logout = useCallback(() => { setToken(null); setUser(null); }, []);

  return (
    <AuthContext.Provider value={{ token, user, ready, login, register, logout, isAuthed: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
