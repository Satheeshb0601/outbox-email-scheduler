'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, X, ExternalLink } from 'lucide-react';
import { slackApi, schedulerApi, SlackConnection } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [slackConnected, setSlackConnected] = useState(false);
  const [slackConnections, setSlackConnections] = useState<SlackConnection[]>([]);
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [queueStats, setQueueStats] = useState({ waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 });
  const [isLoadingSlack, setIsLoadingSlack] = useState(true);

  useEffect(() => {
    // Load Slack status
    slackApi.getStatus()
      .then(data => {
        setSlackConnected(data.connected);
        setSlackConnections(data.connections);
        if (data.connected) {
          // Load channels
          slackApi.getChannels().then(ch => setChannels(ch.channels)).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingSlack(false));

    // Load queue stats
    schedulerApi.getStats().then(setQueueStats).catch(() => {});
  }, []);

  const handleSlackConnect = () => {
    slackApi.connect();
  };

  const handleSlackDisconnect = async () => {
    try {
      await slackApi.disconnect();
      setSlackConnected(false);
      setSlackConnections([]);
      toast.success('Slack disconnected');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  const handleChannelSave = async () => {
    const ch = channels.find(c => c.id === selectedChannel);
    if (!ch) return toast.error('Select a channel');
    try {
      await slackApi.setChannel(ch.id, ch.name);
      toast.success(`Notifications will be sent to #${ch.name}`);
    } catch {
      toast.error('Failed to update channel');
    }
  };

  return (
    <div className="h-full overflow-auto" style={{ background: '#f3f4f6' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4" style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} style={{ color: '#374151' }} />
        </button>
        <h1 className="text-lg font-semibold" style={{ color: '#111827' }}>Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">

        {/* User Profile */}
        <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
          <h2 className="font-semibold mb-4" style={{ color: '#111827' }}>Profile</h2>
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
              style={{ background: '#22c55e' }}
            >
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="font-medium" style={{ color: '#111827' }}>{user?.name}</div>
              <div className="text-sm" style={{ color: '#6b7280' }}>{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Slack Integration */}
        <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold" style={{ color: '#111827' }}>Slack Integration</h2>
              <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>
                Get notified on Slack when email rate limits are hit
              </p>
            </div>
            {slackConnected ? (
              <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: '#dcfce7', color: '#16a34a' }}>
                <Check size={12} /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: '#fee2e2', color: '#991b1b' }}>
                <X size={12} /> Not connected
              </span>
            )}
          </div>

          {isLoadingSlack ? (
            <div className="h-8 flex items-center">
              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : slackConnected ? (
            <div className="space-y-3">
              {slackConnections.map(conn => (
                <div key={conn.id} className="text-sm" style={{ color: '#374151' }}>
                  Connected to workspace: <strong>{conn.team_name}</strong>
                  {conn.channel_name && (
                    <span style={{ color: '#16a34a' }}> → #{conn.channel_name}</span>
                  )}
                </div>
              ))}

              {channels.length > 0 && (
                <div className="flex items-center gap-3">
                  <select
                    value={selectedChannel}
                    onChange={e => setSelectedChannel(e.target.value)}
                    className="flex-1 text-sm px-3 py-2 rounded-lg outline-none border"
                    style={{ borderColor: '#e5e7eb', color: '#374151' }}
                  >
                    <option value="">Select notification channel...</option>
                    {channels.map(ch => (
                      <option key={ch.id} value={ch.id}>#{ch.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleChannelSave}
                    className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-all hover:opacity-90"
                    style={{ background: '#22c55e' }}
                  >
                    Save
                  </button>
                </div>
              )}

              <button
                onClick={handleSlackDisconnect}
                className="text-sm font-medium hover:underline"
                style={{ color: '#ef4444' }}
              >
                Disconnect Slack
              </button>
            </div>
          ) : (
            <button
              onClick={handleSlackConnect}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all hover:opacity-90"
              style={{ background: '#4A154B', color: '#fff' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
              </svg>
              Connect Slack
            </button>
          )}
        </div>

        {/* Queue Stats */}
        <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: '#111827' }}>Queue Status</h2>
            <a
              href="http://localhost:3001/admin/queues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium hover:underline"
              style={{ color: '#16a34a' }}
            >
              <ExternalLink size={12} />
              Open Bull Board
            </a>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Waiting', value: queueStats.waiting, color: '#6b7280' },
              { label: 'Active', value: queueStats.active, color: '#3b82f6' },
              { label: 'Delayed', value: queueStats.delayed, color: '#f59e0b' },
              { label: 'Completed', value: queueStats.completed, color: '#22c55e' },
              { label: 'Failed', value: queueStats.failed, color: '#ef4444' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Environment Info */}
        <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
          <h2 className="font-semibold mb-4" style={{ color: '#111827' }}>Environment</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: '#6b7280' }}>API URL</span>
              <span style={{ color: '#374151' }}>{process.env.NEXT_PUBLIC_API_URL}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#6b7280' }}>Bull Board</span>
              <a href="http://localhost:3001/admin/queues" target="_blank" className="text-green-600 hover:underline">
                localhost:3001/admin/queues
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
