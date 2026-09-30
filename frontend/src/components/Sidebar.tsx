'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Clock, Send, PenSquare, ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { emailApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Suspense } from 'react';

function SidebarContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'scheduled';

  const [counts, setCounts] = useState({ scheduled: 0, sent: 0 });
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    emailApi.getCounts().then(setCounts).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    router.push('/login');
  };

  const isScheduledActive = pathname === '/dashboard' && currentView === 'scheduled';
  const isSentActive = pathname === '/dashboard' && currentView === 'sent';

  return (
    <div
      className="flex flex-col h-full"
      style={{
        width: '200px',
        minWidth: '200px',
        background: '#f9fafb',
        borderRight: '1px solid #f0efed',
      }}
    >
      {/* Logo */}
      <div className="px-4 pt-4 pb-2">
        <div className="text-2xl font-bold tracking-tighter" style={{ color: '#111827', letterSpacing: '-0.05em' }}>
          ONG
        </div>
      </div>

      {/* User Info */}
      <div className="px-3 mb-3">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
            style={{ background: '#22c55e' }}
          >
            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-xs font-medium truncate" style={{ color: '#111827' }}>
              {user?.name || user?.email?.split('@')[0]}
            </div>
            <div className="text-xs truncate" style={{ color: '#9ca3af' }}>
              {user?.email}
            </div>
          </div>
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        {showUserMenu && (
          <div
            className="mt-1 rounded-lg overflow-hidden shadow-lg border"
            style={{ background: '#fff', borderColor: '#e5e7eb' }}
          >
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
              style={{ color: '#374151' }}
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Compose Button */}
      <div className="px-3 mb-3">
        <Link href="/dashboard/compose">
          <button
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: 'transparent',
              border: '1.5px solid #22c55e',
              color: '#16a34a',
            }}
          >
            <PenSquare size={14} />
            Compose
          </button>
        </Link>
      </div>

      {/* Navigation */}
      <div className="px-3">
        <div className="text-xs font-semibold uppercase tracking-wider mb-2 px-2" style={{ color: '#9ca3af' }}>
          CORE
        </div>

        <Link href="/dashboard?view=scheduled">
          <div
            className={`flex items-center justify-between px-2 py-2 rounded-lg mb-1 cursor-pointer transition-all ${
              isScheduledActive ? 'sidebar-item-active' : 'hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock size={15} style={{ color: isScheduledActive ? '#16a34a' : '#6b7280' }} />
              <span className="text-sm" style={{ color: isScheduledActive ? '#16a34a' : '#374151' }}>
                Scheduled
              </span>
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: isScheduledActive ? '#16a34a' : '#9ca3af' }}
            >
              {counts.scheduled}
            </span>
          </div>
        </Link>

        <Link href="/dashboard?view=sent">
          <div
            className={`flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer transition-all ${
              isSentActive ? 'sidebar-item-active' : 'hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Send size={15} style={{ color: isSentActive ? '#16a34a' : '#6b7280' }} />
              <span className="text-sm" style={{ color: isSentActive ? '#16a34a' : '#374151' }}>
                Sent
              </span>
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: isSentActive ? '#16a34a' : '#9ca3af' }}
            >
              {counts.sent}
            </span>
          </div>
        </Link>
      </div>

      {/* Bottom spacer */}
      <div className="flex-1" />

      {/* Bull Board Link */}
      <div className="px-3 pb-3">
        <a
          href="http://localhost:3001/admin/queues"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs hover:bg-gray-100 transition-colors"
          style={{ color: '#9ca3af' }}
        >
          <ChevronRight size={12} />
          Queue Dashboard
        </a>
      </div>
    </div>
  );
}

export default function Sidebar() {
  return (
    <Suspense fallback={
      <div style={{ width: '200px', minWidth: '200px', background: '#f9fafb', borderRight: '1px solid #f0efed' }} />
    }>
      <SidebarContent />
    </Suspense>
  );
}
