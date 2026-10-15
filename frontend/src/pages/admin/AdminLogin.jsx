import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post('/auth/login', { email, password });
      if (data && data.token) {
        localStorage.setItem('admin_token', data.token);
        if (data.audit_id) {
          localStorage.setItem('admin_audit_id', String(data.audit_id));
        }
        if (data.user) {
          localStorage.setItem('admin_user', JSON.stringify(data.user));
        }
        navigate('/admin');
      } else {
        setError(data.message || 'Invalid email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-burgundy-700/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-champagne-500/10 rounded-full blur-3xl" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-champagne-400 to-burgundy-600 flex items-center justify-center mb-4">
            <span className="text-white font-bold text-xl">TIA</span>
          </div>
          <h1 className="font-display text-3xl font-bold gold-text">Admin Dashboard</h1>
          <p className="text-white/40 text-sm mt-2">Sign in to manage the Telugu Icon Awards</p>
        </div>
        <div className="glass-card p-8">
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-burgundy-900/50 border border-burgundy-500/40 text-white/80 text-sm">
              ⚠️ {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="admin@teluguiconawards.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full disabled:opacity-40">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <a href="/" className="block text-center text-white/40 text-xs mt-6 hover:text-champagne-400 transition-colors">
            ← Back to Website
          </a>
        </div>
      </div>
    </div>
  );
}