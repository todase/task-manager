# Claude API Access — Design Spec

**Date:** 2026-04-21  
**Status:** Approved

## Problem

Claude Code can only interact with the task manager through the UI or by reading/writing source files. There's no way for Claude to create tasks and projects programmatically — from this repo or from any other.

## Goal

Allow Claude to perform full CRUD on tasks, projects, and tags via the production Vercel API, and package that capability as a shareable Claude Code plugin.

## Architecture

Two independent deliverables:

1. **API key middleware** — added to the existing Next.js app, deployed to Vercel
2. **`task-manager-skill` repo** — a standalone Claude Code plugin published on GitHub

---

## Part 1: API Key Middleware

### How it works

`src/middleware.ts` intercepts requests to protected API routes. If the request includes an `X-API-Key` header:

- Value matches `CLAUDE_API_KEY` env var → request is forwarded as a synthetic session for the owner's userId
- Value doesn't match → 401 Unauthorized

If the header is absent, the middleware is a no-op — NextAuth handles auth as usual. The existing UI and cookie-based sessions are completely unaffected.

### Protected routes (middleware applies)

```
/api/tasks
/api/tasks/:id
/api/tasks/:id/subtasks
/api/tasks/:id/subtasks/:subtaskId
/api/tasks/reorder
/api/projects
/api/projects/:id
/api/tags
/api/tags/:id
```

### Excluded routes (no middleware)

```
/api/auth/*
/api/register
/api/verify-email
/api/resend-verification
/api/forgot-password
/api/reset-password
```

### Implementation detail

The middleware **always strips** the `x-api-user-id` header from incoming requests first, preventing external spoofing. Only after a successful API key validation does it inject `x-api-user-id` with the owner's userId.

`getUserId(req)` in `src/lib/api-auth.ts` checks the injected header first (fast path — no `auth()` call needed), then falls back to the NextAuth session. This avoids touching `auth.ts` or NextAuth internals.

API key comparison uses a timing-safe XOR loop to prevent timing oracle attacks.

### Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `CLAUDE_API_KEY` | Vercel env (production) | Secret key Claude presents in `X-API-Key` header |

The key should be a random 32+ character string. Only one key is supported (single-owner app).

---

## Part 2: `task-manager-skill` Plugin Repo

### Repo structure

```
task-manager-skill/
├── .claude-plugin/
│   └── plugin.json
└── skills/
    └── task-manager.md
```

### `plugin.json`

```json
{
  "name": "task-manager",
  "description": "Create, read, update, and delete tasks and projects in the task manager app",
  "version": "1.0.0",
  "author": { "name": "sk01d" }
}
```

### `task-manager.md` — skill content

The skill file has three sections:

**Setup** — tells Claude to read `TASK_MANAGER_API_KEY` from env and use the production URL. If the env var is missing, Claude should tell the user before attempting any request.

**API Reference** — complete curl examples for every supported operation:

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List tasks | GET | `/api/tasks` |
| Create task | POST | `/api/tasks` |
| Update task | PATCH | `/api/tasks/:id` |
| Delete task | DELETE | `/api/tasks/:id` |
| Bulk delete completed | DELETE | `/api/tasks?done=true` |
| List projects | GET | `/api/projects` |
| Create project | POST | `/api/projects` |
| Update project | PATCH | `/api/projects/:id` |
| Delete project | DELETE | `/api/projects/:id` |
| List tags | GET | `/api/tags` |
| Create tag | POST | `/api/tags` |
| Update tag | PATCH | `/api/tags/:id` |
| Delete tag | DELETE | `/api/tags/:id` |

Each entry includes request body shape and notable fields (e.g., `recurrence`, `dueDate`, `projectId`, `icon`).

**Behavior rules** — constraints Claude follows when using the skill:
- Always confirm with the user before DELETE operations
- Show a summary of the created/updated resource after each write
- On 401: remind the user to check `TASK_MANAGER_API_KEY`
- On 403: the resource belongs to a different user
- Never expose the raw API key in output

### Installation

```bash
# Clone and load locally
git clone https://github.com/sk01d/task-manager-skill
claude --plugin-dir ./task-manager-skill

# Or add to settings.json for permanent use
# "pluginDirs": ["/absolute/path/to/task-manager-skill"]
```

Each user sets their own key:
```bash
export TASK_MANAGER_API_KEY=your-secret-key
```

---

## Data Flow

```
User → Claude → /task-manager skill → Bash (curl)
       curl -X POST https://app.vercel.app/api/tasks \
            -H "X-API-Key: $TASK_MANAGER_API_KEY" \
            -H "Content-Type: application/json" \
            --data-binary @/tmp/payload.json
       → Next.js middleware (strips x-api-user-id, validates key, injects userId)
       → API route handler (getUserId reads header, queries Prisma)
       → PostgreSQL (Neon)
```

---

## Error Handling

| HTTP status | Meaning | Claude's response |
|-------------|---------|-------------------|
| 401 | Invalid or missing API key | Remind user to set `TASK_MANAGER_API_KEY` |
| 403 | Resource owned by different user | Report permission error |
| 404 | Resource not found | Report clearly, suggest listing first |
| 400 | Bad request (missing title, invalid recurrence, etc.) | Show the error message from the API |

---

## Out of Scope

- Multi-user API keys (single owner app)
- Rate limiting (not needed at this scale)
- Subtask CRUD via skill (can be added later)
- Marketplace distribution (can be added later)
