// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../contexts/authStore';

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const register = useAuthStore(s => s.register);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.password) return toast.error('Fill in required fields');
    if (form.password.length < 8) return toast.error('Password must be 8+ characters');
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created!');
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const u = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen bg-surface-0 bg-mesh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-4 shadow-glow">
            <span className="text-white font-display font-bold text-xl">R</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-surface-950">Create your account</h1>
          <p className="text-surface-500 text-sm mt-1">Start cross-listing in minutes</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">First name *</label><input value={form.firstName} onChange={e => u('firstName', e.target.value)} className="input-field" /></div>
            <div><label className="input-label">Last name</label><input value={form.lastName} onChange={e => u('lastName', e.target.value)} className="input-field" /></div>
          </div>
          <div><label className="input-label">Email *</label><input type="email" value={form.email} onChange={e => u('email', e.target.value)} className="input-field" /></div>
          <div><label className="input-label">Password *</label><input type="password" value={form.password} onChange={e => u('password', e.target.value)} className="input-field" placeholder="Min 8 characters" /></div>
          <button type="submit" disabled={loading} className="btn-primary w-full btn-lg">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
          <p className="text-xs text-surface-500 text-center">Free plan includes 25 listings on 2 marketplaces</p>
        </form>

        <p className="text-center text-sm text-surface-500 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
