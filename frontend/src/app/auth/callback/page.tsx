'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setToken } = useAuth() as { setToken: (token: string, user: unknown) => void };

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.replace('/login?error=no_token');
      return;
    }

    // Store token and fetch user
    localStorage.setItem('auth_token', token);
    
    // Fetch user info using the token
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setToken(token, data.user);
          router.replace('/dashboard');
        } else {
          router.replace('/login?error=auth_failed');
        }
      })
      .catch(() => {
        router.replace('/login?error=auth_failed');
      });
  }, [router, searchParams, setToken]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1f1f1f' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
        <p className="text-gray-400 text-sm">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1f1f1f' }}>
        <div className="w-10 h-10 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}
