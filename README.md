# ONG Mail — Email Job Scheduler

A production-grade **email scheduling service** with a full-stack dashboard. Built as part of the ReachInbox Software Development Intern Assignment.

---

## 🎥 Demo

> [Add your 5-minute demo video link here]

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS, Tiptap Editor |
| **Backend** | Express.js, TypeScript |
| **Queue** | BullMQ (Redis) — NO cron jobs |
| **Database** | PostgreSQL 15 |
| **Search** | Elasticsearch 8.11 |
| **Email** | Nodemailer + Ethereal Email (SMTP test) |
| **Auth** | Google OAuth 2.0 + Local auth (Passport.js + JWT) |
| **Notifications** | Slack OAuth + Bot notifications |
| **Infrastructure** | Docker Compose |

---

## 📁 Project Structure

```
outbox/
├── backend/                  # Express.js API
│   ├── src/
│   │   ├── config/           # Passport, Redis, Mailer
│   │   ├── db/               # PostgreSQL + Elasticsearch
│   │   ├── queues/           # BullMQ email queue
│   │   ├── routes/           # Auth, Emails, Scheduler, Slack
│   │   ├── services/         # Rate limiter, Slack notifications
│   │   ├── workers/          # Email worker (BullMQ)
│   │   └── index.ts          # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # Next.js dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/        # Login/Register page
│   │   │   ├── auth/         # OAuth callback
│   │   │   └── dashboard/    # Main app pages
│   │   ├── components/       # Sidebar, RichTextEditor
│   │   ├── contexts/         # AuthContext
│   │   └── lib/              # API client
│   └── package.json
└── docker-compose.yml        # PostgreSQL + Redis + Elasticsearch
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- Google OAuth credentials (for login)
- Slack app (for rate-limit notifications)

---

### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`
- **Elasticsearch** on port `9200`

---

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your Google OAuth & Slack credentials
npm install
npm run dev
```

Backend runs on **http://localhost:3001**

**Bull Board Dashboard:** http://localhost:3001/admin/queues

---

### 3. Start Email Worker (in a separate terminal)

```bash
cd backend
npm run worker
```

The worker processes BullMQ jobs with:
- Configurable concurrency (`WORKER_CONCURRENCY`)
- Minimum delay between emails (`MIN_DELAY_BETWEEN_EMAILS_MS`)
- Hourly rate limiting per sender
- Auto-reschedule when rate limit is hit
- Slack notification when rate limit is triggered

---

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:3000**

---

## 🔑 Environment Variables

### Backend (`.env`)

```env
PORT=3001
DATABASE_URL=postgresql://outbox_user:outbox_pass@localhost:5432/outbox_db
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Slack OAuth
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=http://localhost:3001/auth/slack/callback

# Email Rate Limiting
MAX_EMAILS_PER_HOUR=100
MIN_DELAY_BETWEEN_EMAILS_MS=1000
WORKER_CONCURRENCY=5
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 📋 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project → Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI: `http://localhost:3001/auth/google/callback`
5. Copy Client ID and Secret to backend `.env`

---

## 💬 Slack Integration Setup

1. Go to [Slack API](https://api.slack.com/apps)
2. Create a new Slack App
3. Enable OAuth & Permissions with scopes: `channels:read`, `chat:write`, `groups:read`
4. Set redirect URL: `http://localhost:3001/auth/slack/callback`
5. Copy Client ID and Secret to backend `.env`

After connecting Slack via the Settings page, rate-limit notifications will be sent to your chosen channel automatically.

---

## 🌟 Key Features

### Backend
- ✅ **BullMQ delayed jobs** — emails survive server restarts (no cron)
- ✅ **Rate limiting** — Redis-backed hourly limit per sender email
- ✅ **Auto-reschedule** — emails rescheduled to next hour window when limit is hit
- ✅ **Slack notifications** — real-time alert when rate limit is reached
- ✅ **Elasticsearch** — full-text email search
- ✅ **Ethereal SMTP** — preview sent emails without real sending
- ✅ **Bull Board** — live queue monitoring dashboard

### Frontend (matches Figma design)
- ✅ **Google OAuth login** — real OAuth flow
- ✅ **Compose page** — rich text editor (Tiptap) with formatting toolbar
- ✅ **CSV/TXT upload** — upload recipient list
- ✅ **Send Later** — date/time picker with quick presets
- ✅ **Scheduled emails** table
- ✅ **Sent emails** table  
- ✅ **Email detail view** — with Ethereal preview link
- ✅ **Settings** — Slack connection management + queue stats

---

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Email/password login |
| POST | `/auth/register` | Create account |
| GET | `/auth/google` | Google OAuth redirect |
| GET | `/auth/me` | Get current user |
| POST | `/api/scheduler/schedule` | Schedule email batch (CSV or JSON) |
| DELETE | `/api/scheduler/:id` | Cancel scheduled email |
| GET | `/api/scheduler/stats` | BullMQ queue stats |
| GET | `/api/emails/scheduled` | List scheduled emails |
| GET | `/api/emails/sent` | List sent emails |
| GET | `/api/emails/counts/summary` | Count badges for sidebar |
| GET | `/auth/slack/connect` | Start Slack OAuth |
| GET | `/auth/slack/status` | Check Slack connection |
| PUT | `/auth/slack/channel` | Set notification channel |

---

## 📧 Email Scheduling Flow

1. User fills compose form (To, Subject, Body, Delay, Hourly Limit, Schedule Time)
2. Backend creates `scheduled_emails` records in PostgreSQL
3. BullMQ delayed job is created with the delay until scheduled time
4. When job fires, worker checks Redis rate limit
5. If within limit → email sent via Ethereal SMTP → indexed in Elasticsearch
6. If rate limit exceeded → Slack notification sent → job rescheduled to next hour window
7. Email status updated in PostgreSQL + Elasticsearch

---

## 🏗️ Architecture Diagram

```
Frontend (Next.js :3000)
        │
        ▼
Backend API (Express :3001)
        │
   ┌────┴────┐
   │         │
PostgreSQL  Redis (BullMQ)
             │
        Email Worker
             │
    ┌────────┴────────┐
    │                 │
Ethereal SMTP    Elasticsearch
    │                 │
Preview URL      Search Index
```
