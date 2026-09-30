'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Star, Archive, Trash2, ExternalLink } from 'lucide-react';
import { emailApi, schedulerApi, ScheduledEmail, SentEmail } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Suspense } from 'react';

function EmailDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'scheduled';
  const id = params.id as string;

  const [email, setEmail] = useState<ScheduledEmail | SentEmail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const fetchEmail = async () => {
      try {
        const data = await emailApi.getById(id);
        setEmail(data.email);
      } catch {
        toast.error('Email not found');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmail();
  }, [id, router]);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await schedulerApi.cancel(id);
      toast.success('Email cancelled');
      router.push('/dashboard?view=scheduled');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!email) return null;

  const scheduledEmail = email as ScheduledEmail;
  const isScheduled = type === 'scheduled';
  const toEmail = isScheduled
    ? scheduledEmail.to_emails?.[0]
    : (email as SentEmail).to_email;

  const senderInitial = scheduledEmail.from_email?.[0]?.toUpperCase() || 'S';
  const timestamp = isScheduled
    ? scheduledEmail.scheduled_at
    : (email as SentEmail).sent_at || scheduledEmail.created_at;

  return (
    <div className="h-full flex flex-col" style={{ background: '#f3f4f6' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} style={{ color: '#374151' }} />
          </button>
          <h1 className="text-base font-medium truncate max-w-lg" style={{ color: '#111827' }}>
            {email.subject}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <Star size={16} style={{ color: '#9ca3af' }} />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <Archive size={16} style={{ color: '#9ca3af' }} />
          </button>
          {isScheduled && scheduledEmail.status === 'scheduled' && (
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} style={{ color: '#ef4444' }} />
            </button>
          )}

          {/* User avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ml-1"
            style={{ background: '#22c55e' }}
          >
            {senderInitial}
          </div>
        </div>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-auto p-6">
        <div
          className="rounded-xl p-6 fade-in"
          style={{ background: '#fff', border: '1px solid #e5e7eb', maxWidth: '800px', margin: '0 auto' }}
        >
          {/* From/To header */}
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
              style={{ background: '#22c55e' }}
            >
              {senderInitial}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm" style={{ color: '#111827' }}>
                    {scheduledEmail.from_email}
                  </span>
                  <span className="text-xs ml-1" style={{ color: '#9ca3af' }}>
                    &lt;{scheduledEmail.from_email}&gt;
                  </span>
                </div>
                <span className="text-xs" style={{ color: '#9ca3af' }}>
                  {timestamp ? format(new Date(timestamp), 'MMM d, h:mm a') : ''}
                </span>
              </div>
              <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#6b7280' }}>
                to me
                <span style={{ color: '#9ca3af' }}>({toEmail})</span>
              </div>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex gap-2 mb-4">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium badge-${scheduledEmail.status || 'scheduled'}`}
            >
              {scheduledEmail.status?.charAt(0).toUpperCase() + (scheduledEmail.status?.slice(1) || '')}
            </span>
            {isScheduled && scheduledEmail.scheduled_at && (
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                Scheduled: {format(new Date(scheduledEmail.scheduled_at), 'MMM d, h:mm a')}
              </span>
            )}
          </div>

          {/* Email body */}
          <div
            className="prose prose-sm max-w-none text-sm leading-relaxed"
            style={{ color: '#374151' }}
            dangerouslySetInnerHTML={{
              __html: scheduledEmail.body_html || email.body || '',
            }}
          />

          {/* Preview URL */}
          {scheduledEmail.preview_url && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #f0f0f0' }}>
              <a
                href={scheduledEmail.preview_url as string}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                style={{ color: '#16a34a' }}
              >
                <ExternalLink size={14} />
                View in Ethereal Preview
              </a>
            </div>
          )}

          {/* Error message */}
          {scheduledEmail.error_message && (
            <div
              className="mt-4 p-3 rounded-lg text-sm"
              style={{ background: '#fee2e2', color: '#991b1b' }}
            >
              <strong>Error:</strong> {scheduledEmail.error_message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmailDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <EmailDetailContent />
    </Suspense>
  );
}
