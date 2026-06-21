# SecOps Portal

A single-file operations portal for a security (Blue Team) operations function — tracking milestone-driven **security projects** and recurring **BAU** (Business As Usual) tasks in one place, with dashboards, inline editing, an audit trail, and one-click board reporting.

Built end to end on Cloudflare's edge: **Workers + D1 (SQLite)**, vanilla JS, no framework, no build step. The entire app — UI, styles, client logic, REST API, and a scheduled job — lives in one `worker.js`.

> **Live demo:** this public version ships with `PREVIEW_MODE = true`, so it runs entirely in the browser on seeded sample data — no database or login required. Deploy `worker.js` to any Cloudflare Worker (or open it locally) and it just works. Tool names and records are illustrative.

<img width="1653" height="953" alt="image" src="https://github.com/user-attachments/assets/5a81de52-7ce3-4ed9-9df8-7d3ea2a24620" />

<img width="1677" height="955" alt="image" src="https://github.com/user-attachments/assets/c194a6bc-0f52-49b5-9a56-6ba04e1cd673" />

<img width="1677" height="954" alt="image" src="https://github.com/user-attachments/assets/52621257-9c4f-419d-b570-9af1cc149e47" />


## Why I built it

Security teams juggle two very different kinds of work: time-boxed projects (a PAM rollout, a firewall audit) and never-ending recurring operations (daily alert triage, monthly patch reviews). Most trackers handle one or the other. This portal treats both as first-class, surfaces what's overdue or at risk automatically, and turns the whole picture into a board-ready report in one click — so the team spends time doing the work, not reformatting status updates.

## Highlights

- **Three views** — Dashboard, Projects, BAU — with URL-routed tabs (`?tab=`) that survive refresh and bookmarks.
- **Dashboard analytics** — animated KPI cards, status-distribution bars, a projects-per-owner donut, a 9-week **workload heatmap** (owner × week), and a unified **upcoming-deadlines** list with a 7/14/30-day window.
- **Inline editing** — status, owner, phase, progress, frequency, priority, and dates are all editable straight from the table via popover pickers; no modal round-trip.
- **Audit log** — every field change is recorded with who and when, viewable per record (old → new diffs).
- **Soft delete + recovery** — deletes go to a 30-day archive; a daily cron job purges expired items and captures a metrics snapshot.
- **Exports** — CSV (injection-safe), Excel (SheetJS), PDF (jsPDF), and a two-slide **board report** in PowerPoint (PptxGenJS) with KPIs, tables, donut charts, a workload chart, a risk meter, and week-over-week trend arrows.
- **Smart suggestions** — context hints flag stale "On Track" projects, passed target dates, and progress that's run ahead of phase.
- **Light/dark theme**, reduced-motion support, and a mobile-responsive layout.

## Architecture

```
worker.js  (single file)
├── HTML/CSS/JS UI         served at  GET /         (template literal)
├── REST API               /api/projects · /api/bau · /api/subtasks · /api/audit · /api/archive · /api/metrics
└── scheduled() handler    daily cron — metrics snapshot + 30-day archive purge
```

- **Runtime:** Cloudflare Workers
- **Data:** Cloudflare D1 (SQLite) — tables for `projects`, `bau_tasks`, `sub_tasks`, `audit_log`, `metric_snapshots`
- **Frontend:** vanilla JS + embedded HTML/CSS, zero dependencies at runtime; export libraries are lazy-loaded from CDN only when used
- **Auth (production):** designed to sit behind Cloudflare Access (Zero Trust); the API reads the authenticated user from request headers for audit attribution
- **Demo mode:** a single `PREVIEW_MODE` flag swaps the D1 backend for `localStorage` with seeded data

## Run it

**As a live demo (Cloudflare):** create a Worker, paste in `worker.js`, deploy. With `PREVIEW_MODE = true` it needs no D1 binding and no auth.

**With the real backend:** set `PREVIEW_MODE = false`, bind a D1 database as `DB`, create the schema, and add a `0 2 * * *` cron trigger for the snapshot/purge job.

## Engineering notes

- One file, ~8k lines, no bundler — the UI is a template literal, which means careful escaping for inline handlers and a two-layer syntax check (Worker JS + the embedded browser JS) before any deploy.
- Overdue state is computed from dates at render time rather than stored, so the dashboard, banners, filters, and reports never drift out of sync with a stale status field.
- Entry animations fire once on first paint and are suppressed on refresh/inline-edits, so the dashboard feels alive without re-animating on every keystroke.

## License

MIT
