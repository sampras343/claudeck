<p align="center">
  <img src="assets/ClauPilot.png" alt="ClauPilot" width="400">
</p>

<p align="center">
  <a href="https://github.com/sampras343/claupilot/actions/workflows/ci.yml"><img src="https://github.com/sampras343/claupilot/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/claupilot"><img src="https://img.shields.io/npm/v/claupilot" alt="npm version"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/claupilot" alt="Node.js"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
</p>

# ClauPilot

Interactive web dashboard for monitoring and managing multiple [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI instances from a single screen.

## The Problem

When running multiple Claude Code terminals simultaneously, you lose track of which agent is doing what, which one needs your input, and what each one is allowed to do. Permissions accumulate over time through "Always allow" clicks, and there's no centralized way to see how exposed your setup is.

## The Solution

ClauPilot gives you a real-time dashboard with scorecards for every active Claude instance. See status at a glance, respond to prompts without switching terminals, audit permission levels, and auto-approve safe operations.

### Features

- **Real-time scorecards** — status, working directory, model, version, uptime, token usage, context window, linked PRs, worktree indicator
- **Permission level visualization** — per-instance badge (Restrictive/Moderate/Permissive/Unrestricted) computed from global + project + local settings, with clickable detail panel showing every rule by source and category
- **Input relay** — respond to permission prompts and questions directly from the dashboard
- **Dynamic prompt mirroring** — modal shows the exact same options Claude presents in the terminal (AskUserQuestion choices, tool permissions, free-text questions)
- **Smart auto-yes** — per-instance toggle that auto-approves safe operations (read-only commands, type checks) and defers risky ones (deletions, force pushes) to you
- **Cancel & Stop** — send Ctrl+C or exit a Claude session directly from the dashboard
- **Grouping** — organize scorecards into named groups with drag-and-drop, collapsible sections
- **Notification center** — notification history with unread count badge, browser push notifications, audio alerts, mute toggle
- **Webhook delivery** — configurable webhooks for Slack, Discord, and generic JSON endpoints
- **Full-text search** — Ctrl+K to search across conversation transcripts

## Quick Start

```bash
npx claupilot
```

Or install globally:

```bash
npm install -g claupilot
claupilot
```

The dashboard opens at **http://localhost:3200**.

## Requirements

- **Node.js 20+**
- **Linux** (uses `pidfd_getfd` syscall for terminal input relay; ptrace_scope must be 0)
- **Claude Code CLI** installed and running in one or more terminals

## How It Works

ClauPilot reads Claude Code's internal state files to build a live view of all running instances:

| Source | Data |
|--------|------|
| `~/.claude/sessions/*.json` | PID, status (idle/busy/waiting), name, working directory |
| `~/.claude/jobs/*/state.json` | Background job state, pending prompts, token count, linked PRs |
| `~/.claude/daemon/roster.json` | Worker socket paths and auth tokens for input relay |
| `~/.claude/projects/*/*.jsonl` | Conversation transcripts for extracting actual prompt options |

### Input Relay

- **Background workers** — replies via the daemon's rendezvous Unix socket with authenticated messages
- **Interactive terminals** — injects keystrokes into the PTY master using `pidfd_getfd` to duplicate the terminal emulator's file descriptor

### Safety Assessment

The auto-yes feature classifies each permission prompt before acting:

| Level | Action | Examples |
|-------|--------|---------|
| **Safe** | Auto-approve | `ls`, `grep`, `git status`, `tsc --noEmit`, `Read` |
| **Moderate** | Auto-approve with logging | `Edit`, `npm install`, `git commit`, `mkdir` |
| **Risky** | Always ask user | `rm`, `git push`, `curl`, `docker`, `ssh` |
| **Dangerous** | Always ask user + warning | `rm -rf`, `git push --force`, `sudo`, credential access |

### Permission Analysis

Each instance's scorecard shows its overall permission level, computed by analyzing all three Claude Code settings layers:

| Source | Path |
|--------|------|
| Global | `~/.claude/settings.json` |
| Project | `<project>/.claude/settings.json` |
| Project Local | `<project>/.claude/settings.local.json` |

Rules are scored by category (unrestricted, dangerous, risky, moderate, safe, web, file access) and mapped to a level:

| Level | Meaning |
|-------|---------|
| **Restrictive** | Few permissions, mostly safe/exact commands |
| **Moderate** | Reasonable development permissions |
| **Permissive** | Broad wildcards, many tools allowed |
| **Unrestricted** | Effectively open — bare tool names or `*` globs |

Click the badge on any scorecard to see the full rule breakdown grouped by source.

## Development

```bash
git clone https://github.com/sampras343/claupilot.git
cd claupilot
npm install
cd client && npm install && cd ..
npm run dev
```

This starts the backend (port 3200) and Vite dev server (port 5173 with proxy) concurrently.

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | `3200` | Server port |

## Architecture

```
Browser (:3200) <-- WebSocket --> Node.js Server
                                       |
                                  File Watchers (chokidar)
                                  ~/.claude/sessions/
                                  ~/.claude/jobs/
                                  ~/.claude/daemon/roster.json
                                       |
                                  Input Relay
                                  |-- Rendezvous socket (background workers)
                                  |-- PTY master injection (interactive terminals)
```

**Tech stack:** Node.js, Express, WebSocket, chokidar (backend) / React, Vite, Tailwind CSS v4 (frontend)

## License

MIT
