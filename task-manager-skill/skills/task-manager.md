# Task Manager

Interact with the task manager app via its production API.

## Setup

Before making any request, verify these env vars are set:

- `TASK_MANAGER_API_KEY` — your API key (get from the app owner)
- `TASK_MANAGER_BASE_URL` — production URL, e.g. `https://your-app.vercel.app`

If either is missing, tell the user before attempting any request.

```bash
# Quick check
echo $TASK_MANAGER_API_KEY
echo $TASK_MANAGER_BASE_URL
```

## Sending JSON with non-ASCII text (Cyrillic, emoji, etc.)

**Never use `-d '...'` with non-ASCII characters** — the shell may corrupt them. Always write the payload to a temp file and use `--data-binary @file`:

```bash
# Write payload to temp file, then send
cat > /tmp/tm_payload.json << 'ENDJSON'
{"title": "Купить молоко"}
ENDJSON

curl -X POST "$TASK_MANAGER_BASE_URL/api/tasks" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/tm_payload.json

rm /tmp/tm_payload.json
```

This applies to all POST and PATCH requests with user-provided text content.

## API Reference

All requests use:
```
-H "X-API-Key: $TASK_MANAGER_API_KEY"
-H "Content-Type: application/json"
```

### Tasks

**List tasks**
```bash
curl "$TASK_MANAGER_BASE_URL/api/tasks" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY"
```

Optional query params: `?done=true|false`, `?sort=dueDate|createdAt`, `?q=search`, `?limit=N`

**Create task**
```bash
curl -X POST "$TASK_MANAGER_BASE_URL/api/tasks" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Task title",
    "dueDate": "2026-05-01T00:00:00.000Z",
    "recurrence": "daily|weekly|monthly|null",
    "description": "Optional description",
    "projectId": "optional-project-id"
  }'
```

Required: `title`. All others optional. `dueDate` is ISO 8601.

**Update task**
```bash
curl -X PATCH "$TASK_MANAGER_BASE_URL/api/tasks/{id}" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated title",
    "done": true,
    "dueDate": "2026-05-01T00:00:00.000Z",
    "recurrence": "weekly",
    "description": "Updated description",
    "projectId": "project-id",
    "tagIds": ["tag-id-1", "tag-id-2"]
  }'
```

Send only the fields to update. Recurring tasks: marking `done: true` advances `dueDate` instead of archiving.

**Delete task**
```bash
curl -X DELETE "$TASK_MANAGER_BASE_URL/api/tasks/{id}" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY"
```

**Bulk delete completed tasks**
```bash
curl -X DELETE "$TASK_MANAGER_BASE_URL/api/tasks?done=true" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY"
```

### Projects

**List projects**
```bash
curl "$TASK_MANAGER_BASE_URL/api/projects" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY"
```

**Create project**
```bash
curl -X POST "$TASK_MANAGER_BASE_URL/api/projects" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Project title",
    "icon": "folder"
  }'
```

`icon` defaults to `"folder"` if omitted.

**Get project**
```bash
curl "$TASK_MANAGER_BASE_URL/api/projects/{id}" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY"
```

**Update project**
```bash
curl -X PATCH "$TASK_MANAGER_BASE_URL/api/projects/{id}" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "title": "New title", "icon": "star" }'
```

**Delete project**
```bash
curl -X DELETE "$TASK_MANAGER_BASE_URL/api/projects/{id}" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY"
```

### Tags

**List tags**
```bash
curl "$TASK_MANAGER_BASE_URL/api/tags" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY"
```

**Create tag**
```bash
curl -X POST "$TASK_MANAGER_BASE_URL/api/tags" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "urgent", "color": "#ef4444" }'
```

`color` defaults to `"#6b7280"` if omitted. `name` must not be blank.

**Update tag**
```bash
curl -X PATCH "$TASK_MANAGER_BASE_URL/api/tags/{id}" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "critical", "color": "#dc2626" }'
```

**Delete tag**
```bash
curl -X DELETE "$TASK_MANAGER_BASE_URL/api/tags/{id}" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY"
```

## Behavior Rules

- **Before any DELETE**: confirm with the user ("Delete task 'X'?") unless they explicitly said to skip confirmation.
- **After every write (POST/PATCH/DELETE)**: show a brief summary of the result (e.g., "Created task 'X' with id abc123").
- **401 response**: remind the user to check `TASK_MANAGER_API_KEY`.
- **403 response**: the resource belongs to a different user — report this clearly.
- **404 response**: resource not found — suggest listing first to get valid IDs.
- **400 response**: show the error message from the API body.
- **Never** echo the raw API key in any output.
