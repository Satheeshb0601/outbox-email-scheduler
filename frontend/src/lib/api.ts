// API Client for communicating with the backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name?: string) =>
    apiFetch<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  logout: () =>
    apiFetch('/auth/logout', { method: 'POST' }),

  me: () =>
    apiFetch<{ user: User }>('/auth/me'),

  googleLogin: () => {
    window.location.href = `${API_URL}/auth/google`;
  },
};

// Emails
export const emailApi = {
  getScheduled: (params?: { page?: number; limit?: number; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.search) qs.set('search', params.search);
    return apiFetch<{ emails: ScheduledEmail[]; total: number; page: number; totalPages: number }>(
      `/api/emails/scheduled?${qs}`
    );
  },

  getSent: (params?: { page?: number; limit?: number; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.search) qs.set('search', params.search);
    return apiFetch<{ emails: SentEmail[]; total: number; page: number; totalPages: number }>(
      `/api/emails/sent?${qs}`
    );
  },

  getCounts: () =>
    apiFetch<{ scheduled: number; sent: number }>('/api/emails/counts/summary'),

  getById: (id: string) =>
    apiFetch<{ email: ScheduledEmail }>(`/api/emails/${id}`),
};

// Scheduler
export const schedulerApi = {
  schedule: (formData: FormData) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return fetch(`${API_URL}/api/scheduler/schedule`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    }).then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error);
      }
      return res.json();
    });
  },

  cancel: (id: string) =>
    apiFetch(`/api/scheduler/${id}`, { method: 'DELETE' }),

  getStats: () =>
    apiFetch<{ waiting: number; active: number; completed: number; failed: number; delayed: number }>(
      '/api/scheduler/stats'
    ),
};

// Slack
export const slackApi = {
  getStatus: () =>
    apiFetch<{ connected: boolean; connections: SlackConnection[] }>('/auth/slack/status'),

  connect: () => {
    window.location.href = `${API_URL}/auth/slack/connect`;
  },

  disconnect: () =>
    apiFetch('/auth/slack/disconnect', { method: 'DELETE' }),

  getChannels: () =>
    apiFetch<{ channels: Array<{ id: string; name: string }> }>('/auth/slack/channels'),

  setChannel: (channelId: string, channelName: string) =>
    apiFetch('/auth/slack/channel', {
      method: 'PUT',
      body: JSON.stringify({ channelId, channelName }),
    }),
};

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

export interface ScheduledEmail {
  id: string;
  user_id: string;
  from_email: string;
  to_emails: string[];
  subject: string;
  body: string;
  body_html?: string;
  scheduled_at: string;
  delay_between_emails_ms: number;
  hourly_limit: number;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled' | 'rescheduled';
  bull_job_id?: string;
  sent_at?: string;
  error_message?: string;
  message_id?: string;
  preview_url?: string;
  created_at: string;
}

export interface SentEmail {
  id: string;
  scheduled_email_id?: string;
  user_id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  body_html?: string;
  message_id?: string;
  preview_url?: string;
  sent_at: string;
  status: string;
}

export interface SlackConnection {
  id: string;
  team_id: string;
  team_name: string;
  channel_id?: string;
  channel_name?: string;
}
