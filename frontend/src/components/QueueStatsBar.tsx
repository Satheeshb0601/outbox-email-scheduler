'use client';

import { useEffect, useState } from 'react';
import { schedulerApi } from '@/lib/api';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export default function QueueStatsBar() {
  const [stats, setStats] = useState<QueueStats | null>(null);

  useEffect(() => {
    const fetchStats = () => {
      schedulerApi.getStats().then(setStats).catch(() => {});
    };
    fetchStats();
    // Refresh every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  return (
    <div
      className="flex items-center gap-4 px-4 py-2 text-xs border-b"
      style={{ background: '#f0fdf4', borderColor: '#dcfce7' }}
    >
      <span style={{ color: '#6b7280' }}>Queue:</span>
      {[
        { label: 'Waiting', value: stats.waiting, color: '#6b7280' },
        { label: 'Active', value: stats.active, color: '#3b82f6' },
        { label: 'Delayed', value: stats.delayed, color: '#f59e0b' },
        { label: 'Done', value: stats.completed, color: '#22c55e' },
        { label: 'Failed', value: stats.failed, color: '#ef4444' },
      ].map(s => (
        <span key={s.label} className="flex items-center gap-1">
          <span className="font-semibold" style={{ color: s.color }}>{s.value}</span>
          <span style={{ color: '#9ca3af' }}>{s.label}</span>
        </span>
      ))}
      <a
        href="http://localhost:3001/admin/queues"
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto text-xs hover:underline"
        style={{ color: '#16a34a' }}
      >
        Bull Board →
      </a>
    </div>
  );
}
