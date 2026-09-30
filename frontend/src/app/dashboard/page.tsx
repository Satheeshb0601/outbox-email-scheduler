'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RefreshCw, Filter, Star } from 'lucide-react';
import { emailApi, ScheduledEmail, SentEmail } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { format } from 'date-fns';

function EmailRow({
  email,
  type,
  onClick,
}: {
  email: ScheduledEmail | SentEmail;
  type: 'scheduled' | 'sent';
  onClick: () => void;
}) {
  const isScheduled = type === 'scheduled';
  const scheduledEmail = email as ScheduledEmail;
  const sentEmail = email as SentEmail;

  const toEmail = isScheduled
    ? (scheduledEmail.to_emails?.[0] || 'Unknown')
    : sentEmail.to_email;

  const timestamp = isScheduled
    ? scheduledEmail.scheduled_at
    : sentEmail.sent_at;

  const formattedTime = timestamp
    ? format(new Date(timestamp), 'EEE h:mm a')
    : '';

  return (
    <div
      className="email-item flex items-center px-4 py-3 cursor-pointer border-b transition-colors"
      style={{ borderColor: '#f0f0f0' }}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium" style={{ color: '#111827' }}>
            To: {toEmail}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Time badge */}
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
            style={{
              background: isScheduled ? '#fed7aa' : '#d1fae5',
              color: isScheduled ? '#92400e' : '#065f46',
            }}
          >
            <span className="w-3 h-3">⏱</span>
            {formattedTime}
          </span>
          <span className="text-sm font-medium truncate" style={{ color: '#374151' }}>
            {email.subject}
          </span>
          <span className="text-sm truncate" style={{ color: '#9ca3af' }}>
            {' '}- {email.body?.substring(0, 60)}...
          </span>
        </div>
      </div>
      <button
        className="ml-2 text-gray-300 hover:text-yellow-400 transition-colors"
        onClick={e => e.stopPropagation()}
      >
        <Star size={16} />
      </button>
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'scheduled';
  const router = useRouter();

  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchEmails = useCallback(async () => {
    setIsLoading(true);
    try {
      if (view === 'scheduled') {
        const data = await emailApi.getScheduled({ search: searchQuery || undefined });
        setScheduledEmails(data.emails);
      } else {
        const data = await emailApi.getSent({ search: searchQuery || undefined });
        setSentEmails(data.emails);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [view, searchQuery]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const emails = view === 'scheduled' ? scheduledEmails : sentEmails;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchEmails()}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              color: '#111827',
            }}
          />
        </div>
        <button
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          title="Filter"
        >
          <Filter size={16} className="text-gray-500" />
        </button>
        <button
          onClick={fetchEmails}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} className={`text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <p className="text-sm">No {view} emails found</p>
          </div>
        ) : (
          emails.map(email => (
            <EmailRow
              key={email.id}
              email={email}
              type={view as 'scheduled' | 'sent'}
              onClick={() => router.push(`/dashboard/email/${email.id}?type=${view}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
