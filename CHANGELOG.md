# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Permission level visualization** — per-instance badge showing overall permission exposure (Restrictive/Moderate/Permissive/Unrestricted), computed from all three Claude Code settings layers (global, project, project-local); click to see full rule breakdown by source and category
- **Permission detail panel** — modal showing every permission rule with color-coded category dots, grouped by settings source, with score breakdown
- **Cancel & Stop actions** — Ctrl+C (cancel current operation) and Stop (exit session) buttons on each scorecard
- **Dashboard authentication** — server binds to 127.0.0.1 by default, generates a bearer token at `~/.claude/claupilot.secret`, requires it on all API and WebSocket requests
- **Full-text conversation search** — Ctrl+K / Cmd+K opens a search bar that queries indexed JSONL transcripts across all sessions with highlighted snippets and keyboard navigation
- **Notification center** — slide-in panel with full notification history, filter by type (input needed, auto-approved, errors), unread count badge
- **Browser push notifications** — desktop alerts via Web Notifications API when the dashboard window is unfocused
- **Audio alerts** — sound notifications with type-dependent tones and mute toggle
- **Webhook delivery** — configurable webhooks for Slack (Block Kit), Discord (embeds), and generic JSON endpoints
- **Enhanced scorecards** — context window progress bar (color-coded green/yellow/red), PR badge with review state, worktree indicator, model display name
- **Status line receiver** — optional `POST /api/status-line` endpoint for capturing Claude Code status line data
- **Permission API endpoint** — `GET /api/instances/:sessionId/permissions` returns full permission profile

### Fixed
- PTY input relay deny not working from dashboard — permission prompts are TUI selectors requiring arrow-key navigation with proper delays (150ms per keystroke for React event loop), not raw `y`/`n` text input; deny now sends exactly `options.length - 1` arrow-downs to reach the last "No" option
- PTY input relay sending `\n` instead of `\r` — raw text responses now register correctly in the terminal

### Changed
- Server now binds to `127.0.0.1` instead of all interfaces
- Auth token printed to stdout on startup
- WebSocket connections require `?token=` query parameter

### Dependencies
- Added `minisearch` for full-text search indexing

## [0.0.1] - 2026-07-04

### Added
- Real-time scorecard dashboard for all active Claude Code CLI instances
- Instance monitoring via `~/.claude/sessions/*.json`, `jobs/*/state.json`, and `daemon/roster.json`
- Input relay for background workers via rendezvous Unix sockets with authenticated messages
- Input relay for interactive terminals via `pidfd_getfd` PTY master injection
- Dynamic prompt mirroring — modal shows exact AskUserQuestion options, tool permissions, and free-text questions from JSONL transcripts
- Smart auto-yes with safety classification (SAFE, MODERATE, RISKY, DANGEROUS)
- Per-scorecard auto-yes toggle
- Drag-and-drop scorecard grouping with collapsible sections
- Toast notifications for instance state changes
- "Always allow" permission writing to project `.claude/settings.local.json`
- CLI entrypoint (`npx claupilot`) with auto browser open
- GitHub Actions CI (Node 20, 22) and tag-based npm publish with changelog
- Dependabot for minor/patch dependency updates

[Unreleased]: https://github.com/sampras343/claupilot/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/sampras343/claupilot/releases/tag/v0.0.1
