import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Pencil, Eye, EyeOff, Loader2 } from 'lucide-react';

const BASE = 'http://localhost:5000';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(`${BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      login(data);
      navigate('/');
    } catch {
      setError('Cannot connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Pencil size={28} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Co-Canvas</h1>
          <p className="text-slate-500 text-sm mt-1">Collaborative Whiteboard</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                mode === 'login'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                mode === 'register'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Password {mode === 'register' && <span className="text-slate-400 normal-case font-normal">(min 6 characters)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Create a password' : 'Enter your password'}
                  required
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm mt-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Processing...</>
              ) : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
