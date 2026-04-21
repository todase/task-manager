# task-manager-skill

Claude Code plugin for interacting with the task manager app via its production API.

## Installation

```bash
git clone https://github.com/sk01d/task-manager-skill
claude --plugin-dir ./task-manager-skill
```

Or add permanently to your `~/.claude/settings.json`:

```json
{
  "pluginDirs": ["/absolute/path/to/task-manager-skill"]
}
```

## Setup

Set two environment variables:

```bash
export TASK_MANAGER_API_KEY=your-api-key-here
export TASK_MANAGER_BASE_URL=https://your-app.vercel.app
```

Get your API key from the app owner.

## Usage

Invoke the skill in any Claude Code session:

```
/task-manager
```

Then ask Claude to create, list, update, or delete tasks and projects.
