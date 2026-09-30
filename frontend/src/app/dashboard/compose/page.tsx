'use client';

import { useState, useRef, KeyboardEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Paperclip, Clock, Send, X, Upload, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { schedulerApi } from '@/lib/api';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

interface QuickTime {
  label: string;
  getDate: () => Date;
}

const QUICK_TIMES: QuickTime[] = [
  {
    label: 'Tomorrow',
    getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
  {
    label: 'Tomorrow, 10:00 AM',
    getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      return d;
    },
  },
  {
    label: 'Tomorrow, 11:00 AM',
    getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(11, 0, 0, 0);
      return d;
    },
  },
  {
    label: 'Tomorrow, 3:00 PM',
    getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(15, 0, 0, 0);
      return d;
    },
  },
];

export default function ComposePage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listInputRef = useRef<HTMLInputElement>(null);

  const [fromEmail, setFromEmail] = useState(user?.email || '');
  const [toEmails, setToEmails] = useState<string[]>([]);
  const [toInput, setToInput] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [delayMs, setDelayMs] = useState(1000);
  const [hourlyLimit, setHourlyLimit] = useState(100);
  const [scheduledAt, setScheduledAt] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSendLater, setShowSendLater] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  // Add email tag on Enter or comma
  const handleToKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addToEmail(toInput);
    }
  };

  const addToEmail = (value: string) => {
    const email = value.trim().replace(',', '');
    if (email && email.includes('@') && !toEmails.includes(email)) {
      setToEmails(prev => [...prev, email]);
      setToInput('');
    }
  };

  const removeToEmail = (email: string) => {
    setToEmails(prev => prev.filter(e => e !== email));
  };

  const handleListUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast.success(`Loaded: ${file.name}`);
    }
  };

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const handleQuickTime = (qt: QuickTime) => {
    const d = qt.getDate();
    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    const formatted = d.toISOString().slice(0, 16);
    setScheduledAt(formatted);
    setShowSendLater(false);
    toast.success(`Scheduled for ${qt.label}`);
  };

  const handleSend = useCallback(async (sendNow = false) => {
    if (!fromEmail) return toast.error('From email is required');
    if (!subject) return toast.error('Subject is required');
    if (!bodyText && !bodyHtml) return toast.error('Email body is required');
    if (toEmails.length === 0 && !uploadedFile) return toast.error('Add at least one recipient');

    const finalScheduledAt = sendNow
      ? new Date(Date.now() + 5000).toISOString()
      : scheduledAt
        ? new Date(scheduledAt).toISOString()
        : new Date(Date.now() + 5000).toISOString();

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('fromEmail', fromEmail);
      formData.append('subject', subject);
      formData.append('body', bodyText);
      formData.append('bodyHtml', bodyHtml);
      formData.append('scheduledAt', finalScheduledAt);
      formData.append('delayBetweenEmailsMs', String(delayMs));
      formData.append('hourlyLimit', String(hourlyLimit));

      if (uploadedFile) {
        formData.append('recipientList', uploadedFile);
      } else {
        formData.append('recipients', JSON.stringify(toEmails));
      }

      const result = await schedulerApi.schedule(formData);
      toast.success(`${result.count} email(s) scheduled successfully!`);
      router.push('/dashboard?view=scheduled');
    } catch (err) {
      toast.error((err as Error).message || 'Failed to schedule email');
    } finally {
      setIsSubmitting(false);
    }
  }, [fromEmail, subject, bodyText, bodyHtml, toEmails, uploadedFile, scheduledAt, delayMs, hourlyLimit, router]);

  const MAX_VISIBLE_TAGS = 3;
  const visibleTags = toEmails.slice(0, MAX_VISIBLE_TAGS);
  const hiddenCount = toEmails.length - MAX_VISIBLE_TAGS;

  return (
    <div className="min-h-screen compose-window">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={18} style={{ color: '#374151' }} />
          </button>
          <h1 className="text-lg font-semibold" style={{ color: '#111827' }}>
            Compose New Email
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Attachment button */}
          <input type="file" ref={fileInputRef} onChange={handleAttachment} multiple className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative p-2 rounded-lg hover:bg-gray-200 transition-colors"
            title="Attach file"
          >
            <Paperclip size={18} style={{ color: '#374151' }} />
            {attachments.length > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-xs text-white rounded-full"
                style={{ background: '#22c55e', fontSize: '10px' }}
              >
                {attachments.length}
              </span>
            )}
          </button>

          {/* Schedule picker */}
          <div className="relative">
            <button
              onClick={() => setShowSendLater(!showSendLater)}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              title="Schedule"
            >
              <Clock size={18} style={{ color: '#374151' }} />
            </button>

            {showSendLater && (
              <div
                className="absolute right-0 top-10 z-50 w-64 rounded-xl shadow-xl border"
                style={{ background: '#fff', borderColor: '#e5e7eb' }}
              >
                <div className="px-4 py-3 border-b" style={{ borderColor: '#f0f0f0' }}>
                  <h3 className="font-semibold text-sm" style={{ color: '#111827' }}>Send Later</h3>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={e => setScheduledAt(e.target.value)}
                      className="flex-1 text-sm px-3 py-2 rounded-lg outline-none border"
                      style={{ borderColor: '#e5e7eb', color: '#374151' }}
                    />
                    <Calendar size={16} className="text-gray-400" />
                  </div>
                  <div className="space-y-1">
                    {QUICK_TIMES.map(qt => (
                      <button
                        key={qt.label}
                        onClick={() => handleQuickTime(qt)}
                        className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                        style={{ color: '#374151' }}
                      >
                        {qt.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 mt-3 pt-3 border-t" style={{ borderColor: '#f0f0f0' }}>
                    <button
                      onClick={() => setShowSendLater(false)}
                      className="px-4 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                      style={{ color: '#6b7280' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setShowSendLater(false)}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors"
                      style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Send Later / Send Button */}
          <button
            onClick={() => scheduledAt ? handleSend(false) : setShowSendLater(true)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: scheduledAt ? '#22c55e' : 'transparent',
              color: scheduledAt ? '#fff' : '#16a34a',
              border: scheduledAt ? 'none' : '1.5px solid #22c55e',
            }}
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Clock size={15} />
            )}
            {scheduledAt ? 'Schedule' : 'Send Later'}
          </button>

          <button
            onClick={() => handleSend(true)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#22c55e' }}
          >
            <Send size={15} />
            Send
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto p-6">
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #e5e7eb' }}
        >
          {/* From */}
          <div className="flex items-center px-4 py-3" style={{ borderBottom: '1px solid #f0f0f0' }}>
            <label className="text-sm w-16 flex-shrink-0" style={{ color: '#6b7280' }}>From</label>
            <select
              value={fromEmail}
              onChange={e => setFromEmail(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: '#111827' }}
            >
              <option value={user?.email || ''}>{user?.email}</option>
            </select>
          </div>

          {/* To */}
          <div className="flex items-start px-4 py-3" style={{ borderBottom: '1px solid #f0f0f0' }}>
            <label className="text-sm w-16 flex-shrink-0 mt-1.5" style={{ color: '#6b7280' }}>To</label>
            <div className="flex-1 flex flex-wrap items-center gap-1.5">
              {visibleTags.map(email => (
                <span key={email} className="email-tag">
                  {email}
                  <button onClick={() => removeToEmail(email)} className="hover:text-red-500 transition-colors">
                    <X size={11} />
                  </button>
                </span>
              ))}
              {hiddenCount > 0 && (
                <span className="email-tag">+{hiddenCount}</span>
              )}
              <input
                type="text"
                value={toInput}
                onChange={e => setToInput(e.target.value)}
                onKeyDown={handleToKeyDown}
                onBlur={() => addToEmail(toInput)}
                placeholder={toEmails.length === 0 ? 'recipient@example.com' : ''}
                className="flex-1 min-w-32 text-sm outline-none bg-transparent"
                style={{ color: '#111827' }}
              />
            </div>
            {/* Upload list button */}
            <input
              type="file"
              ref={listInputRef}
              accept=".csv,.txt"
              onChange={handleListUpload}
              className="hidden"
            />
            <button
              onClick={() => listInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-medium ml-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-green-50"
              style={{ color: '#16a34a', whiteSpace: 'nowrap' }}
            >
              <Upload size={13} />
              Upload List
            </button>
          </div>

          {/* Uploaded file indicator */}
          {uploadedFile && (
            <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid #f0f0f0', background: '#f0fdf4' }}>
              <span className="text-xs" style={{ color: '#16a34a' }}>
                📎 {uploadedFile.name} ({Math.round(uploadedFile.size / 1024)} KB)
              </span>
              <button onClick={() => setUploadedFile(null)} className="text-red-400 hover:text-red-600">
                <X size={12} />
              </button>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center px-4 py-3" style={{ borderBottom: '1px solid #f0f0f0' }}>
            <label className="text-sm w-16 flex-shrink-0" style={{ color: '#6b7280' }}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: '#111827' }}
            />
          </div>

          {/* Delay & Hourly Limit */}
          <div className="flex items-center gap-6 px-4 py-3" style={{ borderBottom: '1px solid #f0f0f0' }}>
            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ color: '#6b7280' }}>Delay between 2 emails</label>
              <input
                type="number"
                value={Math.round(delayMs / 1000)}
                onChange={e => setDelayMs(parseInt(e.target.value) * 1000 || 1000)}
                min={0}
                className="w-16 text-sm px-2 py-1 rounded-lg outline-none text-center"
                style={{ background: '#f3f4f6', color: '#111827', border: '1px solid #e5e7eb' }}
              />
              <span className="text-xs" style={{ color: '#9ca3af' }}>sec</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ color: '#6b7280' }}>Hourly Limit</label>
              <input
                type="number"
                value={hourlyLimit}
                onChange={e => setHourlyLimit(parseInt(e.target.value) || 100)}
                min={1}
                className="w-16 text-sm px-2 py-1 rounded-lg outline-none text-center"
                style={{ background: '#f3f4f6', color: '#111827', border: '1px solid #e5e7eb' }}
              />
            </div>
          </div>

          {/* Rich Text Editor */}
          <div style={{ minHeight: '280px' }}>
            <RichTextEditor
              onChange={(html, text) => {
                setBodyHtml(html);
                setBodyText(text);
              }}
              placeholder="Type Your Reply..."
            />
          </div>

          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="px-4 py-3 flex flex-wrap gap-3" style={{ borderTop: '1px solid #f0f0f0' }}>
              {attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg"
                  style={{ background: '#f3f4f6', width: '100px' }}
                >
                  <div
                    className="w-16 h-12 rounded flex items-center justify-center"
                    style={{ background: '#e5e7eb' }}
                  >
                    <Paperclip size={20} className="text-gray-400" />
                  </div>
                  <span className="text-xs text-center truncate w-full" style={{ color: '#6b7280' }}>
                    {file.name}
                  </span>
                  <span className="text-xs" style={{ color: '#9ca3af' }}>
                    {Math.round(file.size / 1024)} KB
                  </span>
                  <button
                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
