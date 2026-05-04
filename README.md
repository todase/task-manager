# Task Manager

Personal task manager built with Next.js, deployed on Vercel. Supports projects, tags, subtasks, recurring tasks, and a Claude Code plugin for programmatic access.

## Features

- Tasks with due dates, recurrence (daily/weekly/monthly), subtasks, descriptions, and tags
- Projects with custom icons (72 options)
- Archive with completion timestamps, sorted newest-first; expandable per-task reflections
- Post-completion reflection (time spent, difficulty, mood, free-text notes, optional next-step task)
- Date filters: Today, This Week, Someday
- Drag-and-drop reordering
- PWA (installable, offline-capable)
- Auth: email/password with email verification, password reset, Google OAuth
- API key access for Claude Code via the `task-manager-skill` plugin

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js (App Router) |
| Database | PostgreSQL (Neon) via Prisma |
| Auth | NextAuth v5 |
| UI | Tailwind CSS, Lucide React, dnd-kit |
| Email | Resend |
| Tests | Vitest + Testing Library (360 tests) |
| Deploy | Vercel |

## Local Development

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, NEXTAUTH_SECRET, etc.
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | yes | NextAuth session signing key |
| `NEXTAUTH_URL` | yes | App base URL |
| `GOOGLE_CLIENT_ID` | for OAuth | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | for OAuth | Google OAuth client secret |
| `RESEND_API_KEY` | for email | Transactional email (verification, password reset) |
| `CLAUDE_API_KEY` | for plugin | Secret key for Claude Code API access |
| `CLAUDE_API_USER_ID` | for plugin | Owner's user ID for API key requests |

## API

All endpoints under `/api/tasks`, `/api/projects`, `/api/tags` require auth — either a NextAuth session cookie or an `X-API-Key` header.

See [`task-manager-skill/skills/task-manager.md`](task-manager-skill/skills/task-manager.md) for the full API reference with curl examples.

## Claude Code Plugin

The `task-manager-skill/` directory is a standalone Claude Code plugin. It lets Claude create, list, update, and delete tasks programmatically, as well as read post-completion reflections from the archive.

```bash
# Load the plugin
claude --plugin-dir ./task-manager-skill

# Set credentials
export TASK_MANAGER_API_KEY=your-api-key
export TASK_MANAGER_BASE_URL=https://your-app.vercel.app
```

Then in any Claude Code session: `/task-manager`

## Tests

```bash
npm test              # run all 360 tests
npm test -- --watch   # watch mode
```
