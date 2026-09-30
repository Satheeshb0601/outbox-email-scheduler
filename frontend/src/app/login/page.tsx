'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        toast.success('Welcome back!');
      } else {
        await register(email, password, name || undefined);
        toast.success('Account created!');
      }
      router.push('/dashboard');
    } catch (err) {
      toast.error((err as Error).message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#1f1f1f' }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl shadow-2xl"
        style={{ background: '#ffffff' }}
      >
        <h1 className="text-3xl font-bold text-center mb-6" style={{ color: '#111827' }}>
          {mode === 'login' ? 'Login' : 'Sign Up'}
        </h1>

        {/* Google OAuth */}
        <button
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg mb-4 transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: '#dcfce7', border: '1px solid #bbf7d0' }}
        >
          {/* Google G Icon */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="font-medium" style={{ color: '#111827' }}>Login with Google</span>
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: '#e5e7eb' }} />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 text-sm" style={{ background: '#fff', color: '#9ca3af' }}>
              or sign up through email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full Name"
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2 focus:ring-green-500"
              style={{ background: '#f3f4f6', border: '1px solid transparent', color: '#111827' }}
            />
          )}

          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email ID"
            required
            className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2 focus:ring-green-500"
            style={{ background: '#f3f4f6', border: '1px solid transparent', color: '#111827' }}
          />

          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2 focus:ring-green-500"
            style={{ background: '#f3f4f6', border: '1px solid transparent', color: '#111827' }}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: '#22c55e' }}
          >
            {isLoading ? 'Please wait...' : (mode === 'login' ? 'Login' : 'Create Account')}
          </button>
        </form>

        <p className="text-center mt-4 text-sm" style={{ color: '#6b7280' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="font-medium hover:underline"
            style={{ color: '#16a34a' }}
          >
            {mode === 'login' ? 'Sign up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}
