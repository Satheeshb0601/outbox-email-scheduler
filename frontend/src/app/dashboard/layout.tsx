'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1f1f1f' }}>
        <div className="w-10 h-10 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div style={{ background: '#1f1f1f', minHeight: '100vh', padding: '20px' }}>
      <div
        className="flex overflow-hidden"
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          height: 'calc(100vh - 40px)',
        }}
      >
        <Sidebar />
        <main
          className="flex-1 overflow-auto"
          style={{ background: '#f3f4f6' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
