/**
 * SecOps Project & BAU Portal — Cloudflare Worker
 * Serves the portal UI and provides REST APIs for projects, BAU tasks, and audit log.
 *
 * Bindings expected:
 *   - DB  →  D1 database (with projects, bau_tasks, and audit_log tables)
 *
 * Endpoints:
 *   GET    /                          → portal HTML
 *   GET    /health                    → health check
 *   GET    /api/projects              → list all projects
 *   POST   /api/projects              → create
 *   PUT    /api/projects/:id          → update
 *   DELETE /api/projects/:id          → delete
 *   GET    /api/bau                   → list all BAU tasks
 *   POST   /api/bau                   → create
 *   PUT    /api/bau/:id               → update
 *   DELETE /api/bau/:id               → delete
 *   GET    /api/audit/:type/:id       → audit log for a record (type=project|bau)
 */

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>SecOps // Project & BAU Portal</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #060B17; --bg-elevated: #0B1426; --bg-card: #0F1B30; --bg-input: #0A1424; --bg-hover: #142340;
    --border: #1B2942; --border-bright: #2A3B5C; --border-accent: rgba(34, 211, 238, 0.25);
    --grid: rgba(34, 211, 238, 0.04);
    --text: #E2E8F0; --text-secondary: #94A3B8; --text-muted: #64748B;
    --cyan: #06B6D4; --cyan-bright: #22D3EE; --cyan-glow: rgba(34, 211, 238, 0.5); --blue: #3B82F6;
    --st-track: #10B981; --st-track-bg: rgba(16, 185, 129, 0.12); --st-track-border: rgba(16, 185, 129, 0.35);
    --st-risk: #F59E0B; --st-risk-bg: rgba(245, 158, 11, 0.12); --st-risk-border: rgba(245, 158, 11, 0.35);
    --st-delayed: #EF4444; --st-delayed-bg: rgba(239, 68, 68, 0.12); --st-delayed-border: rgba(239, 68, 68, 0.4);
    --st-hold: #94A3B8; --st-hold-bg: rgba(148, 163, 184, 0.12); --st-hold-border: rgba(148, 163, 184, 0.3);
    --st-done: #3B82F6; --st-done-bg: rgba(59, 130, 246, 0.12); --st-done-border: rgba(59, 130, 246, 0.35);
    --prio-crit: #EF4444; --prio-high: #F59E0B; --prio-med: #22D3EE; --prio-low: #94A3B8;
    --radius: 8px;
    --radius-sm: 4px;
  }
  /* LIGHT THEME — warm cream tint, same cyberpunk identity */
  body.theme-light {
    --bg: #FAF7EE;                 /* warm cream */
    --bg-elevated: #FFFCF2;        /* slightly lighter cream */
    --bg-card: #FFFDF6;            /* card surface */
    --bg-input: #F5F1E4;           /* input surface */
    --bg-hover: #F0EBDC;           /* hover state */
    --border: #DDD5C0;             /* warm border */
    --border-bright: #C4B998;      /* emphasis border */
    --border-accent: rgba(8, 145, 178, 0.30);
    --grid: rgba(8, 145, 178, 0.05);
    --text: #1E293B;
    --text-secondary: #475569;
    --text-muted: #94A3B8;
    --cyan: #0891B2;
    --cyan-bright: #0E7490;        /* darker cyan for white-bg contrast */
    --cyan-glow: rgba(8, 145, 178, 0.20);
    --blue: #1D4ED8;
    --st-track: #047857; --st-track-bg: #D1FAE5; --st-track-border: #6EE7B7;
    --st-risk: #B45309; --st-risk-bg: #FEF3C7; --st-risk-border: #FCD34D;
    --st-delayed: #B91C1C; --st-delayed-bg: #FEE2E2; --st-delayed-border: #FCA5A5;
    --st-hold: #475569; --st-hold-bg: #E2E8F0; --st-hold-border: #CBD5E1;
    --st-done: #1D4ED8; --st-done-bg: #DBEAFE; --st-done-border: #93C5FD;
    --prio-crit: #B91C1C; --prio-high: #B45309; --prio-med: #0E7490; --prio-low: #475569;
  }
  /* Tone down glow effects on light mode (they smudge on cream) */
  body.theme-light .brand-mark { filter: none; }
  body.theme-light .kpi-value.accent { text-shadow: none; }
  body.theme-light .progress-fill { box-shadow: none; }
  body.theme-light .pill::before { box-shadow: none; }
  body.theme-light .live-dot { box-shadow: none; }
  body.theme-light .refresh-btn:hover { box-shadow: 0 1px 3px rgba(15,23,42,0.08); }
  body.theme-light .btn:hover { box-shadow: 0 2px 6px rgba(8, 145, 178, 0.25); }
  body.theme-light .icon-btn:hover { box-shadow: none; }
  body.theme-light .kpi:hover::before { box-shadow: none; }
  body.theme-light .kpi { box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); }
  body.theme-light .drawer { box-shadow: -20px 0 60px rgba(15, 23, 42, 0.15); }
  body.theme-light .toast { box-shadow: 0 4px 16px rgba(15, 23, 42, 0.15); }
  body.theme-light .editable-status:hover, body.theme-light .editable-freq:hover, body.theme-light .editable-priority:hover { box-shadow: 0 2px 8px rgba(8, 145, 178, 0.18); }
  body.theme-light .status-picker { box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15); }
  body.theme-light header { background: rgba(250, 247, 238, 0.92); border-bottom-color: var(--border); }
  /* Theme toggle icon swap — shows the theme you'll switch TO (not current) */
  .theme-toggle .theme-icon-dark { display: none; }  .theme-toggle .theme-icon-light { display: inline-block; }
  body.theme-light .theme-toggle .theme-icon-light { display: none; }
  body.theme-light .theme-toggle .theme-icon-dark { display: inline-block; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: var(--bg); color: var(--text); font-family: 'IBM Plex Sans', sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; transition: background-color 0.25s ease, color 0.25s ease; }
  body {
    background-image:
      linear-gradient(var(--grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid) 1px, transparent 1px),
      radial-gradient(ellipse at top, rgba(34, 211, 238, 0.08), transparent 60%);
    background-size: 48px 48px, 48px 48px, 100% 100%;
  }
  .mono { font-family: 'JetBrains Mono', monospace; }
  .container { max-width: 1440px; margin: 0 auto; padding: 0 32px; }
  @media (max-width: 768px) { .container { padding: 0 16px; } }

  /* HEADER */
  header { border-bottom: 1px solid var(--border); background: rgba(6, 11, 23, 0.85); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 50; }
  .header-inner { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; }
  .brand { display: flex; align-items: center; gap: 16px; }
  .brand-mark { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 0 14px var(--cyan-glow)); flex-shrink: 0; }
  .brand-mark img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .brand-name { font-family: 'Chakra Petch', sans-serif; font-size: 18px; letter-spacing: 0.15em; text-transform: uppercase; font-weight: 600; }
  .brand-name span { color: var(--cyan-bright); }
  .header-meta { display: flex; align-items: center; gap: 16px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted); letter-spacing: 0.05em; }
  .live-indicator { display: inline-flex; align-items: center; gap: 8px; padding: 5px 10px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: var(--st-track); font-size: 10px; letter-spacing: 0.12em; }

  /* REFRESH BUTTON */
  .refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--bg-input);
    border: 1px solid var(--border-bright);
    color: var(--text-secondary);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 0.18s;
    border-radius: var(--radius-sm);
  }
  .refresh-btn:hover { border-color: var(--cyan); color: var(--cyan-bright); background: rgba(34, 211, 238, 0.08); box-shadow: 0 0 12px rgba(34, 211, 238, 0.15); }
  .refresh-btn:active { transform: scale(0.97); }
  .refresh-btn:disabled { opacity: 0.6; cursor: wait; }
  .refresh-btn svg { transition: transform 0.4s ease; flex-shrink: 0; }
  .refresh-btn:hover svg { transform: rotate(-30deg); }
  .refresh-btn.spinning svg { animation: refresh-spin 0.8s linear infinite; transform: none !important; }
  @keyframes refresh-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .refresh-label { font-weight: 500; }
  .refresh-time { color: var(--text-muted); font-size: 10px; padding-left: 6px; border-left: 1px solid var(--border); margin-left: 2px; }
  .refresh-time:empty { display: none; }
  .refresh-btn.spinning .refresh-label::after { content: "ing..."; }
  .refresh-btn.spinning .refresh-label { font-size: 0; }
  .refresh-btn.spinning .refresh-label::after { font-size: 11px; }
  @media (max-width: 768px) {
    .refresh-label, .refresh-time { display: none; }
    .refresh-btn { padding: 7px; }
    .header-inner { flex-wrap: wrap; gap: 10px; padding: 12px 0; }
    .brand { flex-basis: 100%; }
    .header-meta {
      flex-wrap: nowrap; gap: 8px; justify-content: flex-end; align-items: center;
      width: 100%;
    }
    #header-date { font-size: 9px; line-height: 1.2; max-width: 70px; text-align: right; white-space: normal; }
    .brand-name { font-size: 16px; }
    .brand-mark img { width: 48px; height: 48px; }
    /* Hide the inline date in the controls row on mobile; show the stacked one above the logo instead */
    .header-meta > #header-date { display: none; }
    .secondary-brand {
      flex-direction: column; align-items: center; justify-content: center;
      height: auto; gap: 3px; padding-left: 8px; margin-left: 4px;
      border-left: 1px solid var(--border);
    }
    .secondary-brand-label { display: none; }
    .secondary-brand .header-date-mobile {
      display: block; font-size: 9px; line-height: 1.2; text-align: center;
      white-space: nowrap; color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace; letter-spacing: 0.04em;
    }
  }

  /* Secondary brand */
  .secondary-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 36px;
  }
  #header-date {
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    color: var(--text-muted); letter-spacing: 0.05em;
  }
  /* Mobile-only duplicate date (sits above secondary brand). Hidden on desktop — zero desktop impact. */
  .header-date-mobile { display: none; }
  .secondary-brand-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--text-muted);
    line-height: 1.2;
    text-align: right;
  }
  .secondary-brand-logo {
    height: 28px;
    width: auto;
    max-width: 120px;
    object-fit: contain;
    /* Subtle background pill ensures logo readability on dark navy regardless of source colors */
    background: rgba(255, 255, 255, 0.95);
    padding: 4px 8px;
    border-radius: 3px;
    box-sizing: content-box;
  }
  @media (max-width: 768px) {
    .secondary-brand-label { display: none; }
    .secondary-brand { padding-left: 12px; gap: 6px; }
    .secondary-brand-logo { height: 22px; }
  }
  .live-dot { width: 7px; height: 7px; background: var(--st-track); border-radius: 50%; box-shadow: 0 0 8px var(--st-track); animation: pulse 1.8s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }

  /* HERO */
  .hero { padding: 56px 0 40px; position: relative; overflow: hidden; }
  /* When hero sits inside a tab, the tab-bar above already provides breathing room */
  .tab-content .hero { padding-top: 20px; }
  .hero::before {
    content: ""; position: absolute; inset: -50% -10% -10% -10%;
    background-image:
      linear-gradient(to right, var(--cyan) 1px, transparent 1px),
      linear-gradient(to bottom, var(--cyan) 1px, transparent 1px);
    background-size: 44px 44px;
    opacity: 0.09;
    -webkit-mask-image: radial-gradient(ellipse 70% 80% at 30% 40%, #000 0%, transparent 75%);
    mask-image: radial-gradient(ellipse 70% 80% at 30% 40%, #000 0%, transparent 75%);
    animation: hero-grid-drift 38s linear infinite;
    pointer-events: none; z-index: 0;
  }
  @keyframes hero-grid-drift { from { background-position: 0 0; } to { background-position: 44px 44px; } }
  @media (prefers-reduced-motion: reduce) { .hero::before { animation: none; } }
  body.theme-light .hero::before { opacity: 0.07; }
  /* Keep hero content above the grid */
  .hero > * { position: relative; z-index: 1; }
  .hero::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--border-bright) 20%, var(--cyan) 50%, var(--border-bright) 80%, transparent); z-index: 1; }
  .eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--cyan-bright); margin-bottom: 20px; }
  .eyebrow::before { content: "◢"; color: var(--cyan); }
  .hero-title { font-family: 'Chakra Petch', sans-serif; font-size: clamp(38px, 5.8vw, 68px); line-height: 1.0; letter-spacing: -0.01em; font-weight: 600; }
  .hero-title em { font-style: normal; color: var(--cyan-bright); font-weight: 500; }
  .hero-title em::after { content: "_"; animation: blink 1.2s step-end infinite; color: var(--cyan); }
  @keyframes blink { 50% { opacity: 0; } }
  .hero-sub { margin-top: 20px; font-size: 15px; color: var(--text-secondary); max-width: 680px; line-height: 1.6; }

  /* KPIs */
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 40px; }
  @media (max-width: 768px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
  .kpi { background: var(--bg-card); border: 1px solid var(--border); padding: 22px 22px 20px; position: relative; transition: all 0.25s; overflow: hidden; border-radius: var(--radius); }
  .kpi::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: var(--border-bright); transition: background 0.25s; }
  .kpi:hover { border-color: var(--border-accent); box-shadow: 0 0 24px rgba(34, 211, 238, 0.08); transform: translateY(-1px); }
  .kpi:hover::before { background: var(--cyan); box-shadow: 0 0 12px var(--cyan-glow); }
  .kpi-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 14px; display: flex; align-items: center; gap: 6px; }
  .kpi-label::before { content: "//"; color: var(--cyan); opacity: 0.6; }
  .kpi-value { font-family: 'Chakra Petch', sans-serif; font-size: 48px; line-height: 1; letter-spacing: -0.02em; font-weight: 600; }
  .kpi-value.accent { color: var(--cyan-bright); text-shadow: 0 0 24px var(--cyan-glow); }
  .kpi-value.warn { color: var(--st-risk); text-shadow: 0 0 18px rgba(245, 158, 11, 0.5); }
  .kpi-value.crit { color: var(--st-delayed); text-shadow: 0 0 18px rgba(239, 68, 68, 0.45); }
  .kpi-value.ok { color: var(--st-track); text-shadow: 0 0 18px rgba(16, 185, 129, 0.4); }
  .kpi-value.done { color: var(--st-done); text-shadow: 0 0 18px rgba(59, 130, 246, 0.4); }
  .kpi-trend { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted); margin-top: 10px; }

  /* PANELS / BREAKDOWN */
  .breakdown { padding: 48px 0 32px; }
  .breakdown-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  @media (max-width: 900px) { .breakdown-grid { grid-template-columns: 1fr; } }
  .panel { background: var(--bg-card); border: 1px solid var(--border); padding: 24px; position: relative; border-radius: var(--radius); }
  .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .panel-title { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-secondary); display: flex; align-items: center; gap: 8px; }
  .panel-title::before { content: "▸"; color: var(--cyan); }
  .panel-meta { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-muted); }

  .bar-row { display: flex; align-items: center; gap: 14px; padding: 11px 0; border-bottom: 1px solid var(--border); }
  .bar-row:last-child { border-bottom: none; padding-bottom: 0; }
  .bar-row:first-child { padding-top: 0; }
  .bar-label { flex: 0 0 130px; font-size: 13px; font-weight: 500; }
  .bar-track { flex: 1; height: 6px; background: var(--bg-input); position: relative; overflow: hidden; border: 1px solid var(--border); }
  .bar-fill { height: 100%; transition: width 1s cubic-bezier(0.2, 0.8, 0.2, 1); position: relative; }
  .bar-fill::after { content: ""; position: absolute; right: 0; top: 0; bottom: 0; width: 8px; background: linear-gradient(90deg, transparent, currentColor); opacity: 0.6; }
  .bar-count { flex: 0 0 32px; text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; }

  /* DONUT CHART */
  .donut-wrap { display: flex; align-items: center; gap: 28px; }
  @media (max-width: 540px) { .donut-wrap { flex-direction: column; align-items: flex-start; gap: 18px; } }
  .donut-svg { flex: 0 0 200px; }
  .donut-svg svg { width: 200px; height: 200px; display: block; }
  .donut-slice { transition: transform 0.2s, filter 0.2s; transform-origin: center; cursor: pointer; }
  .donut-slice:hover { transform: scale(1.04); filter: brightness(1.2); }
  .donut-center { display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
  .donut-total { font-family: 'Chakra Petch', sans-serif; font-size: 38px; font-weight: 600; color: var(--text); line-height: 1; }
  .donut-sub { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-muted); margin-top: 4px; }
  .donut-legend { flex: 1; min-width: 0; display: grid; grid-template-columns: 1fr; gap: 8px; max-height: 200px; overflow-y: auto; padding-right: 4px; }
  .legend-row { display: flex; align-items: center; gap: 10px; padding: 6px 8px; background: var(--bg-input); border: 1px solid var(--border); transition: all 0.15s; }
  .legend-row:hover { border-color: var(--border-bright); background: var(--bg-hover); }
  .legend-swatch { width: 10px; height: 10px; flex-shrink: 0; box-shadow: 0 0 8px currentColor; }
  .legend-name { flex: 1; font-size: 13px; color: var(--text); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .legend-count { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text); font-weight: 600; }
  .legend-pct { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-muted); margin-left: 4px; }

  /* TOOLBAR / SECTIONS */
  .section { padding: 8px 0 60px; }
  .section + .section { padding-top: 40px; border-top: 1px solid var(--border); }
  .toolbar { display: flex; align-items: center; justify-content: space-between; padding: 24px 0; gap: 16px; flex-wrap: wrap; }
  .toolbar h2 { font-family: 'Chakra Petch', sans-serif; font-size: 28px; font-weight: 600; letter-spacing: 0.02em; display: flex; align-items: center; gap: 12px; }
  .toolbar h2::before { content: "[ "; color: var(--cyan); font-weight: 400; }
  .toolbar h2::after { content: " ]"; color: var(--cyan); font-weight: 400; }
  .toolbar-controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

  .input-base { background: var(--bg-input); border: 1px solid var(--border-bright); padding: 9px 13px; font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; color: var(--text); outline: none; transition: all 0.15s; }
  .input-base:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.12); }
  .input-base::placeholder { color: var(--text-muted); }
  .search { min-width: 220px; }
  .select { cursor: pointer; padding-right: 30px; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%2394A3B8' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }

  .btn { padding: 10px 18px; font-family: 'Chakra Petch', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; border: 1px solid var(--cyan); background: rgba(34, 211, 238, 0.12); color: var(--cyan-bright); transition: all 0.18s; display: inline-flex; align-items: center; gap: 8px; border-radius: var(--radius-sm); }
  .btn:hover { background: var(--cyan); color: var(--bg); box-shadow: 0 0 20px var(--cyan-glow); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-ghost { background: transparent; border-color: var(--border-bright); color: var(--text-secondary); }
  .btn-ghost:hover { background: var(--bg-hover); color: var(--text); border-color: var(--cyan); box-shadow: none; }
  .btn-danger { background: rgba(239, 68, 68, 0.1); border-color: var(--st-delayed); color: var(--st-delayed); }
  .btn-danger:hover { background: var(--st-delayed); color: var(--bg); box-shadow: 0 0 20px rgba(239, 68, 68, 0.5); }
  .btn-export { background: rgba(16, 185, 129, 0.1); border-color: var(--st-track); color: var(--st-track); }
  .btn-export:hover { background: var(--st-track); color: var(--bg); box-shadow: 0 0 20px rgba(16, 185, 129, 0.5); }

  /* EXPORT DROPDOWN */
  .export-wrap { position: relative; display: inline-block; }
  .export-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    background: var(--bg-elevated);
    border: 1px solid var(--st-track);
    min-width: 200px;
    opacity: 0;
    transform: translateY(-6px);
    pointer-events: none;
    transition: all 0.18s ease;
    z-index: 60;
    box-shadow: 0 8px 32px rgba(16, 185, 129, 0.12), 0 0 0 1px rgba(16, 185, 129, 0.05);
  }
  .export-menu.show { opacity: 1; transform: translateY(0); pointer-events: auto; }
  .export-option {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 11px 14px;
    background: transparent;
    border: none;
    color: var(--text);
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: all 0.12s;
  }
  .export-option:hover { background: rgba(16, 185, 129, 0.12); color: var(--st-track); }
  .export-option + .export-option { border-top: 1px solid var(--border); }
  .export-icon { font-size: 16px; line-height: 1; }
  .export-meta { margin-left: auto; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; }
  .export-option:hover .export-meta { color: var(--st-track); }

  /* TABLE */
  .table-wrap { background: var(--bg-card); border: 1px solid var(--border); overflow-x: auto; overflow-y: auto; max-height: calc(100vh - 280px); position: relative; border-radius: var(--radius); }
  .table { width: 100%; border-collapse: collapse; }
  .table th {
    text-align: left; font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-muted);
    padding: 14px 18px; border-bottom: 1px solid var(--border-bright);
    font-weight: 500; background: var(--bg-elevated);
    position: sticky; top: 0; z-index: 5;
  }
  /* Soft shadow under sticky header when content scrolls behind */
  .table th::after {
    content: ''; position: absolute; left: 0; right: 0; bottom: -8px; height: 8px;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.25), transparent);
    pointer-events: none; opacity: 0; transition: opacity 0.2s;
  }
  .table-wrap.is-scrolled .table th::after { opacity: 1; }
  body.theme-light .table th::after { background: linear-gradient(180deg, rgba(15, 23, 42, 0.10), transparent); }
  .table td { padding: 18px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: top; }
  .table tr:last-child td { border-bottom: none; }
  .table tbody tr { transition: background 0.15s; }
  .table tbody tr:hover { background: var(--bg-hover); }

  .item-name { font-weight: 600; margin-bottom: 4px; font-size: 14px; }
  .item-cat { font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-flex; align-items: center; gap: 5px; padding: 2px 7px; margin-top: 2px; border: 1px solid; border-radius: var(--radius-sm); vertical-align: middle; }
  .item-cat-icon { width: 12px; height: 12px; flex-shrink: 0; }
  .item-tool { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--st-track); text-transform: uppercase; letter-spacing: 0.08em; display: inline-block; padding: 2px 7px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); margin-top: 2px; margin-left: 4px; border-radius: var(--radius-sm); }
  .owner-cell { display: flex; align-items: center; gap: 8px; }
  .owner-stack { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .owner-line { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .owner-line .avatar { flex-shrink: 0; }
  .owner-line.primary { font-size: 13px; color: var(--text); }
  .owner-line.secondary { font-size: 11px; color: var(--text-muted); }
  .owner-line.secondary .avatar { width: 18px; height: 18px; font-size: 9px; }
  .owner-line.secondary::before { content: "↳ "; color: var(--text-muted); font-size: 10px; margin-right: -2px; }
  .avatar { width: 28px; height: 28px; background: linear-gradient(135deg, var(--cyan), var(--blue)); color: var(--bg); display: inline-flex; align-items: center; justify-content: center; font-family: 'Chakra Petch', sans-serif; font-weight: 700; font-size: 12px; border-radius: 2px; flex-shrink: 0; }

  .pill { display: inline-flex; align-items: center; padding: 4px 10px; font-size: 10px; font-weight: 600; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid; white-space: nowrap; border-radius: var(--radius-sm); transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.15s ease, box-shadow 0.18s ease; }

  /* Inline editable status pill */
  .editable-status, .editable-freq, .editable-priority { cursor: pointer; user-select: none; padding-right: 6px; }
  .editable-status:hover, .editable-freq:hover, .editable-priority:hover { transform: translateY(-1px); box-shadow: 0 0 12px rgba(34, 211, 238, 0.18); filter: brightness(1.08); }
  .editable-status:active, .editable-freq:active, .editable-priority:active { transform: scale(0.97); }
  .editable-status.saving, .editable-freq.saving, .editable-priority.saving { opacity: 0.55; pointer-events: none; }
  .pill-chevron { margin-left: 5px; font-size: 9px; opacity: 0.65; transition: opacity 0.15s; }
  .editable-status:hover .pill-chevron, .editable-freq:hover .pill-chevron, .editable-priority:hover .pill-chevron { opacity: 1; }

  /* Status picker popover */
  .status-picker {
    position: fixed; z-index: 250; min-width: 150px;
    background: var(--bg-elevated); border: 1px solid var(--cyan);
    box-shadow: 0 8px 24px rgba(0,0,0,0.45), 0 0 20px rgba(34, 211, 238, 0.12);
    border-radius: 4px; padding: 6px; opacity: 0; transform: translateY(-6px) scale(0.96);
    transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
    pointer-events: none;
  }
  .status-picker.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
  .status-picker-option {
    display: flex; align-items: center; gap: 8px; padding: 7px 10px; cursor: pointer;
    font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary);
    border-radius: 3px; transition: background 0.12s, color 0.12s;
    letter-spacing: 0.06em;
  }
  .status-picker-option:hover { background: rgba(34, 211, 238, 0.1); color: var(--text); }
  .status-picker-option.current { background: rgba(34, 211, 238, 0.06); color: var(--cyan-bright); }
  .status-picker-option-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 6px currentColor; }

  /* Inline-editable owner (primary owner in table) */
  .owner-line.primary.editable-owner { cursor: pointer; padding: 2px 6px; margin: -2px -6px; border-radius: var(--radius-sm); transition: background 0.15s; }
  .owner-line.primary.editable-owner:hover { background: rgba(34, 211, 238, 0.08); }
  .owner-line.primary.editable-owner .owner-chevron {
    opacity: 0; transition: opacity 0.15s; font-size: 9px; color: var(--text-muted); margin-left: 4px;
  }
  .owner-line.primary.editable-owner:hover .owner-chevron { opacity: 0.7; }
  .owner-line.primary.editable-owner.saving { opacity: 0.5; pointer-events: none; }
  body.theme-light .owner-line.primary.editable-owner:hover { background: rgba(15, 118, 110, 0.08); }

  /* Owner picker popover (mirrors status picker) */
  .owner-picker {
    position: fixed; z-index: 250; min-width: 180px; max-height: 280px; overflow-y: auto;
    background: var(--bg-elevated); border: 1px solid var(--cyan);
    box-shadow: 0 8px 24px rgba(0,0,0,0.45), 0 0 20px rgba(34, 211, 238, 0.12);
    border-radius: 4px; padding: 6px; opacity: 0; transform: translateY(-6px) scale(0.96);
    transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
    pointer-events: none;
  }
  .owner-picker.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
  .owner-picker-option {
    display: flex; align-items: center; gap: 8px; padding: 7px 10px; cursor: pointer;
    font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary);
    border-radius: 3px; transition: background 0.12s, color 0.12s;
    letter-spacing: 0.04em;
  }
  .owner-picker-option:hover { background: rgba(34, 211, 238, 0.1); color: var(--text); }
  .owner-picker-option.current { background: rgba(34, 211, 238, 0.06); color: var(--cyan-bright); }
  .owner-picker-option .avatar { width: 18px; height: 18px; font-size: 9px; }
  .owner-picker-divider { height: 1px; background: var(--border); margin: 6px 4px; }
  .owner-picker-edit { font-style: italic; color: var(--text-muted); }
  .owner-picker-edit:hover { color: var(--cyan-bright); }
  body.theme-light .owner-picker { box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15); }

  /* Row menu (3-dot button + popover) */
  .row-menu-btn { background: transparent; border: 1px solid var(--border-bright); width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; cursor: pointer; transition: all 0.15s; padding: 0; color: var(--text-secondary); font-size: 16px; line-height: 1; }
  .row-menu-btn:hover { background: var(--cyan); border-color: var(--cyan); color: var(--bg); }
  .row-menu-popover {
    position: fixed; z-index: 250; min-width: 160px;
    background: var(--bg-elevated); border: 1px solid var(--cyan);
    box-shadow: 0 8px 24px rgba(0,0,0,0.45), 0 0 20px rgba(34, 211, 238, 0.12);
    border-radius: 4px; padding: 6px; opacity: 0; transform: translateY(-6px) scale(0.96);
    transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
    pointer-events: none;
  }
  .row-menu-popover.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
  .row-menu-option {
    display: flex; align-items: center; gap: 10px; padding: 8px 10px; cursor: pointer;
    font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary);
    border-radius: 3px; transition: background 0.12s, color 0.12s;
    letter-spacing: 0.06em;
  }
  .row-menu-option:hover { background: rgba(34, 211, 238, 0.1); color: var(--text); }
  .row-menu-option .row-menu-icon { font-size: 13px; opacity: 0.7; }
  .row-menu-option:hover .row-menu-icon { opacity: 1; }
  .row-menu-divider { height: 1px; background: var(--border); margin: 5px 4px; }
  .row-menu-option.row-menu-danger { color: var(--st-delayed); }
  .row-menu-option.row-menu-danger:hover { background: rgba(239, 68, 68, 0.12); color: var(--st-delayed); }
  body.theme-light .row-menu-option.row-menu-danger { color: #B91C1C; }
  body.theme-light .row-menu-option.row-menu-danger:hover { background: rgba(185, 28, 28, 0.1); color: #B91C1C; }
  /* Action cell spacing: edit + menu side-by-side */
  .action-cell .icon-btn + .row-menu-btn { margin-left: 6px; }
  body.theme-light .row-menu-popover { box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15); }

  .pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; margin-right: 7px; background: currentColor; box-shadow: 0 0 6px currentColor; }
  .pill-track { background: var(--st-track-bg); color: var(--st-track); border-color: var(--st-track-border); }
  .pill-risk { background: var(--st-risk-bg); color: var(--st-risk); border-color: var(--st-risk-border); }
  .pill-delayed { background: var(--st-delayed-bg); color: var(--st-delayed); border-color: var(--st-delayed-border); }
  .pill-hold { background: var(--st-hold-bg); color: var(--st-hold); border-color: var(--st-hold-border); }
  .pill-done { background: var(--st-done-bg); color: var(--st-done); border-color: var(--st-done-border); }

  .pill-freq { background: rgba(34, 211, 238, 0.08); color: var(--cyan-bright); border-color: rgba(34, 211, 238, 0.3); }
  .pill-freq::before { display: none; }
  .pill-prio-crit { background: var(--st-delayed-bg); color: var(--prio-crit); border-color: var(--st-delayed-border); }
  .pill-prio-high { background: var(--st-risk-bg); color: var(--prio-high); border-color: var(--st-risk-border); }
  .pill-prio-med { background: rgba(34, 211, 238, 0.08); color: var(--prio-med); border-color: rgba(34, 211, 238, 0.3); }
  .pill-prio-low { background: var(--st-hold-bg); color: var(--prio-low); border-color: var(--st-hold-border); }

  .phase-cell { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-secondary); }
  .phase-cell.editable-phase { cursor: pointer; padding: 4px 8px; margin: -4px -8px; border-radius: var(--radius-sm); transition: background 0.15s, color 0.15s; display: inline-flex; align-items: center; }
  .phase-cell.editable-phase:hover { background: rgba(34, 211, 238, 0.08); color: var(--text); }
  .phase-cell.editable-phase .phase-chevron { opacity: 0; transition: opacity 0.15s; font-size: 9px; color: var(--text-muted); margin-left: 5px; }
  .phase-cell.editable-phase:hover .phase-chevron { opacity: 0.7; }
  .phase-cell.editable-phase.saving { opacity: 0.5; pointer-events: none; }
  body.theme-light .phase-cell.editable-phase:hover { background: rgba(15, 118, 110, 0.08); }

  /* Phase picker popover (mirrors status/owner pickers; phases kept in lifecycle order) */
  .phase-picker {
    position: fixed; z-index: 250; min-width: 160px;
    background: var(--bg-elevated); border: 1px solid var(--cyan);
    box-shadow: 0 8px 24px rgba(0,0,0,0.45), 0 0 20px rgba(34, 211, 238, 0.12);
    border-radius: 4px; padding: 6px; opacity: 0; transform: translateY(-6px) scale(0.96);
    transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
    pointer-events: none;
  }
  .phase-picker.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
  .phase-picker-option {
    display: flex; align-items: center; gap: 9px; padding: 7px 10px; cursor: pointer;
    font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary);
    border-radius: 3px; transition: background 0.12s, color 0.12s;
    letter-spacing: 0.04em;
  }
  .phase-picker-option:hover { background: rgba(34, 211, 238, 0.1); color: var(--text); }
  .phase-picker-option.current { background: rgba(34, 211, 238, 0.06); color: var(--cyan-bright); }
  .phase-picker-step { font-size: 9px; color: var(--text-muted); width: 14px; text-align: center; flex-shrink: 0; }
  .phase-picker-option.current .phase-picker-step { color: var(--cyan-bright); }
  body.theme-light .phase-picker { box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15); }

  /* Frequency picker (ordered cadence list) + Priority picker (colored dots) */
  .freq-picker, .priority-picker {
    position: fixed; z-index: 250; min-width: 150px;
    background: var(--bg-elevated); border: 1px solid var(--cyan);
    box-shadow: 0 8px 24px rgba(0,0,0,0.45), 0 0 20px rgba(34, 211, 238, 0.12);
    border-radius: 4px; padding: 6px; opacity: 0; transform: translateY(-6px) scale(0.96);
    transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
    pointer-events: none;
  }
  .freq-picker.open, .priority-picker.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
  .freq-picker-option, .priority-picker-option {
    display: flex; align-items: center; gap: 9px; padding: 7px 10px; cursor: pointer;
    font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary);
    border-radius: 3px; transition: background 0.12s, color 0.12s; letter-spacing: 0.04em;
  }
  .freq-picker-option:hover, .priority-picker-option:hover { background: rgba(34, 211, 238, 0.1); color: var(--text); }
  .freq-picker-option.current, .priority-picker-option.current { background: rgba(34, 211, 238, 0.06); color: var(--cyan-bright); }
  .priority-picker-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 6px currentColor; }
  body.theme-light .freq-picker, body.theme-light .priority-picker { box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15); }

  /* Date picker popover (Last Performed + Next Due inline edit) */
  .date-picker-pop {
    position: fixed; z-index: 250; min-width: 220px;
    background: var(--bg-elevated); border: 1px solid var(--cyan);
    box-shadow: 0 8px 24px rgba(0,0,0,0.45), 0 0 20px rgba(34, 211, 238, 0.12);
    border-radius: 4px; padding: 12px; opacity: 0; transform: translateY(-6px) scale(0.96);
    transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
    pointer-events: none;
  }
  .date-picker-pop.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
  .date-picker-pop-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; }
  .date-picker-pop input[type="date"] {
    width: 100%; background: var(--bg-card); border: 1px solid var(--border-bright);
    color: var(--text); font-family: 'JetBrains Mono', monospace; font-size: 12px;
    padding: 7px 10px; border-radius: var(--radius-sm); outline: none;
    transition: border-color 0.15s; color-scheme: dark;
  }
  .date-picker-pop input[type="date"]:focus { border-color: var(--cyan); }
  .date-picker-pop-actions { display: flex; gap: 6px; margin-top: 10px; }
  .date-picker-pop-save {
    flex: 1; background: rgba(34, 211, 238, 0.12); border: 1px solid var(--cyan);
    color: var(--cyan-bright); font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.08em; text-transform: uppercase; padding: 6px; border-radius: var(--radius-sm);
    cursor: pointer; transition: background 0.15s;
  }
  .date-picker-pop-save:hover { background: rgba(34, 211, 238, 0.22); }
  .date-picker-pop-clear {
    background: transparent; border: 1px solid var(--border-bright); color: var(--text-muted);
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.08em;
    text-transform: uppercase; padding: 6px 10px; border-radius: var(--radius-sm);
    cursor: pointer; transition: all 0.15s;
  }
  .date-picker-pop-clear:hover { border-color: var(--st-delayed); color: var(--st-delayed); }
  .date-picker-pop-ongoing { display: flex; align-items: center; gap: 7px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary); cursor: pointer; }
  .date-picker-pop-ongoing input[type="checkbox"] { accent-color: var(--cyan); cursor: pointer; }
  body.theme-light .date-picker-pop input[type="date"] { color-scheme: light; }
  body.theme-light .date-picker-pop { box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15); }
  .progress-cell { min-width: 100px; }
  .progress-text { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; margin-bottom: 5px; }
  .progress { width: 100%; height: 4px; background: var(--bg-input); position: relative; border: 1px solid var(--border); }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--cyan), var(--cyan-bright)); transition: width 0.5s; box-shadow: 0 0 8px var(--cyan-glow); }
  .progress-fill.warn { background: linear-gradient(90deg, var(--st-risk), #FCD34D); box-shadow: 0 0 8px rgba(245, 158, 11, 0.5); }
  .progress-fill.crit { background: linear-gradient(90deg, var(--st-delayed), #F87171); box-shadow: 0 0 8px rgba(239, 68, 68, 0.4); }
  .progress-fill.ok { background: linear-gradient(90deg, var(--st-track), #34D399); box-shadow: 0 0 8px rgba(16, 185, 129, 0.4); }

  /* Progress Bar V2 — gradient + quartile ticks + days-left */
  .progress-cell-v2 { min-width: 200px; padding-right: 14px !important; }
  .progress-cell-v2.editable-progress { cursor: pointer; transition: background 0.15s; border-radius: var(--radius-sm); }
  .progress-cell-v2.editable-progress:hover { background: rgba(34, 211, 238, 0.05); }
  body.theme-light .progress-cell-v2.editable-progress:hover { background: rgba(15, 118, 110, 0.05); }

  /* Progress picker popover */
  .progress-picker-pop {
    position: fixed; z-index: 250; width: 240px;
    background: var(--bg-elevated); border: 1px solid var(--cyan);
    box-shadow: 0 8px 24px rgba(0,0,0,0.45), 0 0 20px rgba(34, 211, 238, 0.12);
    border-radius: 4px; padding: 14px; opacity: 0; transform: translateY(-6px) scale(0.96);
    transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
    pointer-events: none;
  }
  .progress-picker-pop.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
  .progress-picker-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
  .progress-picker-val { font-size: 18px; font-family: 'Chakra Petch', sans-serif; font-weight: 600; color: var(--cyan-bright); }
  .progress-picker-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .progress-picker-row input[type="range"] { flex: 1; accent-color: var(--cyan); cursor: pointer; height: 4px; }
  .progress-picker-row input[type="number"] { width: 56px; background: var(--bg-card); border: 1px solid var(--border-bright); color: var(--text); font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 5px 7px; border-radius: var(--radius-sm); text-align: center; outline: none; }
  .progress-picker-row input[type="number"]:focus { border-color: var(--cyan); }
  .progress-picker-presets { display: flex; gap: 5px; margin-bottom: 12px; flex-wrap: wrap; }
  .progress-preset { font-family: 'JetBrains Mono', monospace; font-size: 10px; padding: 4px 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-bright); background: transparent; color: var(--text-muted); cursor: pointer; transition: all 0.12s; }
  .progress-preset:hover { border-color: var(--cyan); color: var(--cyan-bright); background: rgba(34, 211, 238, 0.08); }
  .progress-picker-save { width: 100%; background: rgba(34, 211, 238, 0.12); border: 1px solid var(--cyan); color: var(--cyan-bright); font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; padding: 7px; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.15s; }
  .progress-picker-save:hover { background: rgba(34, 211, 238, 0.22); }
  body.theme-light .progress-picker-pop { box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15); }
  .pb-wrap { display: flex; flex-direction: column; gap: 6px; }
  .pb-track {
    position: relative; width: 100%; height: 6px;
    background: var(--bg-input); border: 1px solid var(--border);
    border-radius: 0; overflow: visible;
  }
  .pb-fill {
    height: 100%; width: 0%;
    background: linear-gradient(90deg, var(--cyan), var(--cyan-bright));
    transition: width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
    box-shadow: 0 0 6px var(--cyan-glow);
  }
  .pb-fill.warn { background: linear-gradient(90deg, var(--st-risk), #FCD34D); box-shadow: 0 0 6px rgba(245, 158, 11, 0.5); }
  .pb-fill.crit { background: linear-gradient(90deg, var(--st-delayed), #F87171); box-shadow: 0 0 6px rgba(239, 68, 68, 0.4); }
  .pb-fill.ok   { background: linear-gradient(90deg, var(--st-track), #34D399);   box-shadow: 0 0 6px rgba(16, 185, 129, 0.4); }
  body.theme-light .pb-fill { box-shadow: none; }
  .pb-ticks {
    position: absolute; top: -1px; left: 0; right: 0; height: 8px;
    pointer-events: none;
  }
  .pb-tick {
    position: absolute; top: 0; width: 1px; height: 8px;
    background: var(--border-bright); transition: background 0.3s ease, box-shadow 0.3s ease;
  }
  .pb-tick.passed { background: var(--cyan-bright); box-shadow: 0 0 3px var(--cyan-glow); }
  .pb-tick.passed.warn { background: var(--st-risk); box-shadow: 0 0 3px rgba(245, 158, 11, 0.5); }
  .pb-tick.passed.crit { background: var(--st-delayed); box-shadow: 0 0 3px rgba(239, 68, 68, 0.4); }
  .pb-tick.passed.ok { background: var(--st-track); box-shadow: 0 0 3px rgba(16, 185, 129, 0.5); }
  body.theme-light .pb-tick.passed,
  body.theme-light .pb-tick.passed.warn,
  body.theme-light .pb-tick.passed.crit,
  body.theme-light .pb-tick.passed.ok { box-shadow: none; }

  /* Target line above bar */
  .pb-target-line {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 8px; font-family: 'JetBrains Mono', monospace;
    gap: 8px;
  }
  .pb-target-label {
    font-size: 10px; color: var(--text-muted);
    letter-spacing: 0.12em; font-weight: 500;
  }
  .pb-target {
    font-size: 11.5px; font-weight: 600;
    letter-spacing: 0.03em;
    display: inline-flex; align-items: center; gap: 5px;
    white-space: nowrap;
  }
  .pb-target .target-icon { font-size: 10px; }
  .pb-target .target-days { font-weight: 400; margin-left: 2px; font-size: 10.5px; }

  /* Color variants */
  .pb-target.target-normal { color: var(--text); }
  .pb-target.target-normal .target-icon,
  .pb-target.target-normal .target-days { color: var(--text-secondary); }

  .pb-target.target-soon { color: var(--st-risk); text-shadow: 0 0 8px rgba(245, 158, 11, 0.25); }
  .pb-target.target-soon .target-icon { color: var(--st-risk); }
  .pb-target.target-soon .target-days { color: #FCD34D; }

  .pb-target.target-today { color: #FB923C; text-shadow: 0 0 10px rgba(251, 146, 60, 0.3); }
  .pb-target.target-today .target-icon { color: #FB923C; }
  .pb-target.target-today .target-days { color: #FDBA74; font-weight: 600; }

  .pb-target.target-overdue { color: var(--st-delayed); text-shadow: 0 0 10px rgba(239, 68, 68, 0.3); }
  .pb-target.target-overdue .target-icon { color: var(--st-delayed); }
  .pb-target.target-overdue .target-days { color: #F87171; font-weight: 600; }

  .pb-target.target-delivered { color: var(--st-done); }
  .pb-target.target-delivered .target-icon { color: var(--st-done); }
  .pb-target.target-delivered .target-days { color: #93C5FD; }

  .pb-target.target-none { color: var(--text-muted); font-style: italic; font-weight: 400; }
  .pb-target.target-none .target-icon { color: var(--border-bright); }

  body.theme-light .pb-target.target-soon,
  body.theme-light .pb-target.target-today,
  body.theme-light .pb-target.target-overdue { text-shadow: none; }
  body.theme-light .pb-target.target-soon .target-days { color: #B45309; }
  body.theme-light .pb-target.target-today .target-days { color: #C2410C; }
  body.theme-light .pb-target.target-overdue .target-days { color: #991B1B; }
  body.theme-light .pb-target.target-delivered .target-days { color: #1E40AF; }

  /* Percentage line below bar — right-aligned */
  .pb-pct-line {
    display: flex; justify-content: flex-end; align-items: center;
    margin-top: 6px; font-family: 'JetBrains Mono', monospace;
  }
  .pb-pct { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; color: var(--cyan-bright); }
  .pb-pct.warn { color: var(--st-risk); }
  .pb-pct.crit { color: var(--st-delayed); }
  .pb-pct.ok   { color: var(--st-track); }

  .date-cell, .updated-cell { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-secondary); }
  .editable-date { cursor: pointer; padding: 3px 6px; margin: -3px -6px; border-radius: var(--radius-sm); transition: background 0.15s; display: inline-block; }
  .editable-date:hover { background: rgba(34, 211, 238, 0.08); }
  body.theme-light .editable-date:hover { background: rgba(15, 118, 110, 0.08); }
  .updated-cell { color: var(--text-muted); }
  .date-overdue { color: var(--st-delayed); font-weight: 600; }
  .date-overdue::before { content: "⚠ "; }
  .date-due-soon { color: var(--st-risk); }

  .icon-btn { background: transparent; border: 1px solid var(--border-bright); width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; cursor: pointer; transition: all 0.15s; padding: 0; color: var(--text-secondary); }
  .icon-btn:hover { background: var(--cyan); border-color: var(--cyan); color: var(--bg); box-shadow: 0 0 12px var(--cyan-glow); }
  .icon-btn svg { width: 14px; height: 14px; }

  .empty { text-align: center; padding: 72px 20px; }
  .empty-icon { width: 64px; height: 64px; margin: 0 auto 20px; border: 1px solid var(--border-bright); border-radius: var(--radius); display: flex; align-items: center; justify-content: center; color: var(--cyan); background: rgba(34, 211, 238, 0.04); }
  .empty.is-positive .empty-icon { color: var(--st-track); border-color: var(--st-track-border); background: var(--st-track-bg); }
  .empty-title { font-family: 'Chakra Petch', sans-serif; font-size: 22px; margin-bottom: 8px; }
  .empty-sub { color: var(--text-muted); margin-bottom: 22px; font-size: 14px; max-width: 360px; margin-left: auto; margin-right: auto; line-height: 1.5; }
  .empty-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .empty-actions .btn-secondary {
    background: transparent; border: 1px solid var(--border-bright); color: var(--text-secondary);
    padding: 9px 16px; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.06em;
    text-transform: uppercase; cursor: pointer; border-radius: var(--radius-sm); transition: all 0.15s;
    display: inline-flex; align-items: center; gap: 7px;
  }
  .empty-actions .btn-secondary:hover { border-color: var(--cyan); color: var(--cyan-bright); background: rgba(34, 211, 238, 0.06); }

  /* BAU summary chips */
  .bau-summary { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 18px; }
  .bau-chip { background: var(--bg-card); border: 1px solid var(--border); padding: 10px 14px; display: inline-flex; align-items: center; gap: 10px; }
  .bau-chip-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }
  .bau-chip-value { font-family: 'Chakra Petch', sans-serif; font-size: 18px; font-weight: 600; color: var(--text); }
  .bau-chip.crit .bau-chip-value { color: var(--st-delayed); text-shadow: 0 0 12px rgba(239, 68, 68, 0.5); }
  .bau-chip.warn .bau-chip-value { color: var(--st-risk); }
  .bau-chip.ok .bau-chip-value { color: var(--st-track); }

  /* TAB NAVIGATION */
  .tab-bar {
    display: inline-flex; gap: 4px; padding: 5px;
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 8px; margin: 24px 0 22px; flex-wrap: wrap;
  }
  .tab-btn {
    font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.06em;
    padding: 9px 18px; border-radius: 5px; cursor: pointer;
    background: transparent; color: var(--text-muted); border: none;
    display: inline-flex; align-items: center; gap: 8px;
    transition: background 0.18s, color 0.18s;
  }
  .tab-btn:hover { color: var(--text); background: rgba(34, 211, 238, 0.06); }
  .tab-btn.active { background: rgba(34, 211, 238, 0.18); color: var(--cyan-bright); }
  .tab-btn svg { width: 13px; height: 13px; }
  .tab-btn-count {
    font-size: 10px; background: rgba(148, 163, 184, 0.16);
    padding: 1px 7px; border-radius: 10px; color: var(--text-muted);
    margin-left: 2px; transition: background 0.18s, color 0.18s;
  }
  .tab-btn.active .tab-btn-count { background: rgba(34, 211, 238, 0.25); color: var(--cyan-bright); }
  .tab-btn-count.has-overdue { background: rgba(239, 68, 68, 0.18); color: var(--st-delayed); }
  body.theme-light .tab-btn-count.has-overdue { background: rgba(185, 28, 28, 0.12); color: #B91C1C; }
  .tab-content { display: none; }
  .tab-content.active { display: block; }
  @media (max-width: 768px) {
    .tab-bar { width: 100%; justify-content: space-between; }
    .tab-btn { padding: 8px 12px; font-size: 10px; }
    .tab-btn-count { padding: 1px 6px; font-size: 9px; }
  }

  /* OVERDUE BANNER (projects + BAU) */
  .overdue-banner {
    display: none; align-items: center; gap: 12px;
    padding: 10px 16px; margin: 24px 0 18px 0;
    background: linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.06) 100%);
    border: 1px solid rgba(239, 68, 68, 0.45);
    border-left: 3px solid var(--st-delayed);
    color: var(--st-delayed);
    font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.04em;
    border-radius: var(--radius-sm);
    transition: background 220ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 220ms;
  }
  .overdue-banner.show { display: flex; }
  .overdue-banner-icon { font-size: 14px; line-height: 1; animation: pulse-warn 2s ease-in-out infinite; }
  .overdue-banner-segments { flex: 1; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .overdue-segment {
    background: transparent; border: 1px solid transparent; color: inherit;
    font-family: inherit; font-size: inherit; letter-spacing: inherit;
    padding: 4px 10px; border-radius: var(--radius-sm); cursor: pointer;
    display: inline-flex; align-items: center; gap: 6px;
    transition: background 0.18s, border-color 0.18s, transform 0.18s;
  }
  .overdue-segment:hover { background: rgba(239, 68, 68, 0.18); border-color: rgba(239, 68, 68, 0.4); transform: translateX(2px); }
  .overdue-segment b { font-weight: 700; color: var(--st-delayed); }
  .overdue-segment[hidden] { display: none !important; }
  .overdue-segment-sep { opacity: 0.5; }
  .overdue-banner-close {
    background: transparent; border: none; color: var(--st-delayed);
    font-size: 16px; line-height: 1; padding: 4px 8px; cursor: pointer;
    opacity: 0.55; transition: opacity 220ms, background 220ms;
    border-radius: var(--radius-sm);
  }
  .overdue-banner-close:hover { opacity: 1; background: rgba(239, 68, 68, 0.18); }
  @keyframes pulse-warn { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  body.theme-light .overdue-banner { background: linear-gradient(90deg, #FEE2E2 0%, #FEF7F7 100%); color: #991B1B; border-color: #FCA5A5; border-left-color: #B91C1C; }
  body.theme-light .overdue-segment b { color: #991B1B; }
  body.theme-light .overdue-banner-close { color: #991B1B; }
  body.theme-light .overdue-banner-close:hover { background: rgba(185, 28, 28, 0.12); }

  /* OVERDUE FILTER CHIP (active filter indicator in BAU toolbar) */
  .bau-filter-chip {
    display: none; align-items: center; gap: 8px;
    padding: 6px 8px 6px 12px;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: var(--st-delayed);
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.08em; text-transform: uppercase;
    border-radius: var(--radius-sm);
  }
  .bau-filter-chip.show { display: inline-flex; }
  .bau-filter-chip-close {
    background: transparent; border: none; color: inherit;
    font-size: 14px; line-height: 1; padding: 0 4px; cursor: pointer;
    opacity: 0.7; transition: opacity 220ms;
  }
  .bau-filter-chip-close:hover { opacity: 1; }
  body.theme-light .bau-filter-chip { background: #FEE2E2; border-color: #FCA5A5; color: #991B1B; }

  /* SMART SUGGESTIONS IN DRAWER */
  .drawer-hints {
    margin-bottom: 22px; padding: 12px 14px;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-left: 3px solid var(--st-risk);
    border-radius: var(--radius-sm);
  }
  .drawer-hints-label {
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--st-risk); margin-bottom: 8px; font-weight: 600;
  }
  .drawer-hint {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 8px 0; font-size: 13px; line-height: 1.5;
    color: var(--text);
    border-top: 1px solid rgba(245, 158, 11, 0.18);
  }
  .drawer-hint:first-of-type { border-top: none; padding-top: 4px; }
  .drawer-hint-icon { color: var(--st-risk); font-size: 14px; line-height: 1.4; flex-shrink: 0; }
  .drawer-hint-text { flex: 1; }
  .drawer-hint-dismiss {
    background: transparent; border: none; color: var(--text-muted);
    font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
    font-family: 'JetBrains Mono', monospace; cursor: pointer;
    padding: 2px 6px; border-radius: var(--radius-sm);
    transition: color 220ms, background 220ms; flex-shrink: 0;
  }
  .drawer-hint-dismiss:hover { color: var(--text); background: rgba(245, 158, 11, 0.12); }
  body.theme-light .drawer-hints { background: #FEF3C7; border-color: #FCD34D; border-left-color: #B45309; }
  body.theme-light .drawer-hints-label { color: #B45309; }
  body.theme-light .drawer-hint { border-top-color: rgba(180, 83, 9, 0.18); }
  body.theme-light .drawer-hint-icon { color: #B45309; }

  /* DRAWER */
  .overlay { position: fixed; inset: 0; background: rgba(6, 11, 23, 0.7); z-index: 100; opacity: 0; pointer-events: none; transition: opacity 0.25s; backdrop-filter: blur(4px); }
  .overlay.open { opacity: 1; pointer-events: auto; }

  .drawer { position: fixed; right: 0; top: 0; bottom: 0; width: 100%; max-width: 820px; background: var(--bg-elevated); z-index: 101; transform: translateX(100%); transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); overflow-y: auto; border-left: 1px solid var(--cyan); box-shadow: -20px 0 60px rgba(34, 211, 238, 0.08); border-top-left-radius: var(--radius); border-bottom-left-radius: var(--radius); }
  .drawer.open { transform: translateX(0); }
  .drawer-inner { padding: 32px; }
  .drawer-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
  .drawer-title { font-family: 'Chakra Petch', sans-serif; font-size: 24px; letter-spacing: 0.02em; font-weight: 600; }
  .drawer-title::before { content: "> "; color: var(--cyan); }

  /* Drawer redesign — breadcrumb, status pill, tabs, sections, slider */
  .drawer-head-main { flex: 1; min-width: 0; }
  .drawer-breadcrumb {
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    color: var(--text-muted); letter-spacing: 0.12em;
    text-transform: uppercase; margin-bottom: 6px;
    display: flex; align-items: center; gap: 6px;
  }
  .drawer-breadcrumb .dc-arrow { color: var(--border-bright); }
  .drawer-breadcrumb #p-breadcrumb-name,
  .drawer-breadcrumb #b-breadcrumb-name { color: var(--cyan-bright); }
  .drawer-title-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .drawer-status-pill {
    font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 600;
    padding: 3px 9px; letter-spacing: 0.1em; text-transform: uppercase;
    border: 1px solid; white-space: nowrap;
    display: inline-flex; align-items: center; gap: 5px;
    transition: background 0.2s, color 0.2s, border-color 0.2s;
  }
  .drawer-status-pill::before {
    content: ''; width: 5px; height: 5px; border-radius: 50%;
    background: currentColor; box-shadow: 0 0 5px currentColor;
  }
  body.theme-light .drawer-status-pill::before { box-shadow: none; }
  .drawer-status-pill.pill-track { background: var(--st-track-bg); color: var(--st-track); border-color: var(--st-track-border); }
  .drawer-status-pill.pill-risk  { background: var(--st-risk-bg); color: var(--st-risk); border-color: var(--st-risk-border); }
  .drawer-status-pill.pill-delayed { background: var(--st-delayed-bg); color: var(--st-delayed); border-color: var(--st-delayed-border); }
  .drawer-status-pill.pill-hold { background: var(--st-hold-bg); color: var(--st-hold); border-color: var(--st-hold-border); }
  .drawer-status-pill.pill-done { background: var(--st-done-bg); color: var(--st-done); border-color: var(--st-done-border); }

  /* Tabs */
  .drawer-tabs {
    display: flex; gap: 0; padding: 0; margin: 0 0 22px;
    border-bottom: 1px solid var(--border);
    position: sticky; top: 0; background: var(--bg-elevated); z-index: 2;
  }
  .drawer-tab {
    background: none; border: none; cursor: pointer;
    padding: 11px 16px; font-family: 'JetBrains Mono', monospace; font-size: 10px;
    color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase;
    border-bottom: 2px solid transparent; transition: color 0.18s, border-color 0.18s;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .drawer-tab:hover { color: var(--text-secondary); }
  .drawer-tab.active { color: var(--cyan-bright); border-bottom-color: var(--cyan-bright); }
  .drawer-tab-badge {
    font-size: 9px; background: rgba(34, 211, 238, 0.15); color: var(--cyan-bright);
    padding: 1px 6px; letter-spacing: 0.04em;
  }
  body.theme-light .drawer-tab-badge { background: rgba(8, 145, 178, 0.12); }
  .drawer-tab-panel { display: none; animation: tabFadeIn 0.22s ease; }
  .drawer-tab-panel.active { display: block; }
  @keyframes tabFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

  /* Sections within Details */
  .drawer-section { margin-bottom: 26px; }
  .drawer-section-label {
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    color: var(--cyan); letter-spacing: 0.14em; text-transform: uppercase;
    padding-bottom: 6px; margin-bottom: 14px; border-bottom: 1px dashed var(--border);
  }

  /* Progress slider */
  .slider-readout {
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    color: var(--cyan-bright); font-weight: 600; margin-left: 8px;
  }
  .slider-row { display: flex; gap: 12px; align-items: center; }
  .form-slider {
    flex: 1; -webkit-appearance: none; appearance: none;
    height: 6px; background: var(--bg-input); border: 1px solid var(--border);
    border-radius: 0; outline: none; cursor: pointer;
    accent-color: var(--cyan);
  }
  .form-slider::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 16px; height: 16px; background: var(--cyan-bright);
    border: 2px solid var(--bg-elevated); cursor: pointer;
    box-shadow: 0 0 8px var(--cyan-glow);
    transition: transform 0.15s;
  }
  .form-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
  .form-slider::-moz-range-thumb {
    width: 16px; height: 16px; background: var(--cyan-bright);
    border: 2px solid var(--bg-elevated); cursor: pointer;
    box-shadow: 0 0 8px var(--cyan-glow);
  }
  body.theme-light .form-slider::-webkit-slider-thumb { box-shadow: 0 1px 3px rgba(8, 145, 178, 0.4); }
  body.theme-light .form-slider::-moz-range-thumb { box-shadow: 0 1px 3px rgba(8, 145, 178, 0.4); }
  .slider-number { max-width: 80px; text-align: center; }

  /* Sticky drawer footer */
  .drawer-footer {
    position: sticky; bottom: 0; left: 0; right: 0;
    background: var(--bg-elevated); border-top: 1px solid var(--border);
    padding: 14px 0 0; margin-top: 24px;
    z-index: 2;
  }

  @media (max-width: 640px) {
    .drawer-tabs { overflow-x: auto; }
    .drawer-tab { white-space: nowrap; }
    .drawer-status-pill { font-size: 8px; padding: 2px 6px; }
  }
  .close-btn { background: transparent; border: 1px solid var(--border-bright); width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; color: var(--text-secondary); }
  .close-btn:hover { background: var(--st-delayed); border-color: var(--st-delayed); color: var(--bg); }

  .form-group { margin-bottom: 18px; }
  .form-label { display: block; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--cyan-bright); margin-bottom: 7px; font-weight: 500; }
  .form-label::before { content: ":: "; opacity: 0.6; }
  .form-input, .form-select, .form-textarea { width: 100%; background: var(--bg-input); border: 1px solid var(--border-bright); padding: 11px 13px; font-family: 'IBM Plex Sans', sans-serif; font-size: 14px; outline: none; transition: all 0.15s; color: var(--text); border-radius: var(--radius-sm); }
  .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.12); }
  .form-input::placeholder, .form-textarea::placeholder { color: var(--text-muted); }
  .form-select { cursor: pointer; padding-right: 32px; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%2322D3EE' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
  .form-select option { background: var(--bg-elevated); color: var(--text); }
  .form-textarea { resize: vertical; min-height: 90px; font-family: 'IBM Plex Sans', sans-serif; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-actions { display: flex; gap: 10px; padding-top: 24px; border-top: 1px solid var(--border); margin-top: 4px; }
  .form-actions .btn { flex: 1; justify-content: center; }
  .custom-cat-wrap { margin-top: 8px; display: none; animation: slideDown 0.2s ease; }
  .custom-cat-wrap.show { display: block; }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

  /* ONGOING TOGGLE */
  .ongoing-toggle { margin-bottom: 8px; }
  .toggle-row { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; color: var(--text-secondary); font-family: 'JetBrains Mono', monospace; }
  .toggle-row input[type="checkbox"] { appearance: none; width: 16px; height: 16px; border: 1px solid var(--border-bright); background: var(--bg-input); cursor: pointer; position: relative; transition: all 0.15s; flex-shrink: 0; }
  .toggle-row input[type="checkbox"]:checked { background: var(--cyan); border-color: var(--cyan); box-shadow: 0 0 8px var(--cyan-glow); }
  .toggle-row input[type="checkbox"]:checked::after { content: "✓"; position: absolute; top: -2px; left: 2px; color: var(--bg); font-size: 14px; font-weight: 700; }
  .toggle-row:hover input[type="checkbox"]:not(:checked) { border-color: var(--cyan); }

  /* SUB-TASKS (inside modal) */
  .subtask-section { margin-top: 4px; margin-bottom: 24px; padding-top: 20px; padding-bottom: 24px; border-top: 1px dashed var(--border); border-bottom: 1px dashed var(--border); }
  .subtask-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .subtask-title-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--cyan-bright); font-weight: 500; display: flex; align-items: center; gap: 8px; }
  .subtask-title-label::before { content: ":: "; opacity: 0.6; }
  .subtask-count-pill { display: inline-flex; align-items: center; padding: 2px 8px; font-size: 10px; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.35); background: rgba(16, 185, 129, 0.1); color: var(--st-track); border-radius: var(--radius-sm); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em; }
  .subtask-count-pill.zero { border-color: var(--border-bright); background: var(--bg-input); color: var(--text-muted); }
  .subtask-add-btn {
    padding: 6px 12px; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer;
    border: 1px solid var(--cyan); background: rgba(34, 211, 238, 0.08); color: var(--cyan-bright); transition: all 0.15s;
  }
  .subtask-add-btn:hover { background: var(--cyan); color: var(--bg); box-shadow: 0 0 12px var(--cyan-glow); }
  .subtask-list { display: flex; flex-direction: column; gap: 8px; }
  .subtask-empty { padding: 14px; text-align: center; color: var(--text-muted); font-size: 12px; font-style: italic; border: 1px dashed var(--border); background: var(--bg-input); }
  .subtask-hint { padding: 12px; font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; background: var(--bg-input); border: 1px dashed var(--border); text-align: center; }
  .subtask-row { display: grid; grid-template-columns: auto 1fr 140px 130px auto; gap: 10px; align-items: flex-start; padding: 10px 12px; background: var(--bg-input); border: 1px solid var(--border); transition: border-color 0.15s; }
  .subtask-row:hover { border-color: var(--border-bright); }
  .subtask-row.completed { opacity: 0.65; }
  .subtask-row.completed .subtask-title-input { text-decoration: line-through; color: var(--text-muted); }
  .subtask-status-box {
    width: 22px; height: 22px; border: 1px solid var(--border-bright); background: var(--bg); cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; color: transparent; transition: all 0.15s; flex-shrink: 0; margin-top: 4px;
  }
  .subtask-status-box:hover { border-color: var(--cyan); }
  .subtask-status-box.in-progress { border-color: var(--st-risk); color: var(--st-risk); }
  .subtask-status-box.in-progress::before { content: "◐"; font-size: 14px; }
  .subtask-status-box.completed { background: var(--st-track); border-color: var(--st-track); color: var(--bg); }
  .subtask-status-box.completed::before { content: "✓"; }
  .subtask-title-input {
    background: var(--bg); border: 1px solid var(--border); color: var(--text); font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px; padding: 8px 10px; outline: none; width: 100%; min-height: 60px; resize: vertical;
    line-height: 1.5; transition: border-color 0.15s;
  }
  .subtask-title-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 1px var(--cyan-glow); }
  .subtask-title-input::placeholder { color: var(--text-muted); font-style: italic; }
  .subtask-owner-input, .subtask-due-input {
    background: var(--bg); border: 1px solid var(--border); color: var(--text-secondary); font-family: 'JetBrains Mono', monospace;
    font-size: 12px; padding: 8px 10px; outline: none; width: 100%; transition: border-color 0.15s; min-height: 36px;
  }
  .subtask-owner-input:focus, .subtask-due-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 1px var(--cyan-glow); }
  .subtask-due-input.overdue { color: var(--st-delayed); }
  .subtask-delete-btn {
    width: 28px; height: 36px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid transparent; color: var(--text-muted); cursor: pointer; font-size: 16px; transition: all 0.15s; flex-shrink: 0;
  }
  .subtask-delete-btn:hover { border-color: var(--st-delayed); color: var(--st-delayed); background: rgba(239, 68, 68, 0.08); }
  @media (max-width: 640px) {
    .subtask-row { grid-template-columns: auto 1fr auto; grid-template-rows: auto auto auto; gap: 8px; }
    .subtask-title-input { grid-column: 2 / 3; }
    .subtask-owner-input { grid-column: 2 / 3; }
    .subtask-due-input { grid-column: 2 / 3; }
    .subtask-delete-btn { grid-row: 1 / 2; grid-column: 3 / 4; }
  }

  /* Sub-task badge on table rows */
  .item-subtask-badge {
    display: inline-flex; align-items: center; gap: 4px; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--st-track);
    text-transform: uppercase; letter-spacing: 0.08em; padding: 2px 7px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25);
    margin-top: 2px; margin-left: 4px;
  }
  .item-subtask-badge.complete { color: var(--blue); background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.25); }
  .item-subtask-badge::before { content: "▤"; opacity: 0.8; }

  /* Sub-task chip on calendar */
  .cal-chip.subtask { background: rgba(168, 85, 247, 0.1); border-left-color: #A855F7; color: var(--text); padding-left: 14px; position: relative; }
  .cal-chip.subtask::before { content: "↳"; position: absolute; left: 4px; color: #A855F7; font-size: 10px; }
  .cal-legend-swatch.subtask { background: rgba(168, 85, 247, 0.2); border-left: 3px solid #A855F7; }

  /* Read-only sub-task list inside expanded rows */
  .inline-subtasks { display: flex; flex-direction: column; gap: 6px; }
  .inline-subtask-row {
    display: grid; grid-template-columns: auto 1fr auto auto; gap: 10px; align-items: center;
    padding: 7px 10px; background: var(--bg-input); border: 1px solid var(--border); font-size: 12px;
  }
  .inline-subtask-row.completed { opacity: 0.55; }
  .inline-subtask-row.completed .inline-subtask-title { text-decoration: line-through; color: var(--text-muted); }
  .inline-subtask-status {
    display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px;
    font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; line-height: 1;
    border: 1px solid var(--border-bright); background: var(--bg); flex-shrink: 0;
  }
  .inline-subtask-status.not-started { color: var(--text-muted); }
  .inline-subtask-status.in-progress { color: var(--st-risk); border-color: var(--st-risk); }
  .inline-subtask-status.in-progress::before { content: "◐"; }
  .inline-subtask-status.completed { color: var(--bg); background: var(--st-track); border-color: var(--st-track); }
  .inline-subtask-status.completed::before { content: "✓"; }
  .inline-subtask-title { color: var(--text); word-break: break-word; }
  .inline-subtask-owner { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-secondary); letter-spacing: 0.05em; padding: 2px 6px; background: var(--bg); border: 1px solid var(--border); white-space: nowrap; }
  .inline-subtask-due { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary); white-space: nowrap; }
  .inline-subtask-due.overdue { color: var(--st-delayed); font-weight: 600; }

  /* PILL ONGOING */
  .pill-ongoing { display: inline-flex; align-items: center; padding: 4px 10px; font-size: 10px; font-weight: 600; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid rgba(34, 211, 238, 0.4); background: rgba(34, 211, 238, 0.1); color: var(--cyan-bright); }
  .pill-ongoing::before { content: "∞"; margin-right: 6px; font-size: 13px; line-height: 1; }

  /* EXPANDABLE ROWS */
  .data-row { cursor: pointer; }
  .data-row .chevron { display: inline-block; transition: transform 0.2s; color: var(--text-muted); font-size: 14px; line-height: 1; margin-right: 6px; user-select: none; }
  .data-row.expanded .chevron { transform: rotate(90deg); color: var(--cyan-bright); }
  .data-row.expanded { background: var(--bg-hover); }
  .data-row { transition: background 0.18s ease; }
  .chevron { transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), color 0.18s ease; }
  .expand-row { display: none; background: var(--bg-input); }
  .expand-row.open { display: table-row; }
  .expand-row > td { padding: 0 !important; border-bottom: 1px solid var(--border) !important; }
  .expand-inner { padding: 22px 24px 26px; border-left: 3px solid var(--cyan); animation: expandIn 0.28s cubic-bezier(0.2, 0.8, 0.2, 1); }
  @keyframes expandIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  .expand-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 32px; }
  @media (max-width: 768px) { .expand-grid { grid-template-columns: 1fr; gap: 16px; } }
  .expand-field { display: flex; flex-direction: column; gap: 6px; }
  .expand-field-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--cyan-bright); }
  .expand-field-label::before { content: "▸ "; opacity: 0.6; }
  .expand-field-value { font-size: 13px; line-height: 1.55; color: var(--text); white-space: pre-wrap; word-break: break-word; }
  .expand-field-value.empty { color: var(--text-muted); font-style: italic; }
  .expand-field.full-width { grid-column: 1 / -1; }
  .audit-section { margin-top: 8px; padding-top: 18px; border-top: 1px dashed var(--border); }
  .audit-toggle-header {
    display: flex; align-items: center; gap: 8px; cursor: pointer;
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--cyan-bright);
    user-select: none; padding: 4px 0; transition: color 0.15s;
  }
  .audit-toggle-header:hover { color: var(--cyan); }
  .audit-toggle-chevron { display: inline-block; font-size: 12px; color: var(--text-muted); transition: transform 0.2s ease, color 0.15s; line-height: 1; }
  .audit-toggle-header:hover .audit-toggle-chevron { color: var(--cyan); }
  .audit-toggle-header.expanded .audit-toggle-chevron { transform: rotate(90deg); color: var(--cyan-bright); }
  .audit-toggle-hint { margin-left: auto; font-size: 9px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: none; font-style: italic; }
  .audit-container { font-size: 12px; line-height: 1.5; margin-top: 10px; }
  .audit-container.collapsed { display: none; }

  /* INLINE SUB-TASK LIST (shown when row is expanded) */
  .subtask-inline-count {
    display: inline-flex; align-items: center; padding: 2px 8px; font-size: 10px; font-weight: 700;
    border: 1px solid rgba(16, 185, 129, 0.35); background: rgba(16, 185, 129, 0.1); color: var(--st-track);
    font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em; margin-left: 10px; text-transform: none;
  }
  .subtask-inline-count.complete { background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.35); color: var(--blue); }
  .subtask-inline-list { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
  .subtask-inline-row {
    display: grid; grid-template-columns: 20px 1fr auto auto; gap: 12px; align-items: center;
    padding: 8px 12px; background: var(--bg-input); border: 1px solid var(--border); font-size: 12.5px;
  }
  .subtask-inline-row.completed { opacity: 0.6; }
  .subtask-inline-row.completed .subtask-inline-title { text-decoration: line-through; color: var(--text-muted); }
  .subtask-inline-status {
    width: 18px; height: 18px; border: 1px solid var(--border-bright); background: var(--bg);
    display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
    font-size: 11px; font-weight: 700; color: transparent;
  }
  .subtask-inline-status.in-progress { border-color: var(--st-risk); color: var(--st-risk); }
  .subtask-inline-status.in-progress::before { content: "◐"; font-size: 13px; }
  .subtask-inline-status.completed { background: var(--st-track); border-color: var(--st-track); color: var(--bg); }
  .subtask-inline-status.completed::before { content: "✓"; }
  .subtask-inline-title { color: var(--text); font-size: 13px; }
  .subtask-inline-owner { font-size: 11px; color: var(--text-secondary); font-family: 'JetBrains Mono', monospace; }
  .subtask-inline-owner::before { content: "↳ "; color: var(--text-muted); }
  .subtask-inline-due { font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; white-space: nowrap; }
  .subtask-inline-due.overdue { color: var(--st-delayed); font-weight: 600; }
  @media (max-width: 640px) {
    .subtask-inline-row { grid-template-columns: 20px 1fr; }
    .subtask-inline-owner, .subtask-inline-due { grid-column: 2 / 3; }
  }
    display: flex; align-items: center; gap: 8px; cursor: pointer;
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--cyan-bright);
    user-select: none; padding: 4px 0; transition: color 0.15s;
  }
  .audit-toggle-header:hover { color: var(--cyan); }
  .audit-toggle-chevron { display: inline-block; font-size: 12px; color: var(--text-muted); transition: transform 0.2s ease, color 0.15s; line-height: 1; }
  .audit-toggle-header:hover .audit-toggle-chevron { color: var(--cyan); }
  .audit-toggle-header.expanded .audit-toggle-chevron { transform: rotate(90deg); color: var(--cyan-bright); }
  .audit-toggle-hint { margin-left: auto; font-size: 9px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: none; font-style: italic; }
  .audit-container { font-size: 12px; line-height: 1.5; margin-top: 10px; }
  .audit-container.collapsed { display: none; }
  .audit-placeholder { color: var(--text-muted); font-style: italic; }
  .audit-list { display: flex; flex-direction: column; gap: 10px; }
  .audit-entry {
    display: flex;
    gap: 12px;
    padding: 10px 12px;
    background: rgba(34, 211, 238, 0.04);
    border-left: 2px solid var(--cyan);
    font-size: 12px;
  }
  .audit-entry.create { border-left-color: var(--st-track); background: rgba(16, 185, 129, 0.04); }
  .audit-entry.update { border-left-color: var(--cyan); }
  .audit-entry.delete { border-left-color: var(--st-delayed); background: rgba(239, 68, 68, 0.04); }
  .audit-icon { flex-shrink: 0; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 11px; }
  .audit-entry.create .audit-icon { color: var(--st-track); }
  .audit-entry.update .audit-icon { color: var(--cyan-bright); }
  .audit-entry.delete .audit-icon { color: var(--st-delayed); }
  .audit-content { flex: 1; min-width: 0; }
  .audit-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 0.04em;
    flex-wrap: wrap;
  }
  .audit-user { color: var(--cyan-bright); font-weight: 600; text-transform: lowercase; }
  .audit-avatar { width: 16px; height: 16px; font-size: 8px; border-radius: 2px; display: inline-flex; align-items: center; justify-content: center; font-family: 'Chakra Petch', sans-serif; font-weight: 700; color: var(--bg); flex-shrink: 0; vertical-align: middle; margin-right: 5px; }
  .audit-action { text-transform: uppercase; font-weight: 700; letter-spacing: 0.08em; }
  .audit-entry.create .audit-action { color: var(--st-track); }
  .audit-entry.update .audit-action { color: var(--cyan-bright); }
  .audit-entry.delete .audit-action { color: var(--st-delayed); }
  .audit-time { color: var(--text-muted); }
  .audit-time::before { content: "•"; margin-right: 8px; opacity: 0.5; }
  .audit-changes { font-size: 12px; color: var(--text); }
  .audit-change-line { padding: 2px 0; word-break: break-word; }
  .audit-field-name { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary); margin-right: 6px; }
  .audit-value-old { color: var(--st-delayed); text-decoration: line-through; opacity: 0.75; }
  .audit-value-new { color: var(--st-track); font-weight: 500; }
  .audit-arrow { color: var(--text-muted); margin: 0 6px; font-family: 'JetBrains Mono', monospace; }
  .audit-empty { color: var(--text-muted); font-style: italic; padding: 8px 0; }
  .audit-error { color: var(--st-delayed); padding: 8px 0; font-size: 12px; }
  .audit-loading { display: inline-flex; align-items: center; gap: 8px; color: var(--text-muted); padding: 4px 0; }

  /* Stop event propagation on edit button */
  .action-cell { text-align: right; }

  /* TOAST */
  .toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(24px); background: var(--bg-elevated); border: 1px solid var(--cyan); color: var(--text); padding: 12px 22px; font-family: 'JetBrains Mono', monospace; font-size: 13px; z-index: 200; opacity: 0; pointer-events: none; transition: all 0.3s; box-shadow: 0 0 30px var(--cyan-glow); border-radius: var(--radius-sm); }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
  .toast::before { content: "[OK] "; color: var(--st-track); }
  .toast.err::before { content: "[ERR] "; color: var(--st-delayed); }
  .toast.err { border-color: var(--st-delayed); box-shadow: 0 0 30px rgba(239, 68, 68, 0.3); }

  .loader { display: inline-block; width: 13px; height: 13px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 900px) {
    .table thead { display: none; }
    .table, .table tbody, .table tr, .table td { display: block; width: 100%; }
    .table tr { border: 1px solid var(--border); margin-bottom: 12px; padding: 14px; background: var(--bg-card); }
    .table td { border: none; padding: 6px 0; }
    .table td::before { content: attr(data-label); display: block; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px; }
    /* Keep expand-row hidden until opened — override the display:block from above */
    .table tr.expand-row { display: none; }
    .table tr.expand-row.open { display: block; padding: 0; border: 1px solid var(--border); border-top: none; margin-top: -12px; margin-bottom: 12px; background: var(--bg-input); }
    .table tr.expand-row > td { display: block; padding: 0 !important; }
    .table tr.expand-row > td::before { display: none; }
  }

  /* HEATMAP */
  .heatmap-section { padding: 0 0 32px; }
  .heatmap-toggle {
    display: flex; align-items: center; gap: 12px; cursor: pointer;
    padding: 16px 0; user-select: none; border-bottom: 1px solid var(--border);
    margin-bottom: 0; transition: margin-bottom 0.25s;
  }
  .heatmap-toggle.open { margin-bottom: 20px; }
  .heatmap-toggle-icon {
    width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--border-bright); background: var(--bg-card); color: var(--cyan);
    font-size: 14px; transition: all 0.2s; flex-shrink: 0; border-radius: var(--radius-sm);
  }
  .heatmap-toggle:hover .heatmap-toggle-icon { border-color: var(--cyan); box-shadow: 0 0 10px var(--cyan-glow); }
  .heatmap-toggle-chevron { transition: transform 0.25s; display: inline-block; }
  .heatmap-toggle.open .heatmap-toggle-chevron { transform: rotate(90deg); }
  .heatmap-toggle-title {
    font-family: 'Chakra Petch', sans-serif; font-size: 20px; font-weight: 600;
    letter-spacing: 0.02em; display: flex; align-items: center; gap: 10px;
  }
  .heatmap-toggle-title::before { content: "[ "; color: var(--cyan); font-weight: 400; }
  .heatmap-toggle-title::after { content: " ]"; color: var(--cyan); font-weight: 400; }
  .heatmap-toggle-sub {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-muted);
    letter-spacing: 0.08em; text-transform: uppercase; margin-left: auto;
  }
  .heatmap-body { display: none; animation: expandIn 0.25s ease; }
  .heatmap-body.open { display: block; }
  .heatmap-grid-wrap { overflow-x: auto; padding-bottom: 4px; }
  .heatmap-grid {
    display: grid; gap: 3px; min-width: fit-content;
  }
  .heatmap-corner {
    font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--text-muted); padding: 6px 10px;
    display: flex; align-items: flex-end; justify-content: flex-start;
  }
  .heatmap-col-head {
    font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.06em;
    color: var(--text-muted); text-align: center; padding: 4px 2px 8px;
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    border-bottom: 1px solid var(--border);
  }
  .heatmap-col-head .hw-label { color: var(--text-secondary); font-weight: 600; font-size: 10px; }
  .heatmap-col-head .hw-range { font-size: 8px; color: var(--text-muted); white-space: nowrap; }
  .heatmap-col-head.current { border-bottom-color: var(--cyan); }
  .heatmap-col-head.current .hw-label { color: var(--cyan-bright); }
  .heatmap-row-head {
    font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 500;
    color: var(--text); padding: 0 14px 0 0; display: flex; align-items: center; gap: 8px;
    white-space: nowrap;
  }
  .heatmap-row-head .avatar { flex-shrink: 0; }
  .heatmap-cell {
    min-width: 52px; min-height: 40px; display: flex; align-items: center; justify-content: center;
    font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600;
    border: 1px solid transparent; transition: all 0.15s; cursor: default; position: relative;
  }
  .heatmap-cell:hover { border-color: var(--border-bright); transform: scale(1.08); z-index: 2; }
  .heatmap-cell.level-0 { background: var(--bg-input); color: var(--text-muted); border-color: var(--border); }
  .heatmap-cell.level-1 { background: rgba(16, 185, 129, 0.15); color: var(--st-track); border-color: rgba(16, 185, 129, 0.25); }
  .heatmap-cell.level-2 { background: rgba(16, 185, 129, 0.3); color: #34D399; border-color: rgba(16, 185, 129, 0.4); }
  .heatmap-cell.level-3 { background: rgba(245, 158, 11, 0.2); color: var(--st-risk); border-color: rgba(245, 158, 11, 0.35); }
  .heatmap-cell.level-4 { background: rgba(245, 158, 11, 0.35); color: #FBBF24; border-color: rgba(245, 158, 11, 0.5); }
  .heatmap-cell.level-5 { background: rgba(239, 68, 68, 0.25); color: var(--st-delayed); border-color: rgba(239, 68, 68, 0.4); }
  .heatmap-cell.level-6 { background: rgba(239, 68, 68, 0.4); color: #FCA5A5; border-color: rgba(239, 68, 68, 0.55); }
  .heatmap-cell.current-week { box-shadow: inset 0 0 0 1px var(--cyan), 0 0 8px rgba(34, 211, 238, 0.15); }
  .heatmap-cell[title] { cursor: help; }
  .heatmap-legend {
    display: flex; align-items: center; gap: 8px; margin-top: 14px;
    font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-muted);
  }
  .heatmap-legend-box {
    width: 14px; height: 14px; display: inline-block; border: 1px solid rgba(255,255,255,0.1);
  }
  .heatmap-legend-label { margin-right: 8px; letter-spacing: 0.1em; text-transform: uppercase; }
  .heatmap-loading { padding: 30px 0; color: var(--text-muted); font-size: 13px; text-align: center; }
  .heatmap-empty { padding: 30px 0; color: var(--text-muted); font-size: 13px; text-align: center; font-style: italic; }
  .heatmap-totals-head {
    font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--text-muted); padding: 6px 14px 0 0;
    display: flex; align-items: center; justify-content: flex-end; white-space: nowrap;
    border-top: 1px solid var(--border);
  }
  .heatmap-cell.total-cell {
    border-top: 1px solid var(--border); background: var(--bg-card);
    font-size: 11px; color: var(--text-secondary);
  }

  /* ARCHIVE */
  .archive-section { padding: 0 0 32px; }
  /* Archive lives below the tabs (single instance) but only shows on Projects + BAU tabs */
  body[data-tab="dashboard"] .archive-section { display: none; }

  /* DASHBOARD WIDGETS — always-expanded cards (heatmap + calendar) */
  .dash-widgets-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px;
  }
  @media (max-width: 1200px) { .dash-widgets-grid { grid-template-columns: 1fr; } }
  .dash-widget {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 18px 20px;
    transition: border-color 0.2s;
  }
  .dash-widget:hover { border-color: var(--border-bright); }
  .dash-widget-head {
    display: flex; align-items: center; justify-content: space-between;
    padding-bottom: 14px; margin-bottom: 16px;
    border-bottom: 1px solid var(--border);
  }
  .dash-widget-title {
    display: flex; align-items: center; gap: 10px;
    font-family: 'Chakra Petch', sans-serif; font-size: 16px; font-weight: 600;
    color: var(--text); letter-spacing: 0.02em;
  }
  .dash-widget-icon {
    display: inline-flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: var(--radius-sm);
    background: rgba(34, 211, 238, 0.1); border: 1px solid rgba(34, 211, 238, 0.3);
    color: var(--cyan-bright);
  }
  .dash-widget-sub {
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--text-muted);
  }
  .dash-widget-body { /* widgets fill their card naturally */ }

  /* UPCOMING DEADLINES LIST */
  .deadlines-controls { display: flex; align-items: center; gap: 14px; }
  .deadlines-windows {
    display: inline-flex; gap: 3px; padding: 3px;
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 5px;
  }
  .deadlines-window-btn {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.05em;
    padding: 5px 10px; border: none; background: transparent; color: var(--text-muted);
    cursor: pointer; border-radius: 3px; transition: background 0.15s, color 0.15s;
  }
  .deadlines-window-btn:hover { color: var(--text); }
  .deadlines-window-btn.active { background: rgba(34, 211, 238, 0.18); color: var(--cyan-bright); }
  .deadlines-row {
    display: grid;
    grid-template-columns: 100px 56px 1fr 140px 130px 24px;
    gap: 12px; align-items: center;
    padding: 9px 6px; border-bottom: 1px solid var(--border);
    cursor: pointer; transition: background 0.15s;
  }
  .deadlines-row:hover { background: rgba(34, 211, 238, 0.05); }
  .deadlines-row:last-of-type { border-bottom: none; }
  .deadlines-when {
    font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600;
    letter-spacing: 0.04em;
  }
  .deadlines-when.overdue { color: var(--st-delayed); }
  .deadlines-when.today { color: var(--st-risk); }
  .deadlines-when.soon { color: #EAB308; }
  .deadlines-when.later { color: var(--text-muted); font-weight: 500; }
  .deadlines-type-badge {
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    padding: 2px 6px; border-radius: 3px; text-align: center;
    letter-spacing: 0.06em; text-transform: uppercase;
    border: 1px solid;
  }
  .deadlines-type-badge.proj { background: rgba(34, 211, 238, 0.1); border-color: rgba(34, 211, 238, 0.3); color: var(--cyan-bright); }
  .deadlines-type-badge.bau  { background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.4); color: var(--st-delayed); }
  .deadlines-name { font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .deadlines-cat-tag {
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    padding: 2px 6px; border-radius: 3px; text-align: center;
    letter-spacing: 0.08em; text-transform: uppercase;
    border: 1px solid; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .deadlines-owner-cell { display: flex; align-items: center; gap: 7px; min-width: 0; }
  .deadlines-owner-cell .avatar { width: 18px; height: 18px; font-size: 9px; flex-shrink: 0; }
  .deadlines-owner-cell .owner-name { font-size: 11px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .deadlines-arrow { color: var(--text-muted); font-size: 12px; }
  .deadlines-empty { padding: 32px 16px; text-align: center; color: var(--text-muted); font-size: 13px; }
  .deadlines-footer {
    margin-top: 10px; padding-top: 10px;
    border-top: 1px solid var(--border);
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    color: var(--text-muted); text-align: center;
    letter-spacing: 0.08em; text-transform: uppercase;
  }
  @media (max-width: 768px) {
    .deadlines-row { grid-template-columns: 80px 1fr 24px; }
    .deadlines-row .deadlines-type-badge,
    .deadlines-row .deadlines-cat-tag,
    .deadlines-row .deadlines-owner-cell { display: none; }
  }
  .archive-toggle {
    display: flex; align-items: center; gap: 12px; cursor: pointer;
    padding: 16px 0; user-select: none; border-bottom: 1px solid var(--border);
    margin-bottom: 0; transition: margin-bottom 0.25s;
  }
  .archive-toggle.open { margin-bottom: 20px; }
  .archive-toggle-icon {
    width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--border-bright); background: var(--bg-card); color: var(--text-muted);
    font-size: 14px; transition: all 0.2s; flex-shrink: 0;
  }
  .archive-toggle:hover .archive-toggle-icon { border-color: var(--st-delayed); box-shadow: 0 0 10px rgba(239, 68, 68, 0.15); }
  .archive-toggle-chevron { transition: transform 0.25s; display: inline-block; }
  .archive-toggle.open .archive-toggle-chevron { transform: rotate(90deg); }
  .archive-toggle-title {
    font-family: 'Chakra Petch', sans-serif; font-size: 20px; font-weight: 600;
    letter-spacing: 0.02em; display: flex; align-items: center; gap: 10px; color: var(--text-muted);
  }
  .archive-toggle-title::before { content: "[ "; color: var(--text-muted); font-weight: 400; }
  .archive-toggle-title::after { content: " ]"; color: var(--text-muted); font-weight: 400; }
  .archive-toggle-sub {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-muted);
    letter-spacing: 0.08em; text-transform: uppercase; margin-left: auto;
  }
  .archive-body { display: none; animation: expandIn 0.25s ease; }
  .archive-body.open { display: block; }
  .archive-empty {
    padding: 30px 0; color: var(--text-muted); font-size: 13px; text-align: center; font-style: italic;
  }
  .archive-item {
    display: flex; align-items: center; gap: 14px; padding: 12px 16px;
    border: 1px solid var(--border); background: var(--bg-card); margin-bottom: 6px;
    transition: all 0.15s;
  }
  .archive-item:hover { border-color: var(--border-bright); }
  .archive-item-icon {
    font-size: 16px; color: var(--text-muted); flex-shrink: 0; width: 20px; text-align: center;
  }
  .archive-item-info { flex: 1; min-width: 0; }
  .archive-item-name {
    font-family: 'IBM Plex Sans', sans-serif; font-size: 14px; font-weight: 600; color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .archive-item-meta {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-muted);
    letter-spacing: 0.04em; margin-top: 3px; display: flex; gap: 12px; flex-wrap: wrap;
  }
  .archive-item-type {
    font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.1em;
    text-transform: uppercase; padding: 2px 8px; border: 1px solid; flex-shrink: 0;
  }
  .archive-item-type.project { color: var(--cyan); border-color: rgba(34, 211, 238, 0.3); }
  .archive-item-type.bau { color: var(--st-track); border-color: rgba(16, 185, 129, 0.3); }
  .archive-countdown {
    font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted);
    white-space: nowrap; flex-shrink: 0; min-width: 90px; text-align: right;
  }
  .archive-countdown.urgent { color: var(--st-delayed); }
  .archive-actions { display: flex; gap: 6px; flex-shrink: 0; }
  .archive-btn {
    padding: 6px 12px; font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.06em; cursor: pointer; border: 1px solid; transition: all 0.15s;
    background: transparent;
  }
  .archive-btn.restore {
    color: var(--st-track); border-color: rgba(16, 185, 129, 0.3);
  }
  .archive-btn.restore:hover {
    background: rgba(16, 185, 129, 0.12); border-color: var(--st-track);
  }
  .archive-btn.purge {
    color: var(--st-delayed); border-color: rgba(239, 68, 68, 0.3);
  }
  .archive-btn.purge:hover {
    background: rgba(239, 68, 68, 0.12); border-color: var(--st-delayed);
  }

  /* HEATMAP FILTER */
  .heatmap-filter {
    display: flex; align-items: center; gap: 4px; margin-bottom: 16px;
  }
  .heatmap-filter-btn {
    padding: 6px 14px; font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer;
    background: var(--bg-input); border: 1px solid var(--border); color: var(--text-muted);
    transition: all 0.15s;
  }
  .heatmap-filter-btn:hover { border-color: var(--border-bright); color: var(--text-secondary); }
  .heatmap-filter-btn.active {
    background: rgba(34, 211, 238, 0.12); border-color: var(--cyan);
    color: var(--cyan-bright); box-shadow: 0 0 10px rgba(34, 211, 238, 0.1);
  }

  /* CALENDAR VIEW */
  .calendar-section { padding: 0 0 32px; }
  .calendar-toggle {
    display: flex; align-items: center; gap: 12px; cursor: pointer;
    padding: 16px 0; user-select: none; border-bottom: 1px solid var(--border);
    margin-bottom: 0; transition: margin-bottom 0.25s;
  }
  .calendar-toggle.open { margin-bottom: 20px; }
  .calendar-toggle-icon {
    width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--border-bright); background: var(--bg-card); color: var(--cyan);
    font-size: 14px; transition: all 0.2s; flex-shrink: 0; border-radius: var(--radius-sm);
  }
  .calendar-toggle:hover .calendar-toggle-icon { border-color: var(--cyan); box-shadow: 0 0 10px var(--cyan-glow); }
  .calendar-toggle-chevron { transition: transform 0.25s; display: inline-block; }
  .calendar-toggle.open .calendar-toggle-chevron { transform: rotate(90deg); }
  .calendar-toggle-title {
    font-family: 'Chakra Petch', sans-serif; font-size: 20px; font-weight: 600;
    letter-spacing: 0.02em; display: flex; align-items: center; gap: 10px;
  }
  .calendar-toggle-title::before { content: "[ "; color: var(--cyan); font-weight: 400; }
  .calendar-toggle-title::after { content: " ]"; color: var(--cyan); font-weight: 400; }
  .calendar-toggle-sub {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-muted);
    letter-spacing: 0.08em; text-transform: uppercase; margin-left: auto;
  }
  .calendar-body { display: none; animation: expandIn 0.25s ease; }
  .calendar-body.open { display: block; }

  .cal-nav {
    display: flex; align-items: center; gap: 12px; margin-bottom: 18px;
  }
  .cal-nav-btn {
    width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
    background: var(--bg-card); border: 1px solid var(--border-bright); color: var(--text-secondary);
    cursor: pointer; transition: all 0.15s; font-size: 16px; font-family: 'JetBrains Mono', monospace;
  }
  .cal-nav-btn:hover { border-color: var(--cyan); color: var(--cyan-bright); background: rgba(34, 211, 238, 0.08); }
  .cal-nav-title {
    font-family: 'Chakra Petch', sans-serif; font-size: 22px; font-weight: 600;
    letter-spacing: 0.02em; min-width: 200px; text-align: center;
  }
  .cal-nav-today {
    padding: 6px 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px;
    letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer;
    background: transparent; border: 1px solid var(--border-bright); color: var(--text-secondary);
    transition: all 0.15s;
  }
  .cal-nav-today:hover { border-color: var(--cyan); color: var(--cyan-bright); background: rgba(34, 211, 238, 0.08); }

  .cal-grid {
    display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
  }
  .cal-day-head {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--text-muted); text-align: center; padding: 8px 4px;
    border-bottom: 1px solid var(--border);
  }
  .cal-day {
    min-height: 90px; background: var(--bg-card); border: 1px solid var(--border);
    padding: 6px; vertical-align: top; position: relative; transition: all 0.15s;
  }
  .cal-day:hover { border-color: var(--border-bright); }
  .cal-day.outside { background: var(--bg); opacity: 0.4; }
  .cal-day.today { border-color: var(--cyan); box-shadow: inset 0 0 0 1px var(--cyan), 0 0 12px rgba(34, 211, 238, 0.12); }
  .cal-day.has-overdue { border-color: rgba(239, 68, 68, 0.4); }
  .cal-day-num {
    font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600;
    color: var(--text-muted); margin-bottom: 4px;
  }
  .cal-day.today .cal-day-num { color: var(--cyan-bright); }
  .cal-day.has-overdue .cal-day-num { color: var(--st-delayed); }
  .cal-day-dot {
    position: absolute; top: 7px; right: 7px; width: 6px; height: 6px; border-radius: 50%;
  }
  .cal-day-dot.project { background: var(--cyan); box-shadow: 0 0 6px var(--cyan-glow); }
  .cal-day-dot.bau { background: var(--st-track); box-shadow: 0 0 6px rgba(16, 185, 129, 0.5); }
  .cal-day-dot.mixed { background: linear-gradient(135deg, var(--cyan) 50%, var(--st-track) 50%); }

  .cal-chip {
    display: flex; align-items: center; gap: 5px; padding: 3px 6px; margin-bottom: 2px;
    font-size: 10px; font-weight: 500; line-height: 1.3; border-left: 2px solid;
    background: rgba(255, 255, 255, 0.03); overflow: hidden; white-space: nowrap;
    text-overflow: ellipsis; transition: all 0.12s; cursor: default; max-width: 100%;
  }
  .cal-chip:hover { background: rgba(255, 255, 255, 0.07); }
  .cal-chip.project { border-left-color: var(--cyan); color: var(--text); }
  .cal-chip.bau { border-left-color: var(--st-track); color: var(--text); }
  .cal-chip.overdue { border-left-color: var(--st-delayed); color: var(--st-delayed); }
  .cal-chip .cal-chip-avatar {
    width: 14px; height: 14px; font-size: 7px; flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center;
    color: var(--bg); font-weight: 700; font-family: 'JetBrains Mono', monospace;
  }
  .cal-chip .cal-chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cal-more {
    font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--text-muted);
    padding: 2px 6px; cursor: default; letter-spacing: 0.04em;
  }

  .cal-legend {
    display: flex; align-items: center; gap: 16px; margin-top: 14px;
    font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-muted);
  }
  .cal-legend-item { display: flex; align-items: center; gap: 6px; }
  .cal-legend-swatch {
    width: 12px; height: 4px; display: inline-block;
  }
  .cal-legend-swatch.project { background: var(--cyan); }
  .cal-legend-swatch.bau { background: var(--st-track); }
  .cal-legend-swatch.overdue { background: var(--st-delayed); }
  .cal-legend-swatch.today-sw { width: 10px; height: 10px; border: 1px solid var(--cyan); background: transparent; }

  @media (max-width: 768px) {
    .cal-day { min-height: 60px; padding: 4px; }
    .cal-chip { font-size: 8px; padding: 2px 4px; }
    .cal-nav-title { font-size: 18px; min-width: 160px; }
  }

  /* Site footer (Powered by Cloudflare) */
  .site-footer {
    border-top: 1px solid var(--border);
    margin-top: 48px;
    padding: 18px 0;
    background: var(--bg);
  }
  .site-footer-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }
  .site-footer-left { color: var(--text-muted); }
  .site-footer-cf {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.2s;
  }
  .site-footer-cf svg { flex-shrink: 0; }
  .site-footer-cf strong {
    font-weight: 500;
    color: rgba(251, 191, 36, 0.85);
    letter-spacing: 0.08em;
  }
  .site-footer-cf:hover { color: var(--text); }
  .site-footer-cf:hover strong { color: rgba(251, 191, 36, 1); }
  /* Light mode: muted gray + Cloudflare amber both wash out on cream bg — darken them */
  body.theme-light .site-footer-inner { color: #6B6456; }
  body.theme-light .site-footer-left { color: #6B6456; }
  body.theme-light .site-footer-cf { color: #6B6456; }
  body.theme-light .site-footer-cf strong { color: #F38020; font-weight: 600; }
  body.theme-light .site-footer-cf:hover { color: #2A2620; }
  body.theme-light .site-footer-cf:hover strong { color: #D96A10; }

  /* PORTAL GUIDE / HELP PANEL */
  .help-overlay { position: fixed; inset: 0; background: rgba(6,11,23,0.7); z-index: 260; opacity: 0; pointer-events: none; transition: opacity 0.22s; backdrop-filter: blur(4px); }
  .help-overlay.open { opacity: 1; pointer-events: auto; }
  .help-modal {
    position: fixed; top: 50%; left: 50%; z-index: 261;
    width: calc(100% - 40px); max-width: 860px; max-height: 88vh;
    display: flex; flex-direction: column;
    transform: translate(-50%, -48%) scale(0.97); opacity: 0; pointer-events: none;
    background: var(--bg-elevated); border: 1px solid var(--cyan);
    box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(34,211,238,0.1);
    border-radius: var(--radius); overflow: hidden;
    transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.2,0.8,0.2,1);
  }
  .help-modal.open { opacity: 1; transform: translate(-50%,-50%) scale(1); pointer-events: auto; }
  .help-modal-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 24px; border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .help-modal-title { font-family: 'JetBrains Mono',monospace; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--cyan-bright); display: flex; align-items: center; gap: 10px; }
  .help-modal-version { font-size: 10px; background: rgba(34,211,238,0.1); border: 1px solid rgba(34,211,238,0.3); color: var(--cyan); padding: 2px 8px; border-radius: 20px; letter-spacing: 0.08em; }
  .help-modal-close { background: transparent; border: none; color: var(--text-muted); font-size: 18px; cursor: pointer; padding: 4px 8px; border-radius: var(--radius-sm); transition: color 0.15s, background 0.15s; }
  .help-modal-close:hover { color: var(--text); background: rgba(34,211,238,0.1); }
  .help-tabs { display: flex; gap: 4px; padding: 12px 24px; border-bottom: 1px solid var(--border); flex-shrink: 0; flex-wrap: wrap; }
  .help-tab {
    font-family: 'JetBrains Mono',monospace; font-size: 10px; letter-spacing: 0.06em;
    text-transform: uppercase; padding: 6px 12px; border-radius: 20px;
    border: 1px solid var(--border-bright); background: transparent;
    color: var(--text-muted); cursor: pointer; display: flex; align-items: center; gap: 6px;
    transition: all 0.15s;
  }
  .help-tab:hover { background: rgba(34,211,238,0.06); color: var(--text); border-color: var(--cyan); }
  .help-tab.active { background: rgba(34,211,238,0.12); color: var(--cyan-bright); border-color: var(--cyan); }
  .help-body { overflow-y: auto; padding: 22px 24px; flex: 1; }
  .help-section { display: none; }
  .help-section.show { display: block; }
  .help-section-label { font-family: 'JetBrains Mono',monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 14px; }
  .help-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px,1fr)); gap: 10px; margin-bottom: 20px; }
  .help-card {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 12px 14px; display: flex; gap: 12px; align-items: flex-start;
    transition: border-color 0.15s, background 0.15s;
  }
  .help-card:hover { border-color: var(--border-bright); background: var(--bg-elevated); }
  .help-card-icon {
    width: 30px; height: 30px; border-radius: var(--radius-sm);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px;
  }
  .help-card-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
  .help-card-desc { font-size: 12px; color: var(--text-muted); line-height: 1.55; }
  .help-tip {
    background: rgba(34,211,238,0.05); border-left: 3px solid var(--cyan);
    padding: 10px 14px; margin-bottom: 16px; font-size: 12px;
    color: var(--text-secondary); line-height: 1.5; border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }
  .help-tip strong { color: var(--cyan-bright); }
  body.theme-light .help-overlay { background: rgba(15,23,42,0.6); }
  body.theme-light .help-modal { box-shadow: 0 20px 60px rgba(15,23,42,0.2); }
  body.theme-light .help-tip { background: rgba(14,116,144,0.06); }
  @media (max-width: 640px) {
    .site-footer-inner { flex-direction: column; gap: 8px; }
    .site-footer-inner { font-size: 9px; }
  }

  ::selection { background: var(--cyan); color: var(--bg); }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border-bright); }
  ::-webkit-scrollbar-thumb:hover { background: var(--cyan); }
</style>
</head>
<body>
  <header>
    <div class="container">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-mark"><img src="https://framerusercontent.com/images/BR5THffQHeakFy160yYePuw4DF4.png?width=256&height=256" alt="SecOps Logo" /></div>
          <div class="brand-name">SecOps<span>//</span>Portal</div>
        </div>
        <div class="header-meta">
          <span class="live-indicator"><span class="live-dot"></span>LIVE</span>
          <span id="header-date"></span>
          <button class="refresh-btn" id="info-btn" onclick="toggleHelpPanel()" title="Portal guide &amp; features" aria-label="Portal guide">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <span class="refresh-label">Guide</span>
          </button>
          <button class="refresh-btn theme-toggle" id="theme-toggle" onclick="toggleTheme()" title="Switch theme" aria-label="Toggle theme">
            <svg class="theme-icon-dark" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            <svg class="theme-icon-light" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
            </svg>
            <span class="refresh-label theme-label-text">Dark</span>
          </button>
          <button class="refresh-btn" id="report-btn" onclick="generateReport()" title="Generate PPTX board report" aria-label="Generate Report">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <span class="refresh-label">Report</span>
          </button>
          <button class="refresh-btn" id="refresh-btn" onclick="refreshData({ replayAnim: true })" title="Reload data from database (Ctrl+R)" aria-label="Refresh data">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9c2.52 0 4.82 1.04 6.45 2.73"/>
              <polyline points="21 3 21 9 15 9"/>
            </svg>
            <span class="refresh-label">Refresh</span>
            <span class="refresh-time" id="refresh-time"></span>
          </button>
          <div class="secondary-brand">
            <span id="header-date-mobile" class="header-date-mobile"></span>
          </div>
        </div>
      </div>
    </div>
  </header>

  <main class="container">
    <!-- OVERDUE BANNER (projects + BAU; segments hidden individually when count = 0) -->
    <div class="overdue-banner" id="overdue-banner" role="alert">
      <span class="overdue-banner-icon">⚠</span>
      <div class="overdue-banner-segments">
        <button type="button" class="overdue-segment" id="overdue-projects-segment" onclick="clickOverdueBanner('projects')" title="View overdue projects" hidden>
          <b id="overdue-projects-count">0</b>
          <span id="overdue-projects-label">projects overdue</span>
          <span style="opacity:0.7; font-size:10px; letter-spacing:0.12em; text-transform:uppercase;">view ▸</span>
        </button>
        <span class="overdue-segment-sep" id="overdue-segment-sep" hidden>·</span>
        <button type="button" class="overdue-segment" id="overdue-bau-segment" onclick="clickOverdueBanner('bau')" title="View overdue BAU tasks" hidden>
          <b id="overdue-bau-count">0</b>
          <span id="overdue-bau-label">BAU tasks overdue</span>
          <span style="opacity:0.7; font-size:10px; letter-spacing:0.12em; text-transform:uppercase;">view ▸</span>
        </button>
      </div>
      <button type="button" class="overdue-banner-close" onclick="dismissOverdueBanner(event)" title="Hide for this session">✕</button>
    </div>

    <!-- TAB NAVIGATION -->
    <div class="tab-bar" role="tablist">
      <button type="button" class="tab-btn active" role="tab" data-tab="dashboard" onclick="switchTab('dashboard')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        Dashboard
      </button>
      <button type="button" class="tab-btn" role="tab" data-tab="projects" onclick="switchTab('projects')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        Projects <span class="tab-btn-count" id="tab-count-projects">0</span>
      </button>
      <button type="button" class="tab-btn" role="tab" data-tab="bau" onclick="switchTab('bau')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8"/><path d="M7 21.9l-4-4 4-4"/><path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/></svg>
        BAU <span class="tab-btn-count" id="tab-count-bau">0</span>
      </button>
    </div>

    <!-- TAB: DASHBOARD -->
    <div class="tab-content active" id="tab-dashboard" role="tabpanel">
    <section class="hero">
      <div class="eyebrow">Blue Team · Operations Command</div>
      <h1 class="hero-title">Sec Ops Project <em>&amp; BAU</em></h1>
      <p class="hero-sub">Unified tracking for milestone-driven security projects and recurring BAU operations. Project owners report progress per milestone; BAU tasks track recurring cadence and due dates.</p>

      <div class="kpis">
        <div class="kpi">
          <div class="kpi-label">Total Projects</div>
          <div class="kpi-value mono accent" id="kpi-total">00</div>
          <div class="kpi-trend">// active workstreams</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">On Track</div>
          <div class="kpi-value mono ok" id="kpi-track">00</div>
          <div class="kpi-trend">// healthy</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Needs Attention</div>
          <div class="kpi-value mono warn" id="kpi-attention">00</div>
          <div class="kpi-trend">// at risk / delayed</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Completed</div>
          <div class="kpi-value mono done" id="kpi-done">00</div>
          <div class="kpi-trend">// delivered</div>
        </div>
      </div>
    </section>

    <section class="breakdown">
      <div class="breakdown-grid">
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">Status Distribution</div>
            <div class="panel-meta" id="status-meta"></div>
          </div>
          <div id="status-bars"></div>
        </div>
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">Projects per Owner</div>
            <div class="panel-meta" id="owner-meta"></div>
          </div>
          <div id="owner-chart" class="donut-wrap"></div>
        </div>
      </div>
    </section>

    <!-- ============ DASHBOARD WIDGETS — stacked full-width ============ -->
    <section class="dash-widget" style="margin-bottom: 20px;">
      <div class="dash-widget-head">
        <div class="dash-widget-title">
          <span class="dash-widget-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
          </span>
          <span>Workload Heatmap</span>
        </div>
        <div class="dash-widget-sub" id="heatmap-sub">// owner × week</div>
      </div>
      <div class="dash-widget-body">
        <div id="heatmap-content"><div class="heatmap-loading"><span class="loader"></span> Loading heatmap…</div></div>
      </div>
    </section>

    <section class="dash-widget" style="margin-bottom: 32px;">
      <div class="dash-widget-head">
        <div class="dash-widget-title">
          <span class="dash-widget-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </span>
          <span>Upcoming Deadlines</span>
        </div>
        <div class="deadlines-controls">
          <div class="deadlines-windows" id="deadlines-windows" role="group" aria-label="Time window">
            <button type="button" class="deadlines-window-btn" data-days="7" onclick="setDeadlinesWindow(7)">7 days</button>
            <button type="button" class="deadlines-window-btn active" data-days="14" onclick="setDeadlinesWindow(14)">14 days</button>
            <button type="button" class="deadlines-window-btn" data-days="30" onclick="setDeadlinesWindow(30)">30 days</button>
          </div>
          <span class="dash-widget-sub" id="deadlines-sub">// next 14 days</span>
        </div>
      </div>
      <div class="dash-widget-body">
        <div id="deadlines-content"><div class="heatmap-loading"><span class="loader"></span> Loading…</div></div>
      </div>
    </section>
    </div><!-- /tab-dashboard -->

    <!-- TAB: PROJECTS -->
    <div class="tab-content" id="tab-projects" role="tabpanel">
    <!-- ============ ACTIVE PROJECTS ============ -->
    <section class="section">
      <div class="toolbar">
        <h2>Active Projects</h2>
        <div class="toolbar-controls">
          <input class="input-base search" id="search" placeholder="Search projects..." />
          <select class="input-base select" id="filter-status">
            <option value="">All statuses</option>
            <option value="On Track">On Track</option>
            <option value="At Risk">At Risk</option>
            <option value="Delayed">Delayed</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
          </select>
          <select class="input-base select" id="filter-owner">
            <option value="">All owners</option>
          </select>
          <div class="export-wrap">
            <button class="btn btn-export" onclick="toggleExportMenu('project-export-menu', event)" title="Download options">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Export
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="export-menu" id="project-export-menu">
              <button type="button" class="export-option" onclick="exportProjectsCSV()">
                <span class="export-icon">📊</span><span>CSV</span><span class="export-meta">Spreadsheet</span>
              </button>
              <button type="button" class="export-option" onclick="exportProjectsXLSX()">
                <span class="export-icon">📈</span><span>Excel</span><span class="export-meta">.xlsx</span>
              </button>
              <button type="button" class="export-option" onclick="exportProjectsPDF()">
                <span class="export-icon">📄</span><span>PDF</span><span class="export-meta">Report</span>
              </button>
            </div>
          </div>
          <button class="btn" onclick="openProjectDrawer()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>
            New Project
          </button>
        </div>
      </div>
      <div id="proj-active-filters" style="margin-bottom: 14px;">
        <div class="bau-filter-chip" id="proj-overdue-filter-chip">
          <span>⚠ Showing date-overdue only</span>
          <button type="button" class="bau-filter-chip-close" onclick="clearProjectsOverdueFilter()" title="Clear filter">✕</button>
        </div>
      </div>
      <div id="projects-table"></div>
    </section>
    </div><!-- /tab-projects -->

    <!-- TAB: BAU -->
    <div class="tab-content" id="tab-bau" role="tabpanel">
    <!-- ============ BAU OPERATIONS ============ -->
    <section class="section">
      <div class="toolbar">
        <h2>BAU Operations</h2>
        <div class="toolbar-controls">
          <input class="input-base search" id="bau-search" placeholder="Search BAU tasks..." />
          <select class="input-base select" id="bau-filter-status">
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="In Progress">In Progress</option>
            <option value="Overdue">Overdue</option>
            <option value="Paused">Paused</option>
            <option value="Completed">Completed</option>
          </select>
          <select class="input-base select" id="bau-filter-frequency">
            <option value="">All frequencies</option>
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Bi-weekly">Bi-weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Annual">Annual</option>
            <option value="Ad-hoc">Ad-hoc</option>
          </select>
          <select class="input-base select" id="bau-filter-owner">
            <option value="">All owners</option>
          </select>
          <div class="export-wrap">
            <button class="btn btn-export" onclick="toggleExportMenu('bau-export-menu', event)" title="Download options">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Export
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="export-menu" id="bau-export-menu">
              <button type="button" class="export-option" onclick="exportBauCSV()">
                <span class="export-icon">📊</span><span>CSV</span><span class="export-meta">Spreadsheet</span>
              </button>
              <button type="button" class="export-option" onclick="exportBauXLSX()">
                <span class="export-icon">📈</span><span>Excel</span><span class="export-meta">.xlsx</span>
              </button>
              <button type="button" class="export-option" onclick="exportBauPDF()">
                <span class="export-icon">📄</span><span>PDF</span><span class="export-meta">Report</span>
              </button>
            </div>
          </div>
          <button class="btn" onclick="openBauDrawer()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>
            New BAU Task
          </button>
        </div>
      </div>
      <div class="bau-summary" id="bau-summary"></div>
      <div id="bau-active-filters" style="margin-bottom: 14px;">
        <div class="bau-filter-chip" id="bau-overdue-filter-chip">
          <span>⚠ Showing date-overdue only</span>
          <button type="button" class="bau-filter-chip-close" onclick="clearOverdueFilter()" title="Clear filter">✕</button>
        </div>
      </div>
      <div id="bau-table"></div>
    </section>
    </div><!-- /tab-bau -->

    <!-- ============ ARCHIVE ============ -->
    <section class="archive-section">
      <div class="archive-toggle" id="archive-toggle" onclick="toggleArchive()">
        <div class="archive-toggle-icon"><span class="archive-toggle-chevron">▸</span></div>
        <div class="archive-toggle-title">Archive</div>
        <div class="archive-toggle-sub" id="archive-sub">// soft-deleted · auto-purge 30 days</div>
      </div>
      <div class="archive-body" id="archive-body">
        <div id="archive-content"><div class="archive-empty">No archived items.</div></div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container site-footer-inner">
      <div class="site-footer-left">SECOPS // PORTAL · v1.0</div>
      <a href="https://www.cloudflare.com/" target="_blank" rel="noopener" class="site-footer-cf" title="Built on Cloudflare Workers + D1">
        Powered by
        <svg width="14" height="14" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M21.5 17.5c.5-1.5.3-2.9-.6-3.8-.8-.9-2-1.4-3.4-1.4l-9-.1c-.2 0-.3-.1-.4-.2 0-.1 0-.3.1-.4 0-.2.2-.3.4-.3l9.1-.1c1.1-.1 2.2-.9 2.7-2l.5-1.3c.1-.1.1-.2 0-.3-.7-3.1-3.4-5.4-6.7-5.4-3 0-5.6 1.9-6.5 4.6-.7-.4-1.6-.6-2.5-.5-1.7.2-3 1.5-3.2 3.2-.1.5 0 .9.1 1.3C-.7 11.4-2 13.5-2 16c0 .2.2.4.4.4l23.7.1c.2 0 .4-.1.5-.3l-.1.1z" fill="#F78A1A"/>
          <path d="M23 16h-.7c-.1 0-.3.1-.3.2v.4c-.4 1.4-1.7 2.4-3.2 2.4H8c-.2 0-.4.2-.4.4 0 .1.1.2.1.2.2.3.5.6.8.8.1.1.2.1.3.1H19c1.4 0 2.6-.9 3-2.2v-.3c.1-.2 0-.5-.2-.6-.2 0-.4-.1-.6-.1 0 0 1.5.1 1.5.1.1 0 .2-.1.3-.2v-.6c0-.3-.2-.5-.5-.6-.2-.1-.4 0-.5 0z" fill="#FBAD41"/>
        </svg>
        <strong>CLOUDFLARE</strong>
      </a>
    </div>
  </footer>
  <div class="overlay" id="overlay-project" onclick="closeProjectDrawer()"></div>
  <div class="drawer" id="drawer-project">
    <div class="drawer-inner">
      <div class="drawer-head">
        <div class="drawer-head-main">
          <div class="drawer-breadcrumb">PROJECTS <span class="dc-arrow">›</span> <span id="p-breadcrumb-name">New Project</span></div>
          <div class="drawer-title-row">
            <h3 class="drawer-title" id="project-drawer-title">New Project</h3>
            <span class="drawer-status-pill" id="p-live-status-pill" style="display:none">ON TRACK</span>
          </div>
        </div>
        <button class="close-btn" onclick="closeProjectDrawer()" aria-label="Close (Esc)" title="Close (Esc)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="drawer-tabs">
        <button type="button" class="drawer-tab active" data-tab="p-details" onclick="switchDrawerTab('p', 'details')">▸ Details</button>
        <button type="button" class="drawer-tab" data-tab="p-subtasks" onclick="switchDrawerTab('p', 'subtasks')">▸ Sub-tasks <span class="drawer-tab-badge" id="p-subtask-tab-badge">0/0</span></button>
      </div>
      <form id="project-form" onsubmit="saveProject(event)">
        <input type="hidden" id="p-id" />
        <div class="drawer-tab-panel active" id="p-tab-details">
          <!-- Smart suggestions (populated by renderProjectHints; hidden when no hints) -->
          <div id="p-hints-wrap" style="display: none;"></div>
          <div class="drawer-section">
            <div class="drawer-section-label">// CORE</div>
            <div class="form-group">
              <label class="form-label">Project Name</label>
              <input class="form-input" id="p-name" required maxlength="200" placeholder="e.g., PAM Platform Rollout" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Primary PIC</label>
                <input class="form-input" id="p-owner" required maxlength="100" placeholder="Team member name" />
              </div>
              <div class="form-group">
                <label class="form-label">Secondary PIC <span style="color: var(--text-muted); font-weight: normal;">(optional)</span></label>
                <input class="form-input" id="p-secondary-owner" maxlength="100" placeholder="Backup team member" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-select" id="p-category" required onchange="handleProjectCategoryChange()">
                  <option value="Network Security">Network Security</option>
                  <option value="Web & Application Security">Web &amp; Application Security</option>
                  <option value="Identity & Access Management">Identity &amp; Access Management</option>
                  <option value="Endpoint & Email Security">Endpoint &amp; Email Security</option>
                  <option value="Cloud Security">Cloud Security</option>
                  <option value="Mobile Security">Mobile Security</option>
                  <option value="Security Operations">Security Operations</option>
                  <option value="Compliance & Audit">Compliance &amp; Audit</option>
                  <option value="__OTHER__">Other (specify)</option>
                </select>
                <div class="custom-cat-wrap" id="p-custom-cat-wrap">
                  <input class="form-input" id="p-category-custom" maxlength="50" placeholder="Enter category name" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Tool</label>
                <select class="form-select" id="p-tool" onchange="handleProjectToolChange()">
                </select>
                <div class="custom-cat-wrap" id="p-custom-tool-wrap">
                  <input class="form-input" id="p-tool-custom" maxlength="100" placeholder="Enter tool name" />
                </div>
              </div>
            </div>
          </div>

          <div class="drawer-section">
            <div class="drawer-section-label">// STATUS</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Current Phase</label>
                <select class="form-select" id="p-phase" required>
                  <option value="Planning">Planning</option>
                  <option value="Design">Design</option>
                  <option value="Implementation">Implementation</option>
                  <option value="Testing">Testing</option>
                  <option value="Deployment">Deployment</option>
                  <option value="Closure">Closure</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Status</label>
                <select class="form-select" id="p-status" required onchange="updateLiveStatusPill('project')">
                  <option value="On Track">On Track</option>
                  <option value="At Risk">At Risk</option>
                  <option value="Delayed">Delayed</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Progress (%) <span class="slider-readout" id="p-progress-readout">0%</span></label>
              <div class="slider-row">
                <input class="form-slider" type="range" id="p-progress" min="0" max="100" value="0" step="1" oninput="onProgressSliderChange('p')" />
                <input class="form-input slider-number" type="number" id="p-progress-num" min="0" max="100" value="0" oninput="onProgressNumChange('p')" aria-label="Progress percentage" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Target Date</label>
              <input class="form-input" type="date" id="p-target" />
            </div>
          </div>

          <div class="drawer-section">
            <div class="drawer-section-label">// MILESTONES</div>
            <div class="form-group">
              <label class="form-label">Latest Milestone Completed</label>
              <input class="form-input" id="p-last-milestone" maxlength="300" placeholder="e.g., Discovery scan completed across DC environment" />
            </div>
            <div class="form-group">
              <label class="form-label">Next Milestone</label>
              <input class="form-input" id="p-next-milestone" maxlength="300" placeholder="e.g., User onboarding for Tier-1 admins" />
            </div>
          </div>

          <div class="drawer-section">
            <div class="drawer-section-label">// CHALLENGES &amp; NOTES</div>
            <div class="form-group">
              <label class="form-label">Challenges</label>
              <textarea class="form-textarea" id="p-challenges" maxlength="2000" placeholder="Current challenges, obstacles, or risks to delivery..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Notes / Risks</label>
              <textarea class="form-textarea" id="p-notes" maxlength="2000" placeholder="Blockers, dependencies, context for the team..."></textarea>
            </div>
          </div>
        </div>

        <div class="drawer-tab-panel" id="p-tab-subtasks">
          <div class="subtask-section" id="p-subtask-section">
            <div class="subtask-header">
              <div class="subtask-title-label">Sub-tasks <span class="subtask-count-pill zero" id="p-subtask-count">0 / 0 ✓</span></div>
              <button type="button" class="subtask-add-btn" onclick="addSubtaskRow('project')">+ Add</button>
            </div>
            <div class="subtask-list" id="p-subtask-list"></div>
          </div>
        </div>

        <div class="form-actions drawer-footer">
          <button type="button" class="btn btn-danger" id="p-delete-btn" onclick="deleteProject()" style="display:none;">Delete</button>
          <button type="button" class="btn btn-ghost" onclick="closeProjectDrawer()">Cancel</button>
          <button type="submit" class="btn" id="p-save-btn">Save</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ============ BAU DRAWER ============ -->
  <div class="overlay" id="overlay-bau" onclick="closeBauDrawer()"></div>

  <!-- ============ PORTAL GUIDE / HELP PANEL ============ -->
  <div class="help-overlay" id="help-overlay" onclick="closeHelpPanel()"></div>
  <div class="help-modal" id="help-modal" role="dialog" aria-modal="true" aria-label="Portal guide">
    <div class="help-modal-head">
      <div class="help-modal-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        // PORTAL GUIDE &amp; FEATURES
        <span class="help-modal-version">v1.0</span>
      </div>
      <button type="button" class="help-modal-close" onclick="closeHelpPanel()" aria-label="Close">✕</button>
    </div>
    <div class="help-tabs" id="help-tabs">
      <button class="help-tab active" data-sec="dashboard">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        Dashboard
      </button>
      <button class="help-tab" data-sec="projects">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        Projects
      </button>
      <button class="help-tab" data-sec="bau">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8"/><path d="M7 21.9l-4-4 4-4"/><path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/></svg>
        BAU
      </button>
      <button class="help-tab" data-sec="inline">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Inline editing
      </button>
      <button class="help-tab" data-sec="exports">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v12M7 11l5 5 5-5M5 21h14"/></svg>
        Exports
      </button>
      <button class="help-tab" data-sec="archive">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
        Archive
      </button>
    </div>
    <div class="help-body" id="help-body">

      <div class="help-section show" id="hsec-dashboard">
        <div class="help-section-label">// DASHBOARD OVERVIEW</div>
        <div class="help-tip"><strong>Navigation:</strong> the portal has three tabs — <strong>Dashboard</strong>, <strong>Projects</strong>, and <strong>BAU</strong>. Default is Dashboard. The URL reflects the active tab (<code>?tab=projects</code>) so refresh and bookmarks keep you in the right place. Filters and search persist when you switch tabs.</div>
        <div class="help-grid">
          <div class="help-card"><div class="help-card-icon" style="background:rgba(34,211,238,0.1);color:var(--cyan-bright);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="9" height="9"/><rect x="13" y="3" width="9" height="9"/><rect x="2" y="13" width="9" height="9"/><rect x="13" y="13" width="9" height="9"/></svg></div><div><div class="help-card-title">KPI cards</div><div class="help-card-desc">Total projects, on track, needs attention, completed. Numbers count up on load and on manual refresh.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(16,185,129,0.1);color:var(--st-track);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div><div><div class="help-card-title">Status distribution</div><div class="help-card-desc">Horizontal bars showing project count by status. Bars grow from zero on first load and on refresh.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(245,158,11,0.1);color:var(--st-risk);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg></div><div><div class="help-card-title">Projects per owner</div><div class="help-card-desc">Donut chart showing workload by team member. Wedges animate in one by one on first load and refresh.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(139,92,246,0.1);color:#A78BFA;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div><div><div class="help-card-title">Workload heatmap</div><div class="help-card-desc">Full-width grid showing owner workload across the next 9 weeks. Toggle All / Projects / BAU and include Secondary PIC from the panel controls.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(34,211,238,0.1);color:var(--cyan-bright);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><div class="help-card-title">Upcoming deadlines</div><div class="help-card-desc">Unified list of project target dates and BAU next-due dates. Toggle 7 / 14 / 30 day window. Click any row to open its drawer. Color-coded by urgency.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(239,68,68,0.1);color:var(--st-delayed);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div><div class="help-card-title">Overdue banner</div><div class="help-card-desc">Sits above all tabs. Shows separate counts for overdue <strong>projects</strong> and overdue <strong>BAU tasks</strong>. Click either segment to jump to that tab with the overdue filter applied. Dismiss for the session with ✕.</div></div></div>
        </div>
      </div>

      <div class="help-section" id="hsec-projects">
        <div class="help-section-label">// PROJECTS TABLE</div>
        <div class="help-grid">
          <div class="help-card"><div class="help-card-icon" style="background:rgba(34,211,238,0.1);color:var(--cyan-bright);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div><div><div class="help-card-title">Expand row</div><div class="help-card-desc">Click any row to expand — shows milestones, challenges, notes, sub-tasks, and recent audit history.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(16,185,129,0.1);color:var(--st-track);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="4"/><polyline points="6 10 12 4 18 10"/></svg></div><div><div class="help-card-title">Progress bar</div><div class="help-card-desc">Color-coded by urgency (status + target date). Click the bar to update progress inline — slider, number input, and quick presets.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(245,158,11,0.1);color:var(--st-risk);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div><div class="help-card-title">Smart suggestions</div><div class="help-card-desc">Amber hints in the drawer when something looks off — stale "On Track", target date passed, progress ahead of phase.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(139,92,246,0.1);color:#A78BFA;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></div><div><div class="help-card-title">Duplicate</div><div class="help-card-desc">Click ⋯ on any row → Duplicate. Opens drawer pre-filled — review and save to create a new project.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(239,68,68,0.1);color:var(--st-delayed);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg></div><div><div class="help-card-title">Delete (soft)</div><div class="help-card-desc">Click ⋯ → Delete or use the drawer button. Moves to archive — restorable within 30 days.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(34,211,238,0.1);color:var(--cyan-bright);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></div><div><div class="help-card-title">Sub-tasks</div><div class="help-card-desc">Add granular tasks inside a project via the drawer. X/Y badge shows completion in the table.</div></div></div>
        </div>
      </div>

      <div class="help-section" id="hsec-bau">
        <div class="help-section-label">// BAU OPERATIONS TABLE</div>
        <div class="help-grid">
          <div class="help-card"><div class="help-card-icon" style="background:rgba(239,68,68,0.1);color:var(--st-delayed);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><div class="help-card-title">Overdue detection</div><div class="help-card-desc">Tasks past their next due date are automatically flagged by date — not by stored status. Red chip shows the live count.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(34,211,238,0.1);color:var(--cyan-bright);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8"/><path d="M7 21.9l-4-4 4-4"/><path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/></svg></div><div><div class="help-card-title">Ongoing tasks</div><div class="help-card-desc">Toggle "Mark as ongoing" for tasks with no fixed due date. Shows an Ongoing pill instead of a date.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(16,185,129,0.1);color:var(--st-track);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div><div class="help-card-title">Last &amp; next due inline</div><div class="help-card-desc">Click either date cell directly in the table to update it. Next due also has an Ongoing toggle in the picker.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(245,158,11,0.1);color:var(--st-risk);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg></div><div><div class="help-card-title">Filters</div><div class="help-card-desc">Filter by status, frequency, owner, or search by name/category. The Overdue filter uses date-based logic.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(139,92,246,0.1);color:#A78BFA;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></div><div><div class="help-card-title">Duplicate</div><div class="help-card-desc">Click ⋯ → Duplicate. Copies category, tool, owner, frequency. Resets dates and challenges for a clean start.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(34,211,238,0.1);color:var(--cyan-bright);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div><div><div class="help-card-title">Audit log</div><div class="help-card-desc">Expand any row → Recent Activity to see every field change with who made it and when.</div></div></div>
        </div>
      </div>

      <div class="help-section" id="hsec-inline">
        <div class="help-section-label">// INLINE EDITING — NO DRAWER NEEDED</div>
        <div class="help-tip"><strong>How it works:</strong> hover any editable cell to see it highlight, then click to open a picker. Changes save immediately and appear in the audit log.</div>
        <div class="help-grid">
          <div class="help-card"><div class="help-card-icon" style="background:rgba(34,211,238,0.1);color:var(--cyan-bright);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg></div><div><div class="help-card-title">Status</div><div class="help-card-desc">Projects and BAU. Click the status pill to pick a new status. Color updates immediately.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(34,211,238,0.1);color:var(--cyan-bright);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div><div class="help-card-title">Primary owner</div><div class="help-card-desc">Projects and BAU. Click the owner name to reassign. Choose from existing owners or open the drawer to type a new name.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(245,158,11,0.1);color:var(--st-risk);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"/></svg></div><div><div class="help-card-title">Phase</div><div class="help-card-desc">Projects only. Click the phase cell to advance or change the lifecycle stage — ordered Planning to Closure.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(16,185,129,0.1);color:var(--st-track);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="4"/><polyline points="6 10 12 4 18 10"/></svg></div><div><div class="help-card-title">Progress</div><div class="help-card-desc">Projects only. Click the progress bar for a slider + number input + quick presets (0 / 25 / 50 / 75 / 90 / 100%).</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(139,92,246,0.1);color:#A78BFA;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8"/></svg></div><div><div class="help-card-title">Frequency</div><div class="help-card-desc">BAU only. Click the frequency pill — Daily, Weekly, Bi-weekly, Monthly, Quarterly, Annual, Ad-hoc.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(239,68,68,0.1);color:var(--st-delayed);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg></div><div><div class="help-card-title">Priority</div><div class="help-card-desc">BAU only. Click the priority pill — Critical, High, Medium, Low. Dot color matches the priority level.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(59,130,246,0.1);color:#60A5FA;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div><div class="help-card-title">Last performed &amp; next due</div><div class="help-card-desc">BAU only. Click either date cell for a date picker. Next due also lets you toggle Ongoing.</div></div></div>
        </div>
      </div>

      <div class="help-section" id="hsec-exports">
        <div class="help-section-label">// EXPORT &amp; REPORTS</div>
        <div class="help-tip"><strong>All exports</strong> use the currently filtered data — apply filters first to export a focused view.</div>
        <div class="help-grid">
          <div class="help-card"><div class="help-card-icon" style="background:rgba(16,185,129,0.1);color:var(--st-track);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg></div><div><div class="help-card-title">CSV</div><div class="help-card-desc">Downloads all filtered rows as a CSV. Injection-protected — safe to open directly in Excel.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(16,185,129,0.1);color:var(--st-track);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg></div><div><div class="help-card-title">Excel (.xlsx)</div><div class="help-card-desc">Formatted spreadsheet with headers and column widths. Built with SheetJS — no server processing.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(239,68,68,0.1);color:var(--st-delayed);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div><div class="help-card-title">PDF</div><div class="help-card-desc">Formatted table report generated client-side with jsPDF — includes category badges and status pills.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(245,158,11,0.1);color:var(--st-risk);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div><div><div class="help-card-title">Board report (PPT)</div><div class="help-card-desc">Corporate-style PowerPoint. Smart-filtered: excludes Completed/Paused, sorts by urgency, caps at top 6 projects + 5 BAU.</div></div></div>
        </div>
      </div>

      <div class="help-section" id="hsec-archive">
        <div class="help-section-label">// ARCHIVE &amp; RECOVERY</div>
        <div class="help-tip"><strong>Nothing is permanently deleted immediately.</strong> All deletes go to archive first and are held for 30 days before automatic purge.</div>
        <div class="help-grid">
          <div class="help-card"><div class="help-card-icon" style="background:rgba(148,163,184,0.1);color:var(--text-secondary);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg></div><div><div class="help-card-title">Soft delete</div><div class="help-card-desc">Delete from the ⋯ row menu or the drawer. Item disappears from the main table but is not gone yet.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(16,185,129,0.1);color:var(--st-track);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/></svg></div><div><div class="help-card-title">Restore</div><div class="help-card-desc">Open the archive panel from the header. Any item can be restored to the active list within 30 days.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(239,68,68,0.1);color:var(--st-delayed);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><div class="help-card-title">Auto-purge</div><div class="help-card-desc">A scheduled job runs daily at 2 AM UTC and permanently deletes anything archived for more than 30 days.</div></div></div>
          <div class="help-card"><div class="help-card-icon" style="background:rgba(59,130,246,0.1);color:#60A5FA;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg></div><div><div class="help-card-title">Audit log preserved</div><div class="help-card-desc">When an item is purged, its audit log and sub-tasks are cleaned up automatically by the same job.</div></div></div>
        </div>
      </div>

    </div>
  </div>

  <div class="drawer" id="drawer-bau">
    <div class="drawer-inner">
      <div class="drawer-head">
        <div class="drawer-head-main">
          <div class="drawer-breadcrumb">BAU <span class="dc-arrow">›</span> <span id="b-breadcrumb-name">New BAU Task</span></div>
          <div class="drawer-title-row">
            <h3 class="drawer-title" id="bau-drawer-title">New BAU Task</h3>
            <span class="drawer-status-pill" id="b-live-status-pill" style="display:none">ACTIVE</span>
          </div>
        </div>
        <button class="close-btn" onclick="closeBauDrawer()" aria-label="Close (Esc)" title="Close (Esc)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="drawer-tabs">
        <button type="button" class="drawer-tab active" data-tab="b-details" onclick="switchDrawerTab('b', 'details')">▸ Details</button>
        <button type="button" class="drawer-tab" data-tab="b-subtasks" onclick="switchDrawerTab('b', 'subtasks')">▸ Sub-tasks <span class="drawer-tab-badge" id="b-subtask-tab-badge">0/0</span></button>
      </div>
      <form id="bau-form" onsubmit="saveBau(event)">
        <input type="hidden" id="b-id" />
        <div class="drawer-tab-panel active" id="b-tab-details">
          <div class="drawer-section">
            <div class="drawer-section-label">// CORE</div>
            <div class="form-group">
              <label class="form-label">Task Name</label>
              <input class="form-input" id="b-name" required maxlength="200" placeholder="e.g., Weekly Vulnerability Scan" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Primary PIC</label>
                <input class="form-input" id="b-owner" required maxlength="100" placeholder="Team member name" />
              </div>
              <div class="form-group">
                <label class="form-label">Secondary PIC <span style="color: var(--text-muted); font-weight: normal;">(optional)</span></label>
                <input class="form-input" id="b-secondary-owner" maxlength="100" placeholder="Backup team member" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-select" id="b-category" required onchange="handleBauCategoryChange()">
                  <option value="Network Security">Network Security</option>
                  <option value="Web & Application Security">Web &amp; Application Security</option>
                  <option value="Identity & Access Management">Identity &amp; Access Management</option>
                  <option value="Endpoint & Email Security">Endpoint &amp; Email Security</option>
                  <option value="Cloud Security">Cloud Security</option>
                  <option value="Mobile Security">Mobile Security</option>
                  <option value="Security Operations">Security Operations</option>
                  <option value="Compliance & Audit">Compliance &amp; Audit</option>
                  <option value="__OTHER__">Other (specify)</option>
                </select>
                <div class="custom-cat-wrap" id="b-custom-cat-wrap">
                  <input class="form-input" id="b-category-custom" maxlength="50" placeholder="Enter category name" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Tool</label>
                <select class="form-select" id="b-tool" onchange="handleBauToolChange()">
                </select>
                <div class="custom-cat-wrap" id="b-custom-tool-wrap">
                  <input class="form-input" id="b-tool-custom" maxlength="100" placeholder="Enter tool name" />
                </div>
              </div>
            </div>
          </div>

          <div class="drawer-section">
            <div class="drawer-section-label">// STATUS</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Frequency</label>
                <select class="form-select" id="b-frequency" required>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Bi-weekly">Bi-weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Annual">Annual</option>
                  <option value="Ad-hoc">Ad-hoc</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Priority</label>
                <select class="form-select" id="b-priority" required>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium" selected>Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select class="form-select" id="b-status" required onchange="updateLiveStatusPill('bau')">
                <option value="Active">Active</option>
                <option value="In Progress">In Progress</option>
                <option value="Overdue">Overdue</option>
                <option value="Paused">Paused</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div class="drawer-section">
            <div class="drawer-section-label">// SCHEDULE</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Last Performed</label>
                <input class="form-input" type="date" id="b-last-performed" />
              </div>
              <div class="form-group">
                <label class="form-label">Next Due</label>
                <div class="ongoing-toggle">
                  <label class="toggle-row"><input type="checkbox" id="b-is-ongoing" onchange="handleOngoingToggle()" /><span>Ongoing (no specific due date)</span></label>
                </div>
                <input class="form-input" type="date" id="b-next-due" />
              </div>
            </div>
          </div>

          <div class="drawer-section">
            <div class="drawer-section-label">// CHALLENGES &amp; NOTES</div>
            <div class="form-group">
              <label class="form-label">Challenges</label>
              <textarea class="form-textarea" id="b-challenges" maxlength="2000" placeholder="Current challenges or risks for this task..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Notes</label>
              <textarea class="form-textarea" id="b-notes" maxlength="2000" placeholder="Procedure notes, escalation contacts, recent issues..."></textarea>
            </div>
          </div>
        </div>

        <div class="drawer-tab-panel" id="b-tab-subtasks">
          <div class="subtask-section" id="b-subtask-section">
            <div class="subtask-header">
              <div class="subtask-title-label">Sub-tasks <span class="subtask-count-pill zero" id="b-subtask-count">0 / 0 ✓</span></div>
              <button type="button" class="subtask-add-btn" onclick="addSubtaskRow('bau')">+ Add</button>
            </div>
            <div class="subtask-list" id="b-subtask-list"></div>
          </div>
        </div>

        <div class="form-actions drawer-footer">
          <button type="button" class="btn btn-danger" id="b-delete-btn" onclick="deleteBau()" style="display:none;">Delete</button>
          <button type="button" class="btn btn-ghost" onclick="closeBauDrawer()">Cancel</button>
          <button type="submit" class="btn" id="b-save-btn">Save</button>
        </div>
      </form>
    </div>
  </div>

  <div class="toast" id="toast"></div>

<script>
// ============== CONFIG ==============
const PREVIEW_MODE = true;
const PROJ_KEY = 'secops_projects_v3';
const BAU_KEY  = 'secops_bau_v1';

const PROJ_PREDEFINED_CATS = ['Network Security', 'Web & Application Security', 'Identity & Access Management', 'Endpoint & Email Security', 'Cloud Security', 'Mobile Security', 'Security Operations', 'Compliance & Audit'];
const TOOL_MAP = {
  'Network Security': ['Next-Gen Firewall', 'IPS / IDS', 'DDoS Protection'],
  'Web & Application Security': ['WAF', 'CDN / Reverse Proxy'],
  'Identity & Access Management': ['PAM', 'MFA', 'SSO / IdP'],
  'Endpoint & Email Security': ['EDR', 'Email Security Gateway', 'Disk Encryption'],
  'Cloud Security': ['CNAPP', 'CSPM'],
  'Mobile Security': ['MDM', 'Mobile Threat Defense'],
  'Security Operations': ['SIEM / XDR', 'SOAR'],
  'Compliance & Audit': ['Config Audit', 'GRC Platform'],
};
const BAU_PREDEFINED_CATS = PROJ_PREDEFINED_CATS; // BAU uses same categories as Projects
const BAU_TOOL_MAP = TOOL_MAP;                    // BAU uses same tools as Projects

// Owner color palette (deterministic by hash)
const OWNER_PALETTE = ['#22D3EE', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#0EA5E9', '#A78BFA', '#F472B6'];

// ============== DATA LAYER ==============
const api = {
  async list(resource) {
    if (PREVIEW_MODE) {
      const key = resource === 'projects' ? PROJ_KEY : BAU_KEY;
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
      return resource === 'projects' ? seedProjects() : seedBau();
    }
    const r = await fetch('/api/' + resource);
    if (!r.ok) throw new Error('Failed to load ' + resource);
    return r.json();
  },
  async save(resource, item) {
    if (PREVIEW_MODE) {
      const key = resource === 'projects' ? PROJ_KEY : BAU_KEY;
      const all = await this.list(resource);
      if (item.id) {
        const idx = all.findIndex(p => p.id === item.id);
        if (idx >= 0) all[idx] = { ...all[idx], ...item, updated_at: new Date().toISOString() };
      } else {
        item.id = crypto.randomUUID();
        item.created_at = new Date().toISOString();
        item.updated_at = item.created_at;
        all.push(item);
      }
      localStorage.setItem(key, JSON.stringify(all));
      return item;
    }
    const method = item.id ? 'PUT' : 'POST';
    const url = item.id ? '/api/' + resource + '/' + item.id : '/api/' + resource;
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Save failed'); }
    return r.json();
  },
  async remove(resource, id) {
    if (PREVIEW_MODE) {
      const key = resource === 'projects' ? PROJ_KEY : BAU_KEY;
      const all = await this.list(resource);
      localStorage.setItem(key, JSON.stringify(all.filter(p => p.id !== id)));
      return true;
    }
    const r = await fetch('/api/' + resource + '/' + id, { method: 'DELETE' });
    if (!r.ok) throw new Error('Delete failed');
    return true;
  }
};

function seedProjects() {
  const now = new Date();
  const ago = (d) => new Date(now.getTime() - d * 86400000).toISOString();
  const sample = [
    { id: crypto.randomUUID(), name: 'PAM Platform Rollout', owner: 'Viki', category: 'PAM', phase: 'Implementation', status: 'On Track', progress: 65, target_date: '2026-07-30', last_milestone: 'Core deployment completed across environments', next_milestone: 'User onboarding for Tier-1 admins', notes: 'Coordinating with infra team for the next rollout window.', created_at: ago(45), updated_at: ago(1) },
    { id: crypto.randomUUID(), name: 'Cloudflare Zero Trust Rollout', owner: 'Alex', category: 'Cloudflare', phase: 'Design', status: 'On Track', progress: 30, target_date: '2026-09-15', last_milestone: 'Architecture review signed off', next_milestone: 'Pilot group access policy draft', notes: '', created_at: ago(20), updated_at: ago(3) },
    { id: crypto.randomUUID(), name: 'Palo Alto Cortex XDR Refresh', owner: 'Priya', category: 'Antivirus (Palo Alto)', phase: 'Testing', status: 'At Risk', progress: 55, target_date: '2026-06-20', last_milestone: 'Pilot with finance team complete', next_milestone: 'Helpdesk training', notes: 'Two service accounts still pending mapping.', created_at: ago(60), updated_at: ago(2) },
    { id: crypto.randomUUID(), name: 'Firewall Ruleset Audit', owner: 'Marcus', category: 'Network Security', phase: 'Closure', status: 'Completed', progress: 100, target_date: '2026-04-30', last_milestone: 'Audit report delivered to leadership', next_milestone: 'N/A', notes: 'Closed.', created_at: ago(90), updated_at: ago(15) },
    { id: crypto.randomUUID(), name: 'MFA Coverage Expansion', owner: 'Jenny', category: 'Identity', phase: 'Implementation', status: 'Delayed', progress: 40, target_date: '2026-06-01', last_milestone: 'Pilot deployment on IT laptops', next_milestone: 'Phased rollout to sales region', notes: 'Held up by image rebuild in MDM.', created_at: ago(70), updated_at: ago(5) },
    { id: crypto.randomUUID(), name: 'SOC Runbook Refresh', owner: 'Sam', category: 'Incident Response', phase: 'Planning', status: 'On Hold', progress: 10, target_date: '2026-12-01', last_milestone: 'Scoping kickoff', next_milestone: 'Playbook inventory', notes: 'On hold pending audit window.', created_at: ago(30), updated_at: ago(10) },
    { id: crypto.randomUUID(), name: 'Endpoint Hardening Baseline', owner: 'Viki', category: 'Endpoint', phase: 'Design', status: 'On Track', progress: 25, target_date: '2026-08-15', last_milestone: 'CIS benchmark comparison done', next_milestone: 'GPO draft for review', notes: '', created_at: ago(15), updated_at: ago(4) },
  ];
  localStorage.setItem(PROJ_KEY, JSON.stringify(sample));
  return sample;
}

function seedBau() {
  const now = new Date();
  const ago = (d) => new Date(now.getTime() - d * 86400000).toISOString();
  const ahead = (d) => { const x = new Date(now); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
  const past = (d) => { const x = new Date(now); x.setDate(x.getDate() - d); return x.toISOString().slice(0, 10); };
  const sample = [
    { id: crypto.randomUUID(), name: 'Daily SIEM Alert Triage', owner: 'Viki', category: 'SOC Monitoring', frequency: 'Daily', priority: 'Critical', status: 'Active', last_performed: past(0), next_due: ahead(0), notes: 'Review overnight alerts, escalate Tier-2 findings.', created_at: ago(90), updated_at: ago(0) },
    { id: crypto.randomUUID(), name: 'Weekly Vulnerability Scan Review', owner: 'Priya', category: 'Vulnerability Management', frequency: 'Weekly', priority: 'High', status: 'Active', last_performed: past(3), next_due: ahead(4), notes: 'Tenable.io scan results, prioritize CVSS 7+.', created_at: ago(120), updated_at: ago(3) },
    { id: crypto.randomUUID(), name: 'Monthly Patch Compliance Report', owner: 'Marcus', category: 'Patch Management', frequency: 'Monthly', priority: 'High', status: 'Overdue', last_performed: past(40), next_due: past(10), notes: 'WSUS + Intune coverage. Need to chase server team.', created_at: ago(180), updated_at: ago(2) },
    { id: crypto.randomUUID(), name: 'Quarterly Privileged Access Review', owner: 'Alex', category: 'Access Review', frequency: 'Quarterly', priority: 'Critical', status: 'In Progress', last_performed: past(80), next_due: ahead(10), notes: 'PAM + directory group audit. Coordinate with HR for terminations.', created_at: ago(200), updated_at: ago(1) },
    { id: crypto.randomUUID(), name: 'Daily Backup Verification', owner: 'Jenny', category: 'Backup & Recovery', frequency: 'Daily', priority: 'High', status: 'Active', last_performed: past(0), next_due: ahead(0), notes: 'Veeam dashboard check. Failed jobs logged to ticket.', created_at: ago(150), updated_at: ago(0) },
    { id: crypto.randomUUID(), name: 'ISO 27001 Evidence Collection', owner: 'Sam', category: 'Audit & Compliance', frequency: 'Quarterly', priority: 'Medium', status: 'Active', last_performed: past(60), next_due: ahead(30), notes: 'Quarterly evidence package for control owners.', created_at: ago(300), updated_at: ago(5) },
    { id: crypto.randomUUID(), name: 'Weekly Threat Intel Brief', owner: 'Viki', category: 'SOC Monitoring', frequency: 'Weekly', priority: 'Medium', status: 'Active', last_performed: past(2), next_due: ahead(5), notes: 'Summarize Recorded Future / MISP feeds for team standup.', created_at: ago(100), updated_at: ago(2) },
  ];
  localStorage.setItem(BAU_KEY, JSON.stringify(sample));
  return sample;
}

// ============== STATE ==============
let allProjects = [];
let allBau = [];
// True until the dashboard has rendered once. Entry animations (KPI count-up, chart grow)
// fire only on this first render, then are suppressed so refreshes/inline edits don't re-trigger them.
let dashboardEntryAnimated = false;
let allSubtasks = [];
let editingProjectId = null;
let editingBauId = null;
// Sub-task buffer for the currently-open drawer
let drawerSubtasks = { project: [], bau: [] };
// Track which sub-tasks have been edited but not yet saved (debounce on blur)
let pendingSubtaskSaves = {};

// Date-overdue filter mode for BAU (toggled by the overdue banner)
// True = show only tasks whose next_due is in the past AND status is not Completed/Paused AND is_ongoing is false
let bauOverdueOnly = false;
let projectsOverdueOnly = false;
// Session-only dismiss flag for the overdue banner (cleared on page reload by design)
let overdueBannerDismissed = false;

// ============== HELPERS ==============
function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toggleExpand(id) {
  const row = document.querySelector('tr.data-row[data-id="' + id + '"]');
  const expand = document.getElementById('expand-' + id);
  if (!row || !expand) return;
  const open = row.classList.toggle('expanded');
  expand.classList.toggle('open', open);
  // Recent Activity no longer auto-loads — user clicks the "Recent Activity" header to expand it.
}

// Builds the read-only inline sub-task list shown when a project/BAU row is expanded.
// Returns '' if the parent has no sub-tasks.
function renderSubtaskInlineList(parentType, parentId) {
  const items = (allSubtasks || []).filter(s => s.parent_type === parentType && s.parent_id === parentId);
  if (items.length === 0) return '';
  const total = items.length;
  const done = items.filter(s => s.status === 'Completed').length;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const countCls = (done === total ? ' complete' : '');
  let html = '<div class="expand-field full-width">';
  html += '<div class="expand-field-label">Sub-tasks <span class="subtask-inline-count' + countCls + '">' + done + ' / ' + total + ' ✓</span></div>';
  html += '<div class="subtask-inline-list">';
  items.forEach(s => {
    const stCls = s.status === 'Completed' ? 'completed' : s.status === 'In Progress' ? 'in-progress' : '';
    const rowCls = s.status === 'Completed' ? ' completed' : '';
    const isOverdue = s.due_date && s.status !== 'Completed' && new Date(s.due_date) < today;
    html += '<div class="subtask-inline-row' + rowCls + '">';
    html += '<span class="subtask-inline-status ' + stCls + '"></span>';
    html += '<span class="subtask-inline-title">' + escapeHtml(s.title || '(untitled)') + '</span>';
    html += '<span class="subtask-inline-owner">' + escapeHtml(s.owner || '—') + '</span>';
    html += '<span class="subtask-inline-due' + (isOverdue ? ' overdue' : '') + '">' + escapeHtml(s.due_date || '') + '</span>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

// Collapsible audit drawer inside expanded rows.
// First click loads + reveals; subsequent clicks just toggle visibility (cached).
function toggleAuditSection(type, id, headerEl) {
  const container = document.getElementById('audit-' + type + '-' + id);
  if (!container) return;
  const wasCollapsed = container.classList.contains('collapsed');
  container.classList.toggle('collapsed');
  if (headerEl) headerEl.classList.toggle('expanded', wasCollapsed);
  // Lazy-load on first expand
  if (wasCollapsed) {
    const hint = headerEl ? headerEl.querySelector('.audit-toggle-hint') : null;
    if (hint) hint.textContent = '';
    loadAudit(type, id);
  }
}

// ============== AUDIT LOG UI ==============
const auditCache = {};

async function loadAudit(type, id) {
  const containerId = 'audit-' + type + '-' + id;
  const container = document.getElementById(containerId);
  if (!container) return;

  // Skip if already loaded (not placeholder)
  const cacheKey = type + ':' + id;
  if (auditCache[cacheKey]) {
    container.innerHTML = renderAuditEntries(auditCache[cacheKey]);
    return;
  }

  // Show loading
  container.innerHTML = '<div class="audit-loading"><span class="loader"></span> Loading activity…</div>';

  try {
    const endpoint = '/api/audit/' + type + '/' + id + '?limit=5';
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Failed to fetch');
    const entries = await response.json();
    auditCache[cacheKey] = entries;
    container.innerHTML = renderAuditEntries(entries);
  } catch (err) {
    container.innerHTML = '<div class="audit-error">Could not load activity log.</div>';
  }
}

function renderAuditEntries(entries) {
  if (!entries || entries.length === 0) {
    return '<div class="audit-empty">No changes recorded yet.</div>';
  }

  let html = '<div class="audit-list">';

  entries.forEach(entry => {
    const rawAction = entry.action || 'update';
    // Map sub-task actions onto the existing visual buckets
    let action, icon, actionLabel;
    if (rawAction === 'subtask_added') { action = 'create'; icon = '+'; actionLabel = 'Sub-task added'; }
    else if (rawAction === 'subtask_removed') { action = 'delete'; icon = '×'; actionLabel = 'Sub-task removed'; }
    else if (rawAction === 'subtask_updated') { action = 'update'; icon = '∆'; actionLabel = 'Sub-task updated'; }
    else if (rawAction === 'create') { action = 'create'; icon = '+'; actionLabel = 'Created'; }
    else if (rawAction === 'delete') { action = 'delete'; icon = '×'; actionLabel = 'Deleted'; }
    else if (rawAction === 'archive') { action = 'delete'; icon = '×'; actionLabel = 'Archived'; }
    else if (rawAction === 'restore') { action = 'create'; icon = '↺'; actionLabel = 'Restored'; }
    else { action = 'update'; icon = '∆'; actionLabel = 'Updated'; }

    const user = entry.user_email || 'anonymous';
    const time = formatAuditTime(entry.timestamp);
    // Derive an avatar from the email: use the part before @ for initials + color.
    // e.g. "user@example.com..." -> "V"; "anonymous" -> "?". Keeps color stable per user.
    const userKey = user.split('@')[0] || user;
    const userInitial = (userKey === 'anonymous' || !userKey) ? '?' : userKey[0].toUpperCase();
    const userAvatarColor = ownerColor(userKey);

    html += '<div class="audit-entry ' + action + '">';
    html += '<div class="audit-icon">' + icon + '</div>';
    html += '<div class="audit-content">';

    // Meta line: avatar · user · action · time
    html += '<div class="audit-meta">';
    html += '<span class="audit-avatar" style="background: linear-gradient(135deg, ' + userAvatarColor + ', var(--blue));">' + escapeHtml(userInitial) + '</span>';
    html += '<span class="audit-user">' + escapeHtml(user) + '</span>';
    html += '<span class="audit-action">' + actionLabel + '</span>';
    html += '<span class="audit-time">' + escapeHtml(time) + '</span>';
    html += '</div>';

    // Changes
    const changes = entry.changes;
    if (changes) {
      html += '<div class="audit-changes">';

      if (rawAction === 'subtask_added' || rawAction === 'subtask_removed') {
        // Show the sub-task title prominently, then any extra fields
        const st = changes.subtask || {};
        if (st.title) {
          html += '<div class="audit-change-line"><span class="audit-field-name">Title</span><span class="audit-value-new">' + escapeHtml(truncateValue(st.title)) + '</span></div>';
        }
        if (st.owner) {
          html += '<div class="audit-change-line"><span class="audit-field-name">Owner</span><span class="audit-value-new">' + escapeHtml(truncateValue(st.owner)) + '</span></div>';
        }
        if (st.due_date) {
          html += '<div class="audit-change-line"><span class="audit-field-name">Due</span><span class="audit-value-new">' + escapeHtml(truncateValue(st.due_date)) + '</span></div>';
        }
      } else if (rawAction === 'subtask_updated') {
        // First line is the sub-task's title (context), then field diffs
        if (changes.subtask_title) {
          html += '<div class="audit-change-line" style="color:var(--text-muted);font-size:11px;">Sub-task: ' + escapeHtml(truncateValue(changes.subtask_title)) + '</div>';
        }
        Object.keys(changes).forEach(f => {
          if (f === 'subtask_title') return;
          const change = changes[f];
          if (!change || typeof change !== 'object') return;
          html += '<div class="audit-change-line">';
          html += '<span class="audit-field-name">' + escapeHtml(formatFieldName(f)) + '</span>';
          if (change.old != null && change.old !== '') {
            html += '<span class="audit-value-old">' + escapeHtml(truncateValue(change.old)) + '</span>';
          } else {
            html += '<span class="audit-value-old" style="font-style:italic;text-decoration:none;">empty</span>';
          }
          html += '<span class="audit-arrow">→</span>';
          if (change['new'] != null && change['new'] !== '') {
            html += '<span class="audit-value-new">' + escapeHtml(truncateValue(change['new'])) + '</span>';
          } else {
            html += '<span class="audit-value-new" style="font-style:italic;">empty</span>';
          }
          html += '</div>';
        });
      } else if (changes._initial) {
        // Create: show initial values
        const fields = Object.keys(changes._initial).filter(f => changes._initial[f] != null && changes._initial[f] !== '');
        if (fields.length > 0) {
          fields.slice(0, 6).forEach(f => {
            const val = changes._initial[f];
            html += '<div class="audit-change-line">';
            html += '<span class="audit-field-name">' + escapeHtml(formatFieldName(f)) + '</span>';
            html += '<span class="audit-value-new">' + escapeHtml(truncateValue(val)) + '</span>';
            html += '</div>';
          });
          if (fields.length > 6) {
            html += '<div class="audit-change-line" style="color:var(--text-muted);font-size:11px;">+' + (fields.length - 6) + ' more fields</div>';
          }
        }
      } else if (changes._snapshot) {
        // Delete: show snapshot
        html += '<div class="audit-change-line" style="color:var(--st-delayed);font-size:11px;">Record removed</div>';
      } else {
        // Update: show diffs
        const fields = Object.keys(changes);
        fields.forEach(f => {
          const change = changes[f];
          if (!change) return;
          html += '<div class="audit-change-line">';
          html += '<span class="audit-field-name">' + escapeHtml(formatFieldName(f)) + '</span>';
          if (change.old != null && change.old !== '') {
            html += '<span class="audit-value-old">' + escapeHtml(truncateValue(change.old)) + '</span>';
          } else {
            html += '<span class="audit-value-old" style="font-style:italic;text-decoration:none;">empty</span>';
          }
          html += '<span class="audit-arrow">→</span>';
          if (change['new'] != null && change['new'] !== '') {
            html += '<span class="audit-value-new">' + escapeHtml(truncateValue(change['new'])) + '</span>';
          } else {
            html += '<span class="audit-value-new" style="font-style:italic;">empty</span>';
          }
          html += '</div>';
        });
      }

      html += '</div>';
    }

    html += '</div></div>';
  });

  html += '</div>';
  return html;
}

function formatFieldName(field) {
  return field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function truncateValue(val) {
  if (val == null) return '';
  const s = String(val);
  return s.length > 80 ? s.slice(0, 77) + '…' : s;
}

function formatAuditTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return diffMin + 'm ago';
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return diffH + 'h ago';
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return diffD + 'd ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Invalidate audit cache after saves/deletes
function clearAuditCache(type, id) {
  const cacheKey = type + ':' + id;
  delete auditCache[cacheKey];
}

// ============== DRAWER REDESIGN HELPERS ==============
function switchDrawerTab(prefix, tabName) {
  // prefix is 'p' (project) or 'b' (bau); tabName is 'details' or 'subtasks'
  const drawerEl = document.getElementById(prefix === 'p' ? 'drawer-project' : 'drawer-bau');
  if (!drawerEl) return;
  drawerEl.querySelectorAll('.drawer-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === prefix + '-' + tabName);
  });
  drawerEl.querySelectorAll('.drawer-tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === prefix + '-tab-' + tabName);
  });
}

function updateLiveStatusPill(type) {
  const px = type === 'project' ? 'p' : 'b';
  const sel = document.getElementById(px + '-status');
  const pill = document.getElementById(px + '-live-status-pill');
  if (!sel || !pill) return;
  const status = sel.value;
  // Remove existing pill-* classes
  pill.className = 'drawer-status-pill';
  const cls = statusPillClass(status); // returns 'pill pill-XYZ'
  const modifier = cls.split(' ')[1]; // 'pill-XYZ'
  if (modifier) pill.classList.add(modifier);
  pill.textContent = status.toUpperCase();
}

function onProgressSliderChange(prefix) {
  const slider = document.getElementById(prefix + '-progress');
  const num = document.getElementById(prefix + '-progress-num');
  const out = document.getElementById(prefix + '-progress-readout');
  const v = Math.max(0, Math.min(100, Number(slider.value) || 0));
  if (num) num.value = v;
  if (out) out.textContent = v + '%';
}

function onProgressNumChange(prefix) {
  const slider = document.getElementById(prefix + '-progress');
  const num = document.getElementById(prefix + '-progress-num');
  const out = document.getElementById(prefix + '-progress-readout');
  let v = Number(num.value) || 0;
  v = Math.max(0, Math.min(100, v));
  num.value = v;
  if (slider) slider.value = v;
  if (out) out.textContent = v + '%';
}

// Global Esc handler — closes whichever drawer is currently open
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  // Skip if status picker is open (it has its own Esc handler)
  if (document.querySelector('.status-picker.open')) return;
  const projOpen = document.getElementById('drawer-project') && document.getElementById('drawer-project').classList.contains('open');
  const bauOpen = document.getElementById('drawer-bau') && document.getElementById('drawer-bau').classList.contains('open');
  if (projOpen && typeof closeProjectDrawer === 'function') closeProjectDrawer();
  else if (bauOpen && typeof closeBauDrawer === 'function') closeBauDrawer();
});

// ============== INLINE STATUS PICKER ==============
const PROJECT_STATUSES = ['On Track', 'At Risk', 'Delayed', 'On Hold', 'Completed'];
const BAU_STATUSES = ['Active', 'In Progress', 'Blocked', 'Paused', 'Completed'];
let _statusPickerEl = null;

function openStatusPicker(event, pillEl) {
  closeStatusPicker(); // Close any open picker first
  if (typeof closeOwnerPicker === 'function') closeOwnerPicker();
  if (typeof closePhasePicker === 'function') closePhasePicker();
  if (typeof closeFreqPicker === 'function') closeFreqPicker();
  if (typeof closePriorityPicker === 'function') closePriorityPicker();
  if (typeof closeDatePicker === 'function') closeDatePicker();
  if (typeof closeRowMenu === 'function') closeRowMenu();
  const type = pillEl.dataset.type;
  const id = pillEl.dataset.id;
  const current = pillEl.dataset.current;
  const options = type === 'project' ? PROJECT_STATUSES : BAU_STATUSES;

  // Build picker
  const picker = document.createElement('div');
  picker.className = 'status-picker';
  picker.innerHTML = options.map(s => {
    const isCurrent = s === current;
    const cls = statusPillClass(s).replace('pill ', '');
    return '<div class="status-picker-option' + (isCurrent ? ' current' : '') + '" data-status="' + s + '">' +
      '<span class="status-picker-option-dot ' + cls + '" style="background: currentColor"></span>' +
      '<span>' + s + (isCurrent ? '  •' : '') + '</span></div>';
  }).join('');
  document.body.appendChild(picker);

  // Position next to the pill (use fixed positioning, viewport-aware)
  const rect = pillEl.getBoundingClientRect();
  const pickerH = picker.offsetHeight;
  const pickerW = picker.offsetWidth;
  let top = rect.bottom + 6;
  let left = rect.left;
  if (top + pickerH > window.innerHeight - 10) top = rect.top - pickerH - 6;
  if (left + pickerW > window.innerWidth - 10) left = window.innerWidth - pickerW - 10;
  picker.style.top = top + 'px';
  picker.style.left = left + 'px';

  // Trigger transition
  requestAnimationFrame(() => picker.classList.add('open'));

  // Wire option clicks
  picker.querySelectorAll('.status-picker-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const newStatus = opt.dataset.status;
      if (newStatus !== current) saveStatusChange(type, id, newStatus, pillEl);
      closeStatusPicker();
    });
  });

  _statusPickerEl = picker;
  // Click-outside to close (added on next tick so this click doesn't fire it)
  setTimeout(() => {
    document.addEventListener('click', _onPickerClickOutside, { once: true });
    document.addEventListener('keydown', _onPickerEscape);
  }, 0);
}

function _onPickerClickOutside(e) {
  if (_statusPickerEl && !_statusPickerEl.contains(e.target)) closeStatusPicker();
}
function _onPickerEscape(e) {
  if (e.key === 'Escape') closeStatusPicker();
}

function closeStatusPicker() {
  if (!_statusPickerEl) return;
  const p = _statusPickerEl;
  _statusPickerEl = null;
  p.classList.remove('open');
  document.removeEventListener('keydown', _onPickerEscape);
  setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, 200);
}

async function saveStatusChange(type, id, newStatus, pillEl) {
  pillEl.classList.add('saving');
  const url = type === 'project' ? '/api/projects/' + id : '/api/bau/' + id;
  // Look up the existing item from local state
  const arr = type === 'project' ? allProjects : allBau;
  const item = arr.find(x => x.id === id);
  if (!item) { pillEl.classList.remove('saving'); showToast('Item not found', true); return; }
  // Build the full payload (PUT replaces the row)
  const payload = type === 'project'
    ? {
        name: item.name, owner: item.owner, secondary_owner: item.secondary_owner,
        category: item.category, tool: item.tool, phase: item.phase, status: newStatus,
        progress: item.progress, target_date: item.target_date,
        last_milestone: item.last_milestone, next_milestone: item.next_milestone,
        challenges: item.challenges, notes: item.notes,
      }
    : {
        name: item.name, owner: item.owner, secondary_owner: item.secondary_owner,
        category: item.category, tool: item.tool, frequency: item.frequency,
        priority: item.priority, status: newStatus,
        last_performed: item.last_performed, next_due: item.next_due,
        is_ongoing: item.is_ongoing, challenges: item.challenges, notes: item.notes,
      };
  try {
    const r = await fetch(url, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error('Save failed');
    item.status = newStatus;
    item.updated_at = new Date().toISOString();
    clearAuditCache(type, id);
    if (type === 'project') renderProjects(); else renderBau();
    showToast('Status updated to ' + newStatus);
  } catch (err) {
    pillEl.classList.remove('saving');
    showToast('Failed to update status', true);
  }
}

// ============== INLINE PHASE PICKER (projects only) ==============
// Phases are a sequential lifecycle, so the picker preserves order (not alphabetized).
const PROJECT_PHASES = ['Planning', 'Design', 'Implementation', 'Testing', 'Deployment', 'Closure'];
let _phasePickerEl = null;
function openPhasePicker(event, el) {
  closePhasePicker();
  closeStatusPicker();
  closeOwnerPicker();
  if (typeof closeFreqPicker === 'function') closeFreqPicker();
  if (typeof closePriorityPicker === 'function') closePriorityPicker();
  closeRowMenu();
  const id = el.dataset.id;
  const current = el.dataset.current;

  const picker = document.createElement('div');
  picker.className = 'phase-picker';
  picker.innerHTML = PROJECT_PHASES.map((ph, i) => {
    const isCurrent = ph === current;
    return '<div class="phase-picker-option' + (isCurrent ? ' current' : '') + '" data-phase="' + escapeHtml(ph) + '">' +
      '<span class="phase-picker-step">' + (i + 1) + '</span>' +
      '<span>' + escapeHtml(ph) + (isCurrent ? '  •' : '') + '</span></div>';
  }).join('');
  document.body.appendChild(picker);

  const rect = el.getBoundingClientRect();
  const pickerH = picker.offsetHeight;
  const pickerW = picker.offsetWidth;
  let top = rect.bottom + 6;
  let left = rect.left;
  if (top + pickerH > window.innerHeight - 10) top = rect.top - pickerH - 6;
  if (left + pickerW > window.innerWidth - 10) left = window.innerWidth - pickerW - 10;
  picker.style.top = top + 'px';
  picker.style.left = left + 'px';

  requestAnimationFrame(() => picker.classList.add('open'));

  picker.querySelectorAll('.phase-picker-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const newPhase = opt.dataset.phase;
      closePhasePicker();
      if (newPhase !== current) savePhaseChange(id, newPhase, el);
    });
  });

  _phasePickerEl = picker;
  setTimeout(() => {
    document.addEventListener('click', _onPhasePickerClickOutside, { once: true });
    document.addEventListener('keydown', _onPhasePickerEscape);
  }, 0);
}
function _onPhasePickerClickOutside(e) {
  if (_phasePickerEl && !_phasePickerEl.contains(e.target)) closePhasePicker();
}
function _onPhasePickerEscape(e) {
  if (e.key === 'Escape') closePhasePicker();
}
function closePhasePicker() {
  if (!_phasePickerEl) return;
  const p = _phasePickerEl;
  _phasePickerEl = null;
  p.classList.remove('open');
  document.removeEventListener('keydown', _onPhasePickerEscape);
  setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, 200);
}
async function savePhaseChange(id, newPhase, el) {
  el.classList.add('saving');
  const item = allProjects.find(x => x.id === id);
  if (!item) { el.classList.remove('saving'); showToast('Project not found', true); return; }
  const payload = {
    name: item.name, owner: item.owner, secondary_owner: item.secondary_owner,
    category: item.category, tool: item.tool, phase: newPhase, status: item.status,
    progress: item.progress, target_date: item.target_date,
    last_milestone: item.last_milestone, next_milestone: item.next_milestone,
    challenges: item.challenges, notes: item.notes,
  };
  try {
    const r = await fetch('/api/projects/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error('Save failed');
    item.phase = newPhase;
    item.updated_at = new Date().toISOString();
    clearAuditCache('project', id);
    renderProjects();
    showToast('Phase updated to ' + newPhase);
  } catch (err) {
    el.classList.remove('saving');
    showToast('Failed to update phase', true);
  }
}

// ============== INLINE FREQUENCY PICKER (BAU only) ==============
// Cadence is ordered (Daily → Ad-hoc), so preserve order rather than alphabetize.
const BAU_FREQUENCIES = ['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Annual', 'Ad-hoc'];
let _freqPickerEl = null;
function openFreqPicker(event, el) {
  closeFreqPicker();
  closeStatusPicker(); closeOwnerPicker(); closePhasePicker(); closePriorityPicker(); closeRowMenu();
  const id = el.dataset.id;
  const current = el.dataset.current;

  const picker = document.createElement('div');
  picker.className = 'freq-picker';
  picker.innerHTML = BAU_FREQUENCIES.map(f => {
    const isCurrent = f === current;
    return '<div class="freq-picker-option' + (isCurrent ? ' current' : '') + '" data-freq="' + escapeHtml(f) + '">' +
      '<span>' + escapeHtml(f) + (isCurrent ? '  •' : '') + '</span></div>';
  }).join('');
  document.body.appendChild(picker);

  _positionPicker(picker, el);
  requestAnimationFrame(() => picker.classList.add('open'));

  picker.querySelectorAll('.freq-picker-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const newFreq = opt.dataset.freq;
      closeFreqPicker();
      if (newFreq !== current) saveFieldChange('frequency', id, newFreq, el, 'Frequency updated to ');
    });
  });

  _freqPickerEl = picker;
  setTimeout(() => {
    document.addEventListener('click', _onFreqPickerClickOutside, { once: true });
    document.addEventListener('keydown', _onFreqPickerEscape);
  }, 0);
}
function _onFreqPickerClickOutside(e) { if (_freqPickerEl && !_freqPickerEl.contains(e.target)) closeFreqPicker(); }
function _onFreqPickerEscape(e) { if (e.key === 'Escape') closeFreqPicker(); }
function closeFreqPicker() {
  if (!_freqPickerEl) return;
  const p = _freqPickerEl; _freqPickerEl = null;
  p.classList.remove('open');
  document.removeEventListener('keydown', _onFreqPickerEscape);
  setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, 200);
}

// ============== INLINE PRIORITY PICKER (BAU only) ==============
// Ordered by severity (Critical → Low). Dot color matches the priority pill.
const BAU_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const PRIORITY_DOT_COLOR = { 'Critical': 'var(--prio-crit)', 'High': 'var(--prio-high)', 'Medium': 'var(--prio-med)', 'Low': 'var(--prio-low)' };
let _priorityPickerEl = null;
function openPriorityPicker(event, el) {
  closePriorityPicker();
  closeStatusPicker(); closeOwnerPicker(); closePhasePicker(); closeFreqPicker(); closeRowMenu();
  const id = el.dataset.id;
  const current = el.dataset.current;

  const picker = document.createElement('div');
  picker.className = 'priority-picker';
  picker.innerHTML = BAU_PRIORITIES.map(pr => {
    const isCurrent = pr === current;
    const color = PRIORITY_DOT_COLOR[pr] || 'var(--prio-low)';
    return '<div class="priority-picker-option' + (isCurrent ? ' current' : '') + '" data-priority="' + escapeHtml(pr) + '">' +
      '<span class="priority-picker-dot" style="background: ' + color + '; color: ' + color + ';"></span>' +
      '<span>' + escapeHtml(pr) + (isCurrent ? '  •' : '') + '</span></div>';
  }).join('');
  document.body.appendChild(picker);

  _positionPicker(picker, el);
  requestAnimationFrame(() => picker.classList.add('open'));

  picker.querySelectorAll('.priority-picker-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const newPriority = opt.dataset.priority;
      closePriorityPicker();
      if (newPriority !== current) saveFieldChange('priority', id, newPriority, el, 'Priority updated to ');
    });
  });

  _priorityPickerEl = picker;
  setTimeout(() => {
    document.addEventListener('click', _onPriorityPickerClickOutside, { once: true });
    document.addEventListener('keydown', _onPriorityPickerEscape);
  }, 0);
}
function _onPriorityPickerClickOutside(e) { if (_priorityPickerEl && !_priorityPickerEl.contains(e.target)) closePriorityPicker(); }
function _onPriorityPickerEscape(e) { if (e.key === 'Escape') closePriorityPicker(); }
function closePriorityPicker() {
  if (!_priorityPickerEl) return;
  const p = _priorityPickerEl; _priorityPickerEl = null;
  p.classList.remove('open');
  document.removeEventListener('keydown', _onPriorityPickerEscape);
  setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, 200);
}

// Shared positioning helper for the popover pickers (viewport-aware).
function _positionPicker(picker, anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  const pickerH = picker.offsetHeight;
  const pickerW = picker.offsetWidth;
  let top = rect.bottom + 6;
  let left = rect.left;
  if (top + pickerH > window.innerHeight - 10) top = rect.top - pickerH - 6;
  if (left + pickerW > window.innerWidth - 10) left = window.innerWidth - pickerW - 10;
  picker.style.top = top + 'px';
  picker.style.left = left + 'px';
}

// Shared BAU field updater for inline frequency/priority edits (PUT full payload).
async function saveFieldChange(field, id, newValue, el, toastPrefix) {
  el.classList.add('saving');
  const item = allBau.find(x => x.id === id);
  if (!item) { el.classList.remove('saving'); showToast('BAU task not found', true); return; }
  const payload = {
    name: item.name, owner: item.owner, secondary_owner: item.secondary_owner,
    category: item.category, tool: item.tool,
    frequency: field === 'frequency' ? newValue : item.frequency,
    priority: field === 'priority' ? newValue : item.priority,
    status: item.status,
    last_performed: item.last_performed, next_due: item.next_due,
    is_ongoing: item.is_ongoing, challenges: item.challenges, notes: item.notes,
  };
  try {
    const r = await fetch('/api/bau/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error('Save failed');
    item[field] = newValue;
    item.updated_at = new Date().toISOString();
    clearAuditCache('bau', id);
    renderBau();
    showToast((toastPrefix || 'Updated to ') + newValue);
  } catch (err) {
    el.classList.remove('saving');
    showToast('Failed to update ' + field, true);
  }
}

// ============== INLINE DATE PICKER (BAU: Last Performed + Next Due) ==============
let _datePickerEl = null;
function openDatePicker(event, el) {
  closeDatePicker();
  closeStatusPicker(); closeOwnerPicker(); closePhasePicker();
  closeFreqPicker(); closePriorityPicker(); closeRowMenu();
  const field = el.dataset.field;
  const id = el.dataset.id;
  const current = el.dataset.current;
  const isOngoing = el.dataset.ongoing === '1';
  const isNextDue = field === 'next_due';
  const label = field === 'last_performed' ? 'Last Performed' : 'Next Due';

  const pop = document.createElement('div');
  pop.className = 'date-picker-pop';
  pop.innerHTML =
    '<div class="date-picker-pop-label">' + label + '</div>' +
    '<input type="date" id="dp-input" value="' + (current ? current.slice(0, 10) : '') + '"' + (isOngoing ? ' disabled' : '') + '>' +
    '<div class="date-picker-pop-actions">' +
      '<button type="button" class="date-picker-pop-save" id="dp-save">Save</button>' +
      '<button type="button" class="date-picker-pop-clear" id="dp-clear">Clear</button>' +
    '</div>' +
    (isNextDue ? '<label class="date-picker-pop-ongoing"><input type="checkbox" id="dp-ongoing"' + (isOngoing ? ' checked' : '') + '> Mark as Ongoing</label>' : '');
  document.body.appendChild(pop);
  _positionPicker(pop, el);
  requestAnimationFrame(() => pop.classList.add('open'));
  setTimeout(() => { const inp = pop.querySelector('#dp-input'); if (inp && !inp.disabled) inp.focus(); }, 50);

  if (isNextDue) {
    const ongoingChk = pop.querySelector('#dp-ongoing');
    const dateInp = pop.querySelector('#dp-input');
    ongoingChk.addEventListener('change', () => { dateInp.disabled = ongoingChk.checked; });
  }
  pop.querySelector('#dp-save').addEventListener('click', (e) => {
    e.stopPropagation();
    const dateInp = pop.querySelector('#dp-input');
    const ongoingChk = pop.querySelector('#dp-ongoing');
    const newOngoing = isNextDue && ongoingChk && ongoingChk.checked;
    const newDate = (!newOngoing && dateInp.value) ? dateInp.value : null;
    closeDatePicker();
    saveDateChange(field, id, newDate, newOngoing, el);
  });
  pop.querySelector('#dp-clear').addEventListener('click', (e) => {
    e.stopPropagation();
    closeDatePicker();
    saveDateChange(field, id, null, false, el);
  });

  _datePickerEl = pop;
  setTimeout(() => {
    document.addEventListener('click', _onDatePickerClickOutside, { once: true });
    document.addEventListener('keydown', _onDatePickerEscape);
  }, 0);
}
function _onDatePickerClickOutside(e) { if (_datePickerEl && !_datePickerEl.contains(e.target)) closeDatePicker(); }
function _onDatePickerEscape(e) { if (e.key === 'Escape') closeDatePicker(); }
function closeDatePicker() {
  if (!_datePickerEl) return;
  const p = _datePickerEl; _datePickerEl = null;
  p.classList.remove('open');
  document.removeEventListener('keydown', _onDatePickerEscape);
  setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, 200);
}
async function saveDateChange(field, id, newDate, newOngoing, el) {
  el.classList.add('saving');
  const item = allBau.find(x => x.id === id);
  if (!item) { el.classList.remove('saving'); showToast('BAU task not found', true); return; }
  const payload = {
    name: item.name, owner: item.owner, secondary_owner: item.secondary_owner,
    category: item.category, tool: item.tool, frequency: item.frequency,
    priority: item.priority, status: item.status,
    last_performed: field === 'last_performed' ? newDate : item.last_performed,
    next_due: field === 'next_due' ? (newOngoing ? null : newDate) : item.next_due,
    is_ongoing: field === 'next_due' ? newOngoing : item.is_ongoing,
    challenges: item.challenges, notes: item.notes,
  };
  try {
    const r = await fetch('/api/bau/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error('Save failed');
    if (field === 'last_performed') item.last_performed = newDate;
    else { item.next_due = newOngoing ? null : newDate; item.is_ongoing = newOngoing; }
    item.updated_at = new Date().toISOString();
    clearAuditCache('bau', id);
    renderBau();
    const lbl = field === 'last_performed' ? 'Last performed' : 'Next due';
    showToast(newOngoing ? 'Marked as ongoing' : newDate ? lbl + ' updated' : lbl + ' cleared');
  } catch (err) {
    el.classList.remove('saving');
    showToast('Failed to update date', true);
  }
}

// ============== INLINE OWNER PICKER ==============
// Returns sorted union of all owners (primary + secondary) currently present across projects and BAU.
// Dynamic so the dropdown reflects who's actually on the data — no hardcoded team list.
function getAllKnownOwners() {
  const set = new Set();
  allProjects.forEach(p => { if (p.owner) set.add(p.owner); if (p.secondary_owner) set.add(p.secondary_owner); });
  allBau.forEach(t => { if (t.owner) set.add(t.owner); if (t.secondary_owner) set.add(t.secondary_owner); });
  return [...set].sort();
}

let _ownerPickerEl = null;
function openOwnerPicker(event, el) {
  closeOwnerPicker();
  closeStatusPicker(); // ensure only one picker open at a time
  if (typeof closePhasePicker === 'function') closePhasePicker();
  if (typeof closeFreqPicker === 'function') closeFreqPicker();
  if (typeof closePriorityPicker === 'function') closePriorityPicker();
  closeRowMenu();
  const type = el.dataset.type;
  const id = el.dataset.id;
  const current = el.dataset.current;
  const owners = getAllKnownOwners();

  const picker = document.createElement('div');
  picker.className = 'owner-picker';
  picker.innerHTML = owners.map(o => {
    const isCurrent = o === current;
    return '<div class="owner-picker-option' + (isCurrent ? ' current' : '') + '" data-owner="' + escapeHtml(o) + '">' +
      '<span class="avatar" style="background: linear-gradient(135deg, ' + ownerColor(o) + ', var(--blue));">' + initials(o) + '</span>' +
      '<span>' + escapeHtml(o) + (isCurrent ? '  •' : '') + '</span></div>';
  }).join('') +
    '<div class="owner-picker-divider"></div>' +
    '<div class="owner-picker-option owner-picker-edit" data-owner="__EDIT__">' +
      '<span style="width: 18px; text-align: center;">✎</span><span>Edit in drawer…</span></div>';
  document.body.appendChild(picker);

  const rect = el.getBoundingClientRect();
  const pickerH = picker.offsetHeight;
  const pickerW = picker.offsetWidth;
  let top = rect.bottom + 6;
  let left = rect.left;
  if (top + pickerH > window.innerHeight - 10) top = rect.top - pickerH - 6;
  if (left + pickerW > window.innerWidth - 10) left = window.innerWidth - pickerW - 10;
  picker.style.top = top + 'px';
  picker.style.left = left + 'px';

  requestAnimationFrame(() => picker.classList.add('open'));

  picker.querySelectorAll('.owner-picker-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const newOwner = opt.dataset.owner;
      closeOwnerPicker();
      if (newOwner === '__EDIT__') {
        // Open the relevant drawer focused on the owner field
        if (type === 'project') { const p = allProjects.find(x => x.id === id); if (p) { openProjectDrawer(p); setTimeout(() => document.getElementById('p-owner').focus(), 280); } }
        else { const t = allBau.find(x => x.id === id); if (t) { openBauDrawer(t); setTimeout(() => document.getElementById('b-owner').focus(), 280); } }
        return;
      }
      if (newOwner !== current) saveOwnerChange(type, id, newOwner, el);
    });
  });

  _ownerPickerEl = picker;
  setTimeout(() => {
    document.addEventListener('click', _onOwnerPickerClickOutside, { once: true });
    document.addEventListener('keydown', _onOwnerPickerEscape);
  }, 0);
}
function _onOwnerPickerClickOutside(e) {
  if (_ownerPickerEl && !_ownerPickerEl.contains(e.target)) closeOwnerPicker();
}
function _onOwnerPickerEscape(e) {
  if (e.key === 'Escape') closeOwnerPicker();
}
function closeOwnerPicker() {
  if (!_ownerPickerEl) return;
  const p = _ownerPickerEl;
  _ownerPickerEl = null;
  p.classList.remove('open');
  document.removeEventListener('keydown', _onOwnerPickerEscape);
  setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, 200);
}

async function saveOwnerChange(type, id, newOwner, el) {
  el.classList.add('saving');
  const url = type === 'project' ? '/api/projects/' + id : '/api/bau/' + id;
  const arr = type === 'project' ? allProjects : allBau;
  const item = arr.find(x => x.id === id);
  if (!item) { el.classList.remove('saving'); showToast('Item not found', true); return; }
  const payload = type === 'project'
    ? {
        name: item.name, owner: newOwner, secondary_owner: item.secondary_owner,
        category: item.category, tool: item.tool, phase: item.phase, status: item.status,
        progress: item.progress, target_date: item.target_date,
        last_milestone: item.last_milestone, next_milestone: item.next_milestone,
        challenges: item.challenges, notes: item.notes,
      }
    : {
        name: item.name, owner: newOwner, secondary_owner: item.secondary_owner,
        category: item.category, tool: item.tool, frequency: item.frequency,
        priority: item.priority, status: item.status,
        last_performed: item.last_performed, next_due: item.next_due,
        is_ongoing: item.is_ongoing, challenges: item.challenges, notes: item.notes,
      };
  try {
    const r = await fetch(url, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error('Save failed');
    item.owner = newOwner;
    item.updated_at = new Date().toISOString();
    clearAuditCache(type, id);
    if (type === 'project') renderProjects(); else renderBau();
    showToast('Reassigned to ' + newOwner);
  } catch (err) {
    el.classList.remove('saving');
    showToast('Failed to reassign', true);
  }
}

// ============== ROW MENU (3-dot per-row actions) ==============
let _rowMenuEl = null;
function openRowMenu(event, btnEl, type, id) {
  closeRowMenu();
  closeStatusPicker();
  closeOwnerPicker();
  if (typeof closePhasePicker === 'function') closePhasePicker();
  if (typeof closeFreqPicker === 'function') closeFreqPicker();
  if (typeof closePriorityPicker === 'function') closePriorityPicker();
  const menu = document.createElement('div');
  menu.className = 'row-menu-popover';
  menu.innerHTML =
    '<div class="row-menu-option" data-action="duplicate"><span class="row-menu-icon">⎘</span><span>Duplicate</span></div>' +
    '<div class="row-menu-divider"></div>' +
    '<div class="row-menu-option row-menu-danger" data-action="delete"><span class="row-menu-icon">🗑</span><span>Delete</span></div>';
  document.body.appendChild(menu);

  const rect = btnEl.getBoundingClientRect();
  const menuH = menu.offsetHeight;
  const menuW = menu.offsetWidth;
  let top = rect.bottom + 6;
  let left = rect.right - menuW; // right-align to button
  if (top + menuH > window.innerHeight - 10) top = rect.top - menuH - 6;
  if (left < 10) left = 10;
  menu.style.top = top + 'px';
  menu.style.left = left + 'px';

  requestAnimationFrame(() => menu.classList.add('open'));

  menu.querySelectorAll('.row-menu-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = opt.dataset.action;
      closeRowMenu();
      if (action === 'duplicate') {
        if (type === 'project') duplicateProject(id);
        else duplicateBau(id);
      } else if (action === 'delete') {
        if (type === 'project') deleteProjectById(id);
        else deleteBauById(id);
      }
    });
  });

  _rowMenuEl = menu;
  setTimeout(() => {
    document.addEventListener('click', _onRowMenuClickOutside, { once: true });
    document.addEventListener('keydown', _onRowMenuEscape);
  }, 0);
}
function _onRowMenuClickOutside(e) {
  if (_rowMenuEl && !_rowMenuEl.contains(e.target)) closeRowMenu();
}
function _onRowMenuEscape(e) {
  if (e.key === 'Escape') closeRowMenu();
}
function closeRowMenu() {
  if (!_rowMenuEl) return;
  const m = _rowMenuEl;
  _rowMenuEl = null;
  m.classList.remove('open');
  document.removeEventListener('keydown', _onRowMenuEscape);
  setTimeout(() => { if (m.parentNode) m.parentNode.removeChild(m); }, 200);
}

// ============== INLINE PROGRESS PICKER (projects only) ==============
// Slider + number input, matching the drawer's progress control.
// Click target is the progress cell (stopPropagation prevents row expand).
let _progressPickerEl = null;
function openProgressPicker(event, el) {
  closeProgressPicker();
  closeStatusPicker(); closeOwnerPicker(); closePhasePicker();
  closeFreqPicker(); closePriorityPicker(); closeDatePicker(); closeRowMenu();
  const id = el.dataset.id;
  const current = Math.max(0, Math.min(100, Number(el.dataset.current || 0)));

  const pop = document.createElement('div');
  pop.className = 'progress-picker-pop';
  pop.innerHTML =
    '<div class="progress-picker-label"><span>// PROGRESS</span><span class="progress-picker-val" id="pp-val">' + current + '%</span></div>' +
    '<div class="progress-picker-row">' +
      '<input type="range" id="pp-slider" min="0" max="100" value="' + current + '">' +
      '<input type="number" id="pp-num" min="0" max="100" value="' + current + '">' +
    '</div>' +
    '<div class="progress-picker-presets">' +
      [0, 25, 50, 75, 90, 100].map(v =>
        '<button type="button" class="progress-preset" data-v="' + v + '">' + v + '%</button>'
      ).join('') +
    '</div>' +
    '<button type="button" class="progress-picker-save" id="pp-save">Save</button>';
  document.body.appendChild(pop);
  _positionPicker(pop, el);
  requestAnimationFrame(() => pop.classList.add('open'));

  const slider = pop.querySelector('#pp-slider');
  const num = pop.querySelector('#pp-num');
  const val = pop.querySelector('#pp-val');

  // Sync slider ↔ number ↔ display
  function sync(v) {
    v = Math.max(0, Math.min(100, Number(v) || 0));
    slider.value = v; num.value = v; val.textContent = v + '%';
  }
  slider.addEventListener('input', () => sync(slider.value));
  num.addEventListener('input', () => sync(num.value));
  num.addEventListener('change', () => sync(num.value));
  pop.querySelectorAll('.progress-preset').forEach(b => {
    b.addEventListener('click', (e) => { e.stopPropagation(); sync(b.dataset.v); });
  });

  pop.querySelector('#pp-save').addEventListener('click', (e) => {
    e.stopPropagation();
    const newPct = Math.max(0, Math.min(100, Number(slider.value)));
    closeProgressPicker();
    saveProgressChange(id, newPct, el);
  });

  _progressPickerEl = pop;
  setTimeout(() => {
    document.addEventListener('click', _onProgressPickerClickOutside, { once: true });
    document.addEventListener('keydown', _onProgressPickerEscape);
  }, 0);
}
function _onProgressPickerClickOutside(e) { if (_progressPickerEl && !_progressPickerEl.contains(e.target)) closeProgressPicker(); }
function _onProgressPickerEscape(e) { if (e.key === 'Escape') closeProgressPicker(); }
function closeProgressPicker() {
  if (!_progressPickerEl) return;
  const p = _progressPickerEl; _progressPickerEl = null;
  p.classList.remove('open');
  document.removeEventListener('keydown', _onProgressPickerEscape);
  setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, 200);
}
async function saveProgressChange(id, newPct, el) {
  const item = allProjects.find(x => x.id === id);
  if (!item) { showToast('Project not found', true); return; }
  const payload = {
    name: item.name, owner: item.owner, secondary_owner: item.secondary_owner,
    category: item.category, tool: item.tool, phase: item.phase, status: item.status,
    progress: newPct, target_date: item.target_date,
    last_milestone: item.last_milestone, next_milestone: item.next_milestone,
    challenges: item.challenges, notes: item.notes,
  };
  try {
    const r = await fetch('/api/projects/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error('Save failed');
    item.progress = newPct;
    item.updated_at = new Date().toISOString();
    clearAuditCache('project', id);
    renderProjects();
    showToast('Progress updated to ' + newPct + '%');
  } catch (err) { showToast('Failed to update progress', true); }
}

// ============== DUPLICATE / CLONE ==============
// Builds a draft from an existing record and opens the drawer with asNew=true.
// Reset fields: status, progress, milestones, target_date, created_at, challenges (start fresh).
// Preserved: category, tool, owner, secondary_owner, phase, notes (knowledge transfer).
function duplicateProject(id) {
  const orig = allProjects.find(x => x.id === id);
  if (!orig) { showToast('Project not found', true); return; }
  const draft = {
    id: null,
    name: (orig.name || '') + ' (copy)',
    owner: orig.owner,
    secondary_owner: orig.secondary_owner,
    category: orig.category,
    tool: orig.tool,
    phase: 'Planning',
    status: 'On Track',
    progress: 0,
    target_date: null,
    last_milestone: null,
    next_milestone: null,
    challenges: null,
    notes: orig.notes,
  };
  openProjectDrawer(draft, { asNew: true });
  showToast('Duplicating — review & save to create');
}
function duplicateBau(id) {
  const orig = allBau.find(x => x.id === id);
  if (!orig) { showToast('BAU task not found', true); return; }
  const draft = {
    id: null,
    name: (orig.name || '') + ' (copy)',
    owner: orig.owner,
    secondary_owner: orig.secondary_owner,
    category: orig.category,
    tool: orig.tool,
    frequency: orig.frequency,
    priority: orig.priority,
    status: 'Active',
    last_performed: null,
    next_due: null,
    is_ongoing: orig.is_ongoing,
    challenges: null,
    notes: orig.notes,
  };
  openBauDrawer(draft, { asNew: true });
  showToast('Duplicating — review & save to create');
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso); if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}
function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso); const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return mins <= 1 ? 'just now' : mins + 'm ago';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days < 30) return days + 'd ago';
  return Math.floor(days / 30) + 'mo ago';
}
function initials(name) {
  return (name || '?').split(/\\s+/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('');
}
function statusPillClass(s) {
  return ({ 'On Track': 'pill pill-track', 'Active': 'pill pill-track', 'In Progress': 'pill pill-track', 'At Risk': 'pill pill-risk', 'Paused': 'pill pill-hold', 'Delayed': 'pill pill-delayed', 'Overdue': 'pill pill-delayed', 'On Hold': 'pill pill-hold', 'Completed': 'pill pill-done' })[s] || 'pill pill-hold';
}
function daysToTarget(iso) {
  if (!iso) return null;
  const target = new Date(iso);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  return diff;
}

// ============== CATEGORY BADGE (colored + icon) ==============
// App-level category color map (mirrors the PPT report's catColor so table and board match).
function catBadgeColor(cat) {
  const map = {
    'Network Security': '#0891B2',
    'Web & Application Security': '#7C3AED',
    'Identity & Access Management': '#38BDF8',
    'Endpoint & Email Security': '#D97706',
    'Cloud Security': '#2A2969',
    'Mobile Security': '#DB2777',
    'Security Operations': '#BE185D',
    'Compliance & Audit': '#4F46E5',
  };
  return map[cat] || '#6B7280';
}
// Inline SVG icon per category (no external font dependency — robust against CDN blocking).
function catIconSvg(cat) {
  const icons = {
    'Network Security': '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v4M12 11l-6 6M12 11l6 6"/>',
    'Web & Application Security': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>',
    'Identity & Access Management': '<circle cx="8" cy="9" r="3"/><path d="M13 9h7M17 9v3M20 9v2"/>',
    'Endpoint & Email Security': '<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M3 8l9 5 9-5M8 20h8"/>',
    'Cloud Security': '<path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1.5A3.5 3.5 0 0 1 18 18H7z"/>',
    'Mobile Security': '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
    'Security Operations': '<path d="M12 3l8 3v5c0 4.5-3 8-8 10-5-2-8-5.5-8-10V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    'Compliance & Audit': '<rect x="6" y="4" width="12" height="16" rx="1"/><path d="M9 4V3h6v1M9 9h6M9 13h6M9 17h3"/>',
  };
  return icons[cat] || '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>';
}
// Build the full colored category badge with leading icon. Color applied inline per-category.
function categoryBadgeHtml(cat) {
  if (!cat) return '';
  const color = catBadgeColor(cat);
  return '<span class="item-cat" style="color:' + color + '; background:' + color + '1A; border-color:' + color + '59;">' +
    '<svg class="item-cat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + catIconSvg(cat) + '</svg>' +
    escapeHtml(cat) + '</span>';
}

function renderProgressCell(p) {
  const pct = Math.max(0, Math.min(100, Number(p.progress || 0)));
  const isCompleted = p.status === 'Completed';
  const days = daysToTarget(p.target_date);
  // Determine bar color: WORST of status-based and urgency-based signal wins.
  // Severity ranking: '' (none) < 'ok' < 'warn' < 'crit'
  const SEV_RANK = { '': 0, 'ok': 1, 'warn': 2, 'crit': 3 };
  const statusCls = progressClass(p.status);
  let urgencyCls = '';
  if (!isCompleted && days !== null) {
    if (days < 0) urgencyCls = 'crit';        // overdue
    else if (days === 0) urgencyCls = 'warn'; // due today
    else if (days <= 7) urgencyCls = 'warn';  // due soon
  }
  // Completed projects keep their 'ok' (blue) styling regardless of date
  const cls = isCompleted
    ? statusCls
    : ((SEV_RANK[urgencyCls] || 0) > (SEV_RANK[statusCls] || 0) ? urgencyCls : statusCls);

  // Build target/days label
  let targetCls = 'pb-target target-normal';
  let targetTxt = '';
  if (p.target_date) {
    const dateStr = fmtDate(p.target_date);
    if (isCompleted) {
      targetCls = 'pb-target target-delivered';
      targetTxt = '<span class="target-icon">⊙</span> ' + dateStr + ' <span class="target-days">· delivered</span>';
    } else if (days === null) {
      targetTxt = '<span class="target-icon">⊙</span> ' + dateStr;
    } else if (days < 0) {
      targetCls = 'pb-target target-overdue';
      targetTxt = '<span class="target-icon">⊙</span> ' + dateStr + ' <span class="target-days">· ' + Math.abs(days) + 'D OVERDUE</span>';
    } else if (days === 0) {
      targetCls = 'pb-target target-today';
      targetTxt = '<span class="target-icon">⊙</span> ' + dateStr + ' <span class="target-days">· DUE TODAY</span>';
    } else if (days <= 7) {
      targetCls = 'pb-target target-soon';
      targetTxt = '<span class="target-icon">⊙</span> ' + dateStr + ' <span class="target-days">· ' + days + 'd left</span>';
    } else {
      targetTxt = '<span class="target-icon">⊙</span> ' + dateStr + ' <span class="target-days">· ' + days + 'd left</span>';
    }
  } else {
    targetCls = 'pb-target target-none';
    targetTxt = '<span class="target-icon">⊙</span> no target set';
  }
  return '<div class="pb-wrap">' +
    '<div class="pb-target-line">' +
      '<span class="pb-target-label">TARGET</span>' +
      '<span class="' + targetCls + '">' + targetTxt + '</span>' +
    '</div>' +
    '<div class="pb-track">' +
      '<div class="pb-fill ' + cls + '" style="width:' + pct + '%"></div>' +
      '<div class="pb-ticks">' +
        '<div class="pb-tick' + (pct >= 25 ? ' passed' : '') + ' ' + cls + '" style="left:25%"></div>' +
        '<div class="pb-tick' + (pct >= 50 ? ' passed' : '') + ' ' + cls + '" style="left:50%"></div>' +
        '<div class="pb-tick' + (pct >= 75 ? ' passed' : '') + ' ' + cls + '" style="left:75%"></div>' +
      '</div>' +
    '</div>' +
    '<div class="pb-pct-line"><span class="pb-pct ' + cls + '">' + pct + '%</span></div>' +
  '</div>';
}

function progressClass(status) {
  return ({ 'On Track': 'ok', 'At Risk': 'warn', 'Delayed': 'crit', 'Completed': 'ok' })[status] || '';
}
function priorityPillClass(p) {
  return ({ 'Critical': 'pill pill-prio-crit', 'High': 'pill pill-prio-high', 'Medium': 'pill pill-prio-med', 'Low': 'pill pill-prio-low' })[p] || 'pill pill-prio-low';
}
function ownerColor(name) {
  if (!name) return OWNER_PALETTE[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return OWNER_PALETTE[Math.abs(h) % OWNER_PALETTE.length];
}
function dateStatus(dueIso) {
  if (!dueIso) return '';
  const due = new Date(dueIso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((due - today) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff <= 3) return 'soon';
  return '';
}

// ============== CSV EXPORT ==============
// Escapes a value for CSV. Handles commas, quotes, newlines, and Excel-safe injection.
function csvEscape(val) {
  if (val == null) return '';
  let s = String(val);
  // Excel/Sheets formula injection guard: prefix risky chars with apostrophe
  if (/^[=+\\-@\\t\\r]/.test(s)) s = "'" + s;
  // Quote if contains comma, quote, newline
  if (/[",\\n\\r]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCSV(rows, columns) {
  const header = columns.map(c => csvEscape(c.label)).join(',');
  const body = rows.map(r => columns.map(c => csvEscape(c.get(r))).join(',')).join('\\r\\n');
  return header + '\\r\\n' + body;
}

function downloadCSV(filename, csv) {
  // Add BOM so Excel detects UTF-8 correctly (preserves accents, special chars)
  const blob = new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function dateStamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes());
}

function fmtDateISO(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toISOString().slice(0, 10);
}


function getFilteredProjects() {
  const search = document.getElementById("search").value.toLowerCase();
  const statusFilter = document.getElementById("filter-status").value;
  const ownerFilter = document.getElementById("filter-owner").value;
  return allProjects.filter(p => {
    if (search && !(p.name.toLowerCase().includes(search) || (p.owner||"").toLowerCase().includes(search) || (p.category || "").toLowerCase().includes(search))) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    if (ownerFilter && p.owner !== ownerFilter) return false;
    return true;
  });
}

function getFilteredBau() {
  const search = document.getElementById("bau-search").value.toLowerCase();
  const statusFilter = document.getElementById("bau-filter-status").value;
  const freqFilter = document.getElementById("bau-filter-frequency").value;
  const ownerFilter = document.getElementById("bau-filter-owner").value;
  return allBau.filter(t => {
    if (search && !(t.name.toLowerCase().includes(search) || (t.owner||"").toLowerCase().includes(search) || (t.category||"").toLowerCase().includes(search))) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    if (freqFilter && t.frequency !== freqFilter) return false;
    if (ownerFilter && t.owner !== ownerFilter) return false;
    return true;
  });
}

function exportProjectsCSV() {
  const rows = getFilteredProjects();
  if (rows.length === 0) {
    showToast('No projects to export (check your filters)', true);
    return;
  }
  const cols = [
    { label: 'Project Name', get: r => r.name },
    { label: 'Primary PIC', get: r => r.owner },
    { label: 'Secondary PIC', get: r => r.secondary_owner || '' },
    { label: 'Category', get: r => r.category || '' },
    { label: 'Tool', get: r => r.tool || '' },
    { label: 'Phase', get: r => r.phase },
    { label: 'Status', get: r => r.status },
    { label: 'Progress %', get: r => r.progress },
    { label: 'Sub-tasks', get: r => (Number(r.subtask_total || 0) > 0) ? (Number(r.subtask_done || 0) + '/' + Number(r.subtask_total || 0)) : '' },
    { label: 'Target Date', get: r => fmtDateISO(r.target_date) },
    { label: 'Latest Milestone', get: r => r.last_milestone || '' },
    { label: 'Next Milestone', get: r => r.next_milestone || '' },
    { label: 'Challenges', get: r => r.challenges || '' },
    { label: 'Notes', get: r => r.notes || '' },
    { label: 'Created', get: r => fmtDateISO(r.created_at) },
    { label: 'Last Updated', get: r => fmtDateISO(r.updated_at) },
  ];
  downloadCSV('secops_projects_' + dateStamp() + '.csv', toCSV(rows, cols));
  showToast('Exported ' + rows.length + ' project' + (rows.length === 1 ? '' : 's'));
}

function exportBauCSV() {
  const rows = getFilteredBau();
  if (rows.length === 0) {
    showToast('No BAU tasks to export (check your filters)', true);
    return;
  }
  const cols = [
    { label: 'Task Name', get: r => r.name },
    { label: 'Primary PIC', get: r => r.owner },
    { label: 'Secondary PIC', get: r => r.secondary_owner || '' },
    { label: 'Category', get: r => r.category || '' },
    { label: 'Frequency', get: r => r.frequency },
    { label: 'Priority', get: r => r.priority },
    { label: 'Status', get: r => r.status },
    { label: 'Sub-tasks', get: r => (Number(r.subtask_total || 0) > 0) ? (Number(r.subtask_done || 0) + '/' + Number(r.subtask_total || 0)) : '' },
    { label: 'Last Performed', get: r => fmtDateISO(r.last_performed) },
    { label: 'Next Due', get: r => r.is_ongoing ? 'Ongoing' : fmtDateISO(r.next_due) },
    { label: 'Challenges', get: r => r.challenges || '' },
    { label: 'Notes', get: r => r.notes || '' },
    { label: 'Created', get: r => fmtDateISO(r.created_at) },
    { label: 'Last Updated', get: r => fmtDateISO(r.updated_at) },
  ];
  downloadCSV('secops_bau_' + dateStamp() + '.csv', toCSV(rows, cols));
  showToast('Exported ' + rows.length + ' BAU task' + (rows.length === 1 ? '' : 's'));
}

// ============== LAZY SCRIPT LOADER ==============
const _loadedScripts = {};
function loadScript(url) {
  if (_loadedScripts[url]) return _loadedScripts[url];
  _loadedScripts[url] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { delete _loadedScripts[url]; reject(new Error('Failed to load library. Check internet connection.')); };
    document.head.appendChild(s);
  });
  return _loadedScripts[url];
}

async function ensurePdfLib() {
  if (window.jspdf && window.jspdf.jsPDF && new window.jspdf.jsPDF().autoTable) return;
  showToast('Loading PDF library...');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
}

async function ensureXlsxLib() {
  if (window.XLSX) return;
  showToast('Loading Excel library...');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
}

// ============== PDF EXPORT ==============
async function buildPdfHeader(doc, title, count, filterDesc) {
  const pageW = doc.internal.pageSize.getWidth();
  // Header bar
  doc.setFillColor(15, 27, 48);
  doc.rect(0, 0, pageW, 56, 'F');
  doc.setTextColor(34, 211, 238);
  doc.setFontSize(9);
  doc.text('SECOPS // PORTAL', 32, 22);
  doc.setTextColor(255);
  doc.setFontSize(15);
  doc.setFont(undefined, 'bold');
  doc.text(title, 32, 42);
  doc.setFont(undefined, 'normal');

  // Brand mark — draw a red pill with "SECOPS" text (always works, no network/CORS)
  const logoW = 96;
  const logoH = 22;
  const logoX = pageW - logoW - 28;
  const logoY = 17;
  doc.setFillColor(247, 4, 10);
  // Try roundedRect; fall back to rect on older jsPDF
  if (typeof doc.roundedRect === 'function') {
    doc.roundedRect(logoX, logoY, logoW, logoH, 2, 2, 'F');
  } else {
    doc.rect(logoX, logoY, logoW, logoH, 'F');
  }
  doc.setTextColor(255);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('SECOPS', logoX + logoW / 2, logoY + 14, { align: 'center' });
  doc.setFont(undefined, 'normal');

  // Subtitle
  doc.setTextColor(80);
  doc.setFontSize(9);
  const ts = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  doc.text('Generated ' + ts + '  ·  ' + count + ' record' + (count === 1 ? '' : 's') + (filterDesc ? '  ·  ' + filterDesc : ''), 32, 72);
}

function buildPdfFooter(doc) {
  const pages = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text('Page ' + i + ' of ' + pages, pageW - 32, pageH - 16, { align: 'right' });
    doc.text('SecOps Portal · Confidential', 32, pageH - 16);
  }
}

function describeProjectFilters() {
  const parts = [];
  const s = document.getElementById('search').value;
  const st = document.getElementById('filter-status').value;
  const ow = document.getElementById('filter-owner').value;
  if (s) parts.push('search="' + s + '"');
  if (st) parts.push('status=' + st);
  if (ow) parts.push('owner=' + ow);
  return parts.length ? 'Filters: ' + parts.join(', ') : '';
}

function describeBauFilters() {
  const parts = [];
  const s = document.getElementById('bau-search').value;
  const st = document.getElementById('bau-filter-status').value;
  const fr = document.getElementById('bau-filter-frequency').value;
  const ow = document.getElementById('bau-filter-owner').value;
  if (s) parts.push('search="' + s + '"');
  if (st) parts.push('status=' + st);
  if (fr) parts.push('frequency=' + fr);
  if (ow) parts.push('owner=' + ow);
  return parts.length ? 'Filters: ' + parts.join(', ') : '';
}

async function exportProjectsPDF() {
  const rows = getFilteredProjects();
  if (rows.length === 0) { showToast('No projects to export (check your filters)', true); return; }
  try {
    await ensurePdfLib();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    await buildPdfHeader(doc, 'Sec Ops Project Report', rows.length, describeProjectFilters());

    doc.autoTable({
      head: [['Project', 'Owner', 'Category', 'Tool', 'Phase', 'Status', 'Progress', 'Sub-tasks', 'Target', 'Latest Milestone', 'Next Milestone', 'Challenges']],
      body: rows.map(r => [
        r.name, r.owner, r.category || '', r.tool || '', r.phase, r.status, r.progress + '%',
        (Number(r.subtask_total || 0) > 0) ? (Number(r.subtask_done || 0) + '/' + Number(r.subtask_total || 0)) : '—',
        fmtDateISO(r.target_date), r.last_milestone || '', r.next_milestone || '', r.challenges || ''
      ]),
      startY: 90,
      styles: { fontSize: 8, cellPadding: 5, overflow: 'linebreak', valign: 'top' },
      headStyles: { fillColor: [15, 27, 48], textColor: [34, 211, 238], fontStyle: 'bold', fontSize: 8, halign: 'left' },
      alternateRowStyles: { fillColor: [245, 249, 252] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 95 },   // Project
        1: { cellWidth: 60 },                       // Owner (was 50 — too tight for "Kumarasingam")
        2: { cellWidth: 70 },                       // Category
        3: { cellWidth: 70 },                       // Tool (NEW)
        4: { cellWidth: 65 },                       // Phase (was 50 — "Deployment" wrapped)
        5: { cellWidth: 65 },                       // Status (was 50 — "Completed" wrapped)
        6: { cellWidth: 45, halign: 'right' },      // Progress
        7: { cellWidth: 50, halign: 'center' },     // Sub-tasks
        8: { cellWidth: 55 },                       // Target
        9: { cellWidth: 'auto' },                   // Latest Milestone
        10: { cellWidth: 'auto' },                  // Next Milestone
        11: { cellWidth: 'auto' },                  // Challenges
      },
      margin: { left: 32, right: 32 },
      didParseCell: function (data) {
        // Color status cells (now column 5, was 4)
        if (data.section === 'body' && data.column.index === 5) {
          const s = data.cell.raw;
          if (s === 'On Track') data.cell.styles.textColor = [16, 153, 102];
          else if (s === 'At Risk') data.cell.styles.textColor = [180, 100, 20];
          else if (s === 'Delayed') data.cell.styles.textColor = [200, 50, 50];
          else if (s === 'Completed') data.cell.styles.textColor = [40, 100, 200];
          data.cell.styles.fontStyle = 'bold';
        }
        // Highlight Sub-tasks column when complete (now column 7, was 6)
        if (data.section === 'body' && data.column.index === 7) {
          const v = data.cell.raw;
          if (v && v !== '—') {
            const parts = String(v).split('/');
            if (parts.length === 2 && parts[0] === parts[1]) {
              data.cell.styles.textColor = [40, 100, 200];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      },
    });

    buildPdfFooter(doc);
    doc.save('secops_projects_' + dateStamp() + '.pdf');
    showToast('Exported ' + rows.length + ' project' + (rows.length === 1 ? '' : 's') + ' as PDF');
  } catch (err) {
    showToast('PDF export failed: ' + err.message, true);
  }
}

async function exportBauPDF() {
  const rows = getFilteredBau();
  if (rows.length === 0) { showToast('No BAU tasks to export (check your filters)', true); return; }
  try {
    await ensurePdfLib();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    await buildPdfHeader(doc, 'Sec Ops BAU Operations Report', rows.length, describeBauFilters());

    doc.autoTable({
      head: [['Task', 'Owner', 'Category', 'Tool', 'Frequency', 'Priority', 'Status', 'Sub-tasks', 'Last Performed', 'Next Due', 'Challenges']],
      body: rows.map(r => [
        r.name, r.owner, r.category || '', r.tool || '', r.frequency, r.priority, r.status,
        (Number(r.subtask_total || 0) > 0) ? (Number(r.subtask_done || 0) + '/' + Number(r.subtask_total || 0)) : '—',
        fmtDateISO(r.last_performed), r.is_ongoing ? 'Ongoing' : fmtDateISO(r.next_due), r.challenges || ''
      ]),
      startY: 90,
      styles: { fontSize: 8, cellPadding: 5, overflow: 'linebreak', valign: 'top' },
      headStyles: { fillColor: [15, 27, 48], textColor: [34, 211, 238], fontStyle: 'bold', fontSize: 8, halign: 'left' },
      alternateRowStyles: { fillColor: [245, 249, 252] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 100 },   // Task
        1: { cellWidth: 60 },                        // Owner (was 50)
        2: { cellWidth: 70 },                        // Category
        3: { cellWidth: 70 },                        // Tool (NEW)
        4: { cellWidth: 50 },                        // Frequency
        5: { cellWidth: 50 },                        // Priority
        6: { cellWidth: 65 },                        // Status (was 50)
        7: { cellWidth: 50, halign: 'center' },      // Sub-tasks
        8: { cellWidth: 60 },                        // Last Performed
        9: { cellWidth: 60 },                        // Next Due
        10: { cellWidth: 'auto' },                   // Challenges
      },
      margin: { left: 32, right: 32 },
      didParseCell: function (data) {
        // Priority now at column 5
        if (data.section === 'body' && data.column.index === 5) {
          const p = data.cell.raw;
          if (p === 'Critical') data.cell.styles.textColor = [200, 50, 50];
          else if (p === 'High') data.cell.styles.textColor = [180, 100, 20];
          data.cell.styles.fontStyle = 'bold';
        }
        // Status now at column 6 (color-code like Projects)
        if (data.section === 'body' && data.column.index === 6) {
          const s = data.cell.raw;
          if (s === 'Active' || s === 'On Track') data.cell.styles.textColor = [16, 153, 102];
          else if (s === 'In Progress') data.cell.styles.textColor = [40, 100, 200];
          else if (s === 'Blocked' || s === 'Overdue') data.cell.styles.textColor = [200, 50, 50];
          else if (s === 'Completed') data.cell.styles.textColor = [40, 100, 200];
          else if (s === 'Paused') data.cell.styles.textColor = [120, 120, 120];
          data.cell.styles.fontStyle = 'bold';
        }
        // Sub-tasks now at column 7
        if (data.section === 'body' && data.column.index === 7) {
          const v = data.cell.raw;
          if (v && v !== '—') {
            const parts = String(v).split('/');
            if (parts.length === 2 && parts[0] === parts[1]) {
              data.cell.styles.textColor = [40, 100, 200];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
        // Next Due now at column 9
        if (data.section === 'body' && data.column.index === 9) {
          const v = data.cell.raw;
          if (v === 'Ongoing') data.cell.styles.textColor = [16, 100, 153];
          else if (v && new Date(v) < new Date()) data.cell.styles.textColor = [200, 50, 50];
        }
      },
    });

    buildPdfFooter(doc);
    doc.save('secops_bau_' + dateStamp() + '.pdf');
    showToast('Exported ' + rows.length + ' BAU task' + (rows.length === 1 ? '' : 's') + ' as PDF');
  } catch (err) {
    showToast('PDF export failed: ' + err.message, true);
  }
}

// ============== EXCEL EXPORT ==============
function buildXlsxSheet(data, sheetName) {
  const XLSX = window.XLSX;
  const ws = XLSX.utils.json_to_sheet(data);
  // Auto column widths based on content
  if (data.length > 0) {
    const keys = Object.keys(data[0]);
    ws['!cols'] = keys.map(k => {
      const maxLen = Math.max(k.length, ...data.map(r => String(r[k] == null ? '' : r[k]).length));
      return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
    });
  }
  // Freeze top row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  ws['!views'] = [{ state: 'frozen', ySplit: 1 }];
  return ws;
}

async function exportProjectsXLSX() {
  const rows = getFilteredProjects();
  if (rows.length === 0) { showToast('No projects to export (check your filters)', true); return; }
  try {
    await ensureXlsxLib();
    const XLSX = window.XLSX;
    const data = rows.map(r => ({
      'Project Name': r.name,
      'Primary PIC': r.owner,
      'Secondary PIC': r.secondary_owner || '',
      'Category': r.category || '',
      'Tool': r.tool || '',
      'Phase': r.phase,
      'Status': r.status,
      'Progress %': r.progress,
      'Sub-tasks': (Number(r.subtask_total || 0) > 0) ? (Number(r.subtask_done || 0) + '/' + Number(r.subtask_total || 0)) : '',
      'Target Date': fmtDateISO(r.target_date),
      'Latest Milestone': r.last_milestone || '',
      'Next Milestone': r.next_milestone || '',
      'Challenges': r.challenges || '',
      'Notes': r.notes || '',
      'Created': fmtDateISO(r.created_at),
      'Last Updated': fmtDateISO(r.updated_at),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, buildXlsxSheet(data, 'Projects'), 'Projects');

    // Sub-tasks sheet (only sub-tasks whose parent is in the filtered set)
    const idSet = new Set(rows.map(r => r.id));
    const stRows = (allSubtasks || [])
      .filter(s => s.parent_type === 'project' && idSet.has(s.parent_id))
      .map(s => {
        const parent = allProjects.find(p => p.id === s.parent_id);
        return {
          'Parent Project': parent ? parent.name : '(unknown)',
          'Parent Owner': parent ? parent.owner : '',
          'Sub-task Title': s.title,
          'Sub-task Owner': s.owner || '',
          'Status': s.status,
          'Due Date': fmtDateISO(s.due_date),
          'Created': fmtDateISO(s.created_at),
          'Last Updated': fmtDateISO(s.updated_at),
        };
      });
    if (stRows.length > 0) {
      XLSX.utils.book_append_sheet(wb, buildXlsxSheet(stRows, 'Sub-tasks'), 'Sub-tasks');
    }

    XLSX.writeFile(wb, 'secops_projects_' + dateStamp() + '.xlsx');
    const extra = stRows.length > 0 ? ' (+ ' + stRows.length + ' sub-task' + (stRows.length === 1 ? '' : 's') + ')' : '';
    showToast('Exported ' + rows.length + ' project' + (rows.length === 1 ? '' : 's') + extra + ' as Excel');
  } catch (err) {
    showToast('Excel export failed: ' + err.message, true);
  }
}

async function exportBauXLSX() {
  const rows = getFilteredBau();
  if (rows.length === 0) { showToast('No BAU tasks to export (check your filters)', true); return; }
  try {
    await ensureXlsxLib();
    const XLSX = window.XLSX;
    const data = rows.map(r => ({
      'Task Name': r.name,
      'Primary PIC': r.owner,
      'Secondary PIC': r.secondary_owner || '',
      'Category': r.category || '',
      'Frequency': r.frequency,
      'Priority': r.priority,
      'Status': r.status,
      'Sub-tasks': (Number(r.subtask_total || 0) > 0) ? (Number(r.subtask_done || 0) + '/' + Number(r.subtask_total || 0)) : '',
      'Last Performed': fmtDateISO(r.last_performed),
      'Next Due': r.is_ongoing ? 'Ongoing' : fmtDateISO(r.next_due),
      'Challenges': r.challenges || '',
      'Notes': r.notes || '',
      'Created': fmtDateISO(r.created_at),
      'Last Updated': fmtDateISO(r.updated_at),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, buildXlsxSheet(data, 'BAU'), 'BAU');

    // Sub-tasks sheet
    const idSet = new Set(rows.map(r => r.id));
    const stRows = (allSubtasks || [])
      .filter(s => s.parent_type === 'bau' && idSet.has(s.parent_id))
      .map(s => {
        const parent = allBau.find(b => b.id === s.parent_id);
        return {
          'Parent BAU': parent ? parent.name : '(unknown)',
          'Parent Owner': parent ? parent.owner : '',
          'Sub-task Title': s.title,
          'Sub-task Owner': s.owner || '',
          'Status': s.status,
          'Due Date': fmtDateISO(s.due_date),
          'Created': fmtDateISO(s.created_at),
          'Last Updated': fmtDateISO(s.updated_at),
        };
      });
    if (stRows.length > 0) {
      XLSX.utils.book_append_sheet(wb, buildXlsxSheet(stRows, 'Sub-tasks'), 'Sub-tasks');
    }

    XLSX.writeFile(wb, 'secops_bau_' + dateStamp() + '.xlsx');
    const extra = stRows.length > 0 ? ' (+ ' + stRows.length + ' sub-task' + (stRows.length === 1 ? '' : 's') + ')' : '';
    showToast('Exported ' + rows.length + ' BAU task' + (rows.length === 1 ? '' : 's') + extra + ' as Excel');
  } catch (err) {
    showToast('Excel export failed: ' + err.message, true);
  }
}

// ============== EXPORT DROPDOWN UI ==============
function toggleExportMenu(menuId, evt) {
  if (evt) evt.stopPropagation();
  const menu = document.getElementById(menuId);
  const isOpen = menu.classList.contains('show');
  // Close all menus first
  document.querySelectorAll('.export-menu.show').forEach(m => m.classList.remove('show'));
  if (!isOpen) menu.classList.add('show');
}

function closeAllExportMenus() {
  document.querySelectorAll('.export-menu.show').forEach(m => m.classList.remove('show'));
}

// Close menus on outside click + auto-close on option click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.export-wrap') && !e.target.closest('.export-menu')) {
    closeAllExportMenus();
  } else if (e.target.closest('.export-option')) {
    // Option clicked — close after firing (the export handler runs first)
    setTimeout(closeAllExportMenus, 50);
  }
});

// ============== INLINE SUB-TASKS (expanded row, read-only) ==============
function renderInlineSubtasks(parentType, parentId) {
  const items = (allSubtasks || [])
    .filter(s => s.parent_type === parentType && s.parent_id === parentId)
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  if (items.length === 0) return '';

  const done = items.filter(s => s.status === 'Completed').length;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const rows = items.map(s => {
    const statusKey = s.status === 'Completed' ? 'completed' : s.status === 'In Progress' ? 'in-progress' : 'not-started';
    const isOverdue = s.due_date && s.status !== 'Completed' && new Date(s.due_date) < today;
    const dueHtml = s.due_date
      ? '<span class="inline-subtask-due' + (isOverdue ? ' overdue' : '') + '">' + escapeHtml(fmtDate(s.due_date)) + '</span>'
      : '<span class="inline-subtask-due" style="color:var(--text-muted);">—</span>';
    const ownerHtml = s.owner
      ? '<span class="inline-subtask-owner">' + escapeHtml(s.owner) + '</span>'
      : '<span></span>';
    return '<div class="inline-subtask-row' + (s.status === 'Completed' ? ' completed' : '') + '" title="' + escapeHtml(s.status) + '">' +
      '<span class="inline-subtask-status ' + statusKey + '"></span>' +
      '<span class="inline-subtask-title">' + escapeHtml(s.title) + '</span>' +
      ownerHtml +
      dueHtml +
    '</div>';
  }).join('');

  return '<div class="expand-field full-width"><div class="expand-field-label">Sub-tasks (' + done + ' / ' + items.length + ' ✓)</div><div class="inline-subtasks">' + rows + '</div></div>';
}

// ============== DONUT CHART ==============
function renderDonutChart(containerId, data) {
  const c = document.getElementById(containerId);
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    c.innerHTML = '<div style="padding: 30px 0; color: var(--text-muted); font-size: 13px;">No data yet.</div>';
    return;
  }
  const cx = 100, cy = 100, rOut = 78, rIn = 50;

  let svgSlices;
  if (data.length === 1) {
    // Single owner — render as full ring
    svgSlices = '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((rOut + rIn) / 2) + '" fill="none" stroke="' + data[0].color + '" stroke-width="' + (rOut - rIn) + '"></circle>';
  } else {
    let cumAngle = -Math.PI / 2;
    svgSlices = data.map(d => {
      const portion = d.count / total;
      const angle = portion * Math.PI * 2;
      const sA = cumAngle, eA = cumAngle + angle;
      cumAngle = eA;
      const x1 = cx + rOut * Math.cos(sA), y1 = cy + rOut * Math.sin(sA);
      const x2 = cx + rOut * Math.cos(eA), y2 = cy + rOut * Math.sin(eA);
      const x3 = cx + rIn * Math.cos(eA), y3 = cy + rIn * Math.sin(eA);
      const x4 = cx + rIn * Math.cos(sA), y4 = cy + rIn * Math.sin(sA);
      const large = angle > Math.PI ? 1 : 0;
      const path = 'M ' + x1 + ' ' + y1 + ' A ' + rOut + ' ' + rOut + ' 0 ' + large + ' 1 ' + x2 + ' ' + y2 + ' L ' + x3 + ' ' + y3 + ' A ' + rIn + ' ' + rIn + ' 0 ' + large + ' 0 ' + x4 + ' ' + y4 + ' Z';
      return '<path class="donut-slice" d="' + path + '" fill="' + d.color + '" stroke="var(--bg-card)" stroke-width="2"><title>' + escapeHtml(d.label) + ': ' + d.count + '</title></path>';
    }).join('');
  }

  const svg = '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">' + svgSlices +
    '<foreignObject x="40" y="70" width="120" height="60"><div xmlns="http://www.w3.org/1999/xhtml" class="donut-center"><div class="donut-total">' + total + '</div><div class="donut-sub">Projects</div></div></foreignObject>' +
    '</svg>';

  const legend = data.map(d => {
    const pct = ((d.count / total) * 100).toFixed(0);
    return '<div class="legend-row"><div class="legend-swatch" style="background:' + d.color + '; color:' + d.color + ';"></div><div class="legend-name">' + escapeHtml(d.label) + '</div><div class="legend-count">' + d.count + '</div><div class="legend-pct">(' + pct + '%)</div></div>';
  }).join('');

  c.innerHTML = '<div class="donut-svg">' + svg + '</div><div class="donut-legend">' + legend + '</div>';
}

// ============== EMPTY STATE BUILDER ==============
// Context-aware empty state. Three cases:
//  - 'none'      : no records exist at all → invite creating the first one
//  - 'filtered'  : records exist but filters/search hide them all → offer Clear filters
//  - 'positive'  : an intentional good-news empty (e.g. overdue filter with zero overdue)
// opts: { type:'project'|'bau', mode:'none'|'filtered'|'positive', title, sub,
//         createLabel, createFn, clearFn, positive:bool, icon (svg inner) }
function emptyStateHtml(opts) {
  const o = opts || {};
  const iconSvg = o.icon || '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>';
  let actions = '';
  if (o.mode === 'none' && o.createFn) {
    actions = '<button class="btn" onclick="' + o.createFn + '">+ ' + escapeHtml(o.createLabel || 'New') + '</button>';
  } else if (o.mode === 'filtered' && o.clearFn) {
    actions = '<button class="btn-secondary" onclick="' + o.clearFn + '">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      'Clear filters</button>';
  }
  return '<div class="table-wrap"><div class="empty' + (o.positive ? ' is-positive' : '') + '">' +
    '<div class="empty-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' + iconSvg + '</svg></div>' +
    '<div class="empty-title">' + escapeHtml(o.title || 'Nothing here') + '</div>' +
    '<div class="empty-sub">' + escapeHtml(o.sub || '') + '</div>' +
    (actions ? '<div class="empty-actions">' + actions + '</div>' : '') +
    '</div></div>';
}

// Reset all projects filters/search, then re-render.
function clearProjectFilters() {
  document.getElementById('search').value = '';
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-owner').value = '';
  renderProjects();
}
// Reset all BAU filters/search (including the date-overdue mode), then re-render.
function clearBauFilters() {
  document.getElementById('bau-search').value = '';
  document.getElementById('bau-filter-status').value = '';
  document.getElementById('bau-filter-frequency').value = '';
  document.getElementById('bau-filter-owner').value = '';
  bauOverdueOnly = false;
  renderBau();
}

// ============== DASHBOARD ENTRY ANIMATIONS ==============
// Fire only on the first dashboard render (guarded by dashboardEntryAnimated).
// All respect prefers-reduced-motion: reduce → set final state instantly.
function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Count a KPI element from 0 up to target over dur ms with an ease-out curve.
// Preserves the 2-digit zero-padding used by the KPI cards.
function animateCountUp(el, target, dur) {
  if (!el) return;
  const pad = (n) => String(n).padStart(2, '0');
  if (prefersReducedMotion()) { el.textContent = pad(target); return; }
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  let start = null;
  el.textContent = '00';
  function frame(ts) {
    if (start === null) start = ts;
    const p = Math.min((ts - start) / dur, 1);
    el.textContent = pad(Math.round(easeOutCubic(p) * target));
    if (p < 1) requestAnimationFrame(frame);
    else el.textContent = pad(target);
  }
  requestAnimationFrame(frame);
}

// Animate the status bars growing from 0 width to their target (uses existing CSS width transition).
function animateBarsGrow() {
  if (prefersReducedMotion()) return;
  const fills = document.querySelectorAll('#status-bars .bar-fill');
  fills.forEach((f, i) => {
    const target = f.style.width;        // captured target (e.g. "60%")
    f.style.width = '0%';                // reset to zero
    // Force reflow so the browser registers the 0% start before we set the target
    void f.offsetWidth;
    setTimeout(() => { f.style.width = target; }, 60 + i * 80);
  });
}

// Animate donut wedges in one-by-one (wedge-by-wedge). Each slice fades + scales up in sequence.
function animateDonutWedges() {
  if (prefersReducedMotion()) return;
  const slices = document.querySelectorAll('#owner-chart .donut-slice');
  slices.forEach((s, i) => {
    s.style.transformOrigin = 'center';
    s.style.opacity = '0';
    s.style.transform = 'scale(0.85)';
    s.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
    void s.offsetWidth;
    const delay = 100 + i * 120;
    setTimeout(() => { s.style.opacity = '1'; s.style.transform = 'scale(1)'; }, delay);
    // After the entry finishes, clear inline styles so the CSS hover transition (0.2s) takes over cleanly
    setTimeout(() => {
      s.style.transition = '';
      s.style.transform = '';
      s.style.opacity = '';
      s.style.transformOrigin = '';
    }, delay + 450);
  });
}

// ============== PROJECTS RENDER ==============
function renderProjects() {
  if (typeof updateTabCounts === 'function') updateTabCounts();
  const search = document.getElementById('search').value.toLowerCase();
  const statusFilter = document.getElementById('filter-status').value;
  const ownerFilter = document.getElementById('filter-owner').value;

  const filtered = allProjects.filter(p => {
    if (search && !(p.name.toLowerCase().includes(search) || (p.owner||'').toLowerCase().includes(search) || (p.secondary_owner||'').toLowerCase().includes(search) || (p.category || '').toLowerCase().includes(search))) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    if (ownerFilter && p.owner !== ownerFilter && p.secondary_owner !== ownerFilter) return false;
    if (projectsOverdueOnly) {
      // Project is overdue if target_date is past and not Completed/Paused/On Hold
      if (!p.target_date) return false;
      if (p.status === 'Completed' || p.status === 'On Hold') return false;
      const today = new Date(); today.setHours(0,0,0,0);
      if (new Date(p.target_date) >= today) return false;
    }
    return true;
  });

  // KPIs
  const kpiTotal = allProjects.length;
  const kpiTrack = allProjects.filter(p => p.status === 'On Track').length;
  const kpiAttention = allProjects.filter(p => p.status === 'At Risk' || p.status === 'Delayed').length;
  const kpiDone = allProjects.filter(p => p.status === 'Completed').length;
  if (!dashboardEntryAnimated) {
    animateCountUp(document.getElementById('kpi-total'), kpiTotal, 1000);
    animateCountUp(document.getElementById('kpi-track'), kpiTrack, 1000);
    animateCountUp(document.getElementById('kpi-attention'), kpiAttention, 1000);
    animateCountUp(document.getElementById('kpi-done'), kpiDone, 1000);
  } else {
    document.getElementById('kpi-total').textContent = String(kpiTotal).padStart(2, '0');
    document.getElementById('kpi-track').textContent = String(kpiTrack).padStart(2, '0');
    document.getElementById('kpi-attention').textContent = String(kpiAttention).padStart(2, '0');
    document.getElementById('kpi-done').textContent = String(kpiDone).padStart(2, '0');
  }

  // Owner filter dropdown - include both primary and secondary owners
  const ownerSet = new Set();
  allProjects.forEach(p => { if (p.owner) ownerSet.add(p.owner); if (p.secondary_owner) ownerSet.add(p.secondary_owner); });
  const owners = [...ownerSet].sort();
  const ownerSel = document.getElementById('filter-owner');
  const cur = ownerSel.value;
  ownerSel.innerHTML = '<option value="">All owners</option>' + owners.map(o => '<option value="' + escapeHtml(o) + '"' + (o === cur ? ' selected' : '') + '>' + escapeHtml(o) + '</option>').join('');

  // Status bars
  const total = allProjects.length || 1;
  const statuses = [
    { name: 'On Track', color: 'var(--st-track)' }, { name: 'At Risk', color: 'var(--st-risk)' },
    { name: 'Delayed', color: 'var(--st-delayed)' }, { name: 'On Hold', color: 'var(--st-hold)' },
    { name: 'Completed', color: 'var(--st-done)' },
  ];
  document.getElementById('status-bars').innerHTML = statuses.map(s => {
    const count = allProjects.filter(p => p.status === s.name).length;
    const pct = (count / total) * 100;
    return '<div class="bar-row"><div class="bar-label">' + s.name + '</div><div class="bar-track"><div class="bar-fill" style="width:' + pct + '%; background:' + s.color + '; color:' + s.color + ';"></div></div><div class="bar-count">' + count + '</div></div>';
  }).join('');
  document.getElementById('status-meta').textContent = 'N=' + allProjects.length;

  // Donut: projects per owner
  const ownerCounts = {};
  allProjects.forEach(p => { ownerCounts[p.owner] = (ownerCounts[p.owner] || 0) + 1; });
  const donutData = Object.keys(ownerCounts)
    .map(o => ({ label: o, count: ownerCounts[o], color: ownerColor(o) }))
    .sort((a, b) => b.count - a.count);
  renderDonutChart('owner-chart', donutData);
  document.getElementById('owner-meta').textContent = donutData.length + ' owner' + (donutData.length === 1 ? '' : 's');

  // Entry animations: bars grow + donut wedges in — first dashboard render only.
  if (!dashboardEntryAnimated) {
    animateBarsGrow();
    animateDonutWedges();
    dashboardEntryAnimated = true;
  }

  // Sync overdue banner (top of page) + active-filter chip (above projects table)
  updateOverdueBanner();
  const projChip = document.getElementById('proj-overdue-filter-chip');
  if (projChip) projChip.classList.toggle('show', projectsOverdueOnly);

  // Table
  const container = document.getElementById('projects-table');
  if (filtered.length === 0) {
    if (allProjects.length === 0) {
      container.innerHTML = emptyStateHtml({
        type: 'project', mode: 'none',
        icon: '<path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"/>',
        title: 'No projects logged',
        sub: 'Add the first security project to begin tracking milestones and progress.',
        createLabel: 'New Project', createFn: 'openProjectDrawer()',
      });
    } else {
      container.innerHTML = emptyStateHtml({
        type: 'project', mode: 'filtered',
        icon: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
        title: 'No matching projects',
        sub: 'No projects match your current search or filters. Try broadening them.',
        clearFn: 'clearProjectFilters()',
      });
    }
    return;
  }
  container.innerHTML = '<div class="table-wrap"><table class="table"><thead><tr><th style="width: 26%;">Project</th><th>Owner</th><th>Phase</th><th>Status</th><th style="width: 220px;">Progress</th><th></th></tr></thead><tbody>' +
    filtered.map(p => {
      const rowId = 'proj-' + p.id;
      const stTotal = Number(p.subtask_total || 0);
      const stDone = Number(p.subtask_done || 0);
      const stBadge = stTotal > 0 ? '<span class="item-subtask-badge' + (stDone === stTotal ? ' complete' : '') + '">' + stDone + '/' + stTotal + '</span>' : '';
      const dataRow = '<tr class="data-row" data-id="' + rowId + '" onclick="toggleExpand(\\'' + rowId + '\\')">' +
        '<td data-label="Project"><div class="item-name"><span class="chevron">▸</span>' + escapeHtml(p.name) + '</div>' + categoryBadgeHtml(p.category) + (p.tool ? '<span class="item-tool">' + escapeHtml(p.tool) + '</span>' : '') + stBadge + '</td>' +
        '<td data-label="Owner"><div class="owner-stack">' +
          '<div class="owner-line primary editable-owner" data-type="project" data-id="' + p.id + '" data-current="' + escapeHtml(p.owner || '') + '" onclick="event.stopPropagation(); openOwnerPicker(event, this)" title="Click to reassign primary PIC"><span class="avatar" style="background: linear-gradient(135deg, ' + ownerColor(p.owner) + ', var(--blue));">' + initials(p.owner) + '</span><span>' + escapeHtml(p.owner) + '</span><span class="owner-chevron">▾</span></div>' +
          (p.secondary_owner ? '<div class="owner-line secondary"><span class="avatar" style="background: linear-gradient(135deg, ' + ownerColor(p.secondary_owner) + ', var(--blue));">' + initials(p.secondary_owner) + '</span><span>' + escapeHtml(p.secondary_owner) + '</span></div>' : '') +
        '</div></td>' +
        '<td data-label="Phase"><span class="phase-cell editable-phase" data-type="project" data-id="' + p.id + '" data-current="' + escapeHtml(p.phase || '') + '" onclick="event.stopPropagation(); openPhasePicker(event, this)" title="Click to change phase">' + escapeHtml(p.phase) + '<span class="phase-chevron">▾</span></span></td>' +
        '<td data-label="Status"><span class="' + statusPillClass(p.status) + ' editable-status" data-type="project" data-id="' + p.id + '" data-current="' + escapeHtml(p.status) + '" onclick="event.stopPropagation(); openStatusPicker(event, this)" title="Click to change status">' + escapeHtml(p.status) + '<span class="pill-chevron">▾</span></span></td>' +
        '<td data-label="Progress" class="progress-cell-v2 editable-progress" data-id="' + p.id + '" data-current="' + (p.progress || 0) + '" onclick="event.stopPropagation(); openProgressPicker(event, this)" title="Click to update progress">' + renderProgressCell(p) + '</td>' +
        '<td data-label="" class="action-cell"><button class="icon-btn" onclick="event.stopPropagation(); editProject(\\'' + p.id + '\\')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="row-menu-btn" onclick="event.stopPropagation(); openRowMenu(event, this, \\'project\\', \\'' + p.id + '\\')" title="More actions">⋯</button></td>' +
        '</tr>';
      const expandRow = '<tr class="expand-row" id="expand-' + rowId + '"><td colspan="6"><div class="expand-inner"><div class="expand-grid">' +
        '<div class="expand-field"><div class="expand-field-label">Latest Milestone</div><div class="expand-field-value' + (p.last_milestone ? '' : ' empty') + '">' + escapeHtml(p.last_milestone || 'Not set') + '</div></div>' +
        '<div class="expand-field"><div class="expand-field-label">Next Milestone</div><div class="expand-field-value' + (p.next_milestone ? '' : ' empty') + '">' + escapeHtml(p.next_milestone || 'Not set') + '</div></div>' +
        renderSubtaskInlineList('project', p.id) +
        '<div class="expand-field full-width"><div class="expand-field-label">Challenges</div><div class="expand-field-value' + (p.challenges ? '' : ' empty') + '">' + escapeHtml(p.challenges || 'None reported') + '</div></div>' +
        '<div class="expand-field full-width"><div class="expand-field-label">Notes / Risks</div><div class="expand-field-value' + (p.notes ? '' : ' empty') + '">' + escapeHtml(p.notes || 'None') + '</div></div>' +
        '<div class="expand-field full-width audit-section"><div class="audit-toggle-header" onclick="event.stopPropagation(); toggleAuditSection(\\'project\\', \\'' + p.id + '\\', this)"><span class="audit-toggle-chevron">▸</span><span>Recent Activity</span><span class="audit-toggle-hint">click to expand</span></div><div class="audit-container collapsed" id="audit-project-' + p.id + '"></div></div>' +
        '</div></div></td></tr>';
      return dataRow + expandRow;
    }).join('') +
    '</tbody></table></div>';
  wireStickyShadow(container);
}

// Toggle the .is-scrolled class on .table-wrap to show shadow under sticky header
function wireStickyShadow(container) {
  const wraps = (container || document).querySelectorAll('.table-wrap');
  wraps.forEach(w => {
    if (!w.querySelector('table')) return; // skip empty-state wraps
    const update = () => w.classList.toggle('is-scrolled', w.scrollTop > 2);
    w.addEventListener('scroll', update, { passive: true });
    update();
  });
}

// ============== OVERDUE BAU BANNER ==============
// Updates banner visibility + count text based on current overdue count.
// Respects session-only dismiss flag; respects active filter (hides banner while filter is on
// so user isn't told to "click to view" what they're already viewing).
function updateOverdueBanner() {
  const banner = document.getElementById('overdue-banner');
  if (!banner) return;
  const today = new Date(); today.setHours(0,0,0,0);
  // Compute project overdue: target_date past, not Completed/On Hold
  const projOverdue = (allProjects || []).filter(p =>
    p.target_date && p.status !== 'Completed' && p.status !== 'On Hold' && new Date(p.target_date) < today
  ).length;
  // Compute BAU overdue: next_due past, not ongoing, not Completed/Paused (mirrors existing logic)
  const bauOverdue = (allBau || []).filter(t =>
    t.next_due && !t.is_ongoing && t.status !== 'Completed' && t.status !== 'Paused' && new Date(t.next_due) < today
  ).length;
  // Hide each segment if filter for that side is already active, or if dismissed
  const showProj = projOverdue > 0 && !projectsOverdueOnly;
  const showBau = bauOverdue > 0 && !bauOverdueOnly;
  const anyShown = (showProj || showBau) && !overdueBannerDismissed;
  banner.classList.toggle('show', anyShown);
  if (!anyShown) return;
  const pSeg = document.getElementById('overdue-projects-segment');
  const bSeg = document.getElementById('overdue-bau-segment');
  const sep = document.getElementById('overdue-segment-sep');
  if (pSeg) {
    pSeg.hidden = !showProj;
    if (showProj) {
      document.getElementById('overdue-projects-count').textContent = String(projOverdue);
      document.getElementById('overdue-projects-label').textContent = 'project' + (projOverdue === 1 ? '' : 's') + ' overdue';
    }
  }
  if (bSeg) {
    bSeg.hidden = !showBau;
    if (showBau) {
      document.getElementById('overdue-bau-count').textContent = String(bauOverdue);
      document.getElementById('overdue-bau-label').textContent = 'BAU task' + (bauOverdue === 1 ? '' : 's') + ' overdue';
    }
  }
  if (sep) sep.hidden = !(showProj && showBau);
}
function clickOverdueBanner(type) {
  if (type === 'projects') {
    projectsOverdueOnly = true;
    if (typeof switchTab === 'function') switchTab('projects');
    renderProjects();
    const sections = document.querySelectorAll('section.section h2');
    for (const h of sections) {
      if (h.textContent.trim() === 'Active Projects') { h.scrollIntoView({ behavior: 'smooth', block: 'start' }); break; }
    }
  } else {
    bauOverdueOnly = true;
    if (typeof switchTab === 'function') switchTab('bau');
    renderBau();
    const sections = document.querySelectorAll('section.section h2');
    for (const h of sections) {
      if (h.textContent.trim() === 'BAU Operations') { h.scrollIntoView({ behavior: 'smooth', block: 'start' }); break; }
    }
  }
}
function dismissOverdueBanner(ev) {
  if (ev) ev.stopPropagation();
  overdueBannerDismissed = true;
  document.getElementById('overdue-banner').classList.remove('show');
}
function clearOverdueFilter() {
  bauOverdueOnly = false;
  renderBau();
  updateOverdueBanner();
}
function clearProjectsOverdueFilter() {
  projectsOverdueOnly = false;
  renderProjects();
  updateOverdueBanner();
}

// ============== SMART SUGGESTIONS (project drawer hints) ==============
// Conservative rules; each is dismissible per-project via localStorage.
// Returns an array of { id, text } hints that should fire for the given project.
function computeProjectHints(p) {
  if (!p || !p.id) return [];
  const hints = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const progress = (p.progress == null) ? 0 : Number(p.progress);
  const status = p.status || '';
  const phase = p.phase || '';
  const challenges = (p.challenges || '').trim();
  const targetDate = p.target_date ? new Date(p.target_date) : null;
  const createdDate = p.created_at ? new Date(p.created_at) : null;
  const ageDays = createdDate ? Math.floor((today - createdDate) / (1000 * 60 * 60 * 24)) : null;

  // Rule 1: Stale "On Track" — looks healthy but hasn't moved
  if (status === 'On Track' && progress < 10 && ageDays != null && ageDays >= 30) {
    hints.push({
      id: 'stale_on_track',
      text: 'Marked "On Track" for ' + ageDays + ' days but progress is still ' + progress + '%. Update milestones or revise status?'
    });
  }
  // Rule 2: Target date passed but no challenges logged
  if (targetDate && targetDate < today && status !== 'Completed' && !challenges) {
    const daysPast = Math.floor((today - targetDate) / (1000 * 60 * 60 * 24));
    hints.push({
      id: 'target_passed_no_challenges',
      text: 'Target date passed ' + daysPast + ' day' + (daysPast === 1 ? '' : 's') + ' ago but no challenges logged. Document blockers for visibility.'
    });
  }
  // Rule 3: Progress is ahead of phase
  if (progress >= 90 && (phase === 'Planning' || phase === 'Design')) {
    hints.push({
      id: 'progress_ahead_of_phase',
      text: 'Progress is ' + progress + '% but phase is still "' + phase + '". Time to advance to Implementation/Testing/Deployment?'
    });
  }

  // Filter out hints already dismissed for this project
  return hints.filter(h => !isHintDismissed(p.id, h.id));
}
function hintDismissKey(projectId, hintId) {
  return 'proj_hint_dismiss:' + projectId + ':' + hintId;
}
function isHintDismissed(projectId, hintId) {
  try { return localStorage.getItem(hintDismissKey(projectId, hintId)) === '1'; }
  catch (_) { return false; }
}
function dismissProjectHint(projectId, hintId) {
  try { localStorage.setItem(hintDismissKey(projectId, hintId), '1'); } catch (_) {}
  // Re-render the hints area for the currently-open drawer
  const p = allProjects.find(x => x.id === projectId);
  renderProjectHints(p);
}
function renderProjectHints(p) {
  const wrap = document.getElementById('p-hints-wrap');
  if (!wrap) return;
  const hints = computeProjectHints(p);
  if (!hints.length) { wrap.innerHTML = ''; wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  wrap.innerHTML = '<div class="drawer-hints">' +
    '<div class="drawer-hints-label">// SUGGESTIONS</div>' +
    hints.map(h =>
      '<div class="drawer-hint">' +
        '<span class="drawer-hint-icon">▲</span>' +
        '<span class="drawer-hint-text">' + escapeHtml(h.text) + '</span>' +
        '<button type="button" class="drawer-hint-dismiss" onclick="dismissProjectHint(\\'' + p.id + '\\', \\'' + h.id + '\\')" title="Dismiss this hint for this project">Dismiss</button>' +
      '</div>'
    ).join('') +
  '</div>';
}

// ============== BAU RENDER ==============
function renderBau() {
  if (typeof updateTabCounts === 'function') updateTabCounts();
  const search = document.getElementById('bau-search').value.toLowerCase();
  const statusFilter = document.getElementById('bau-filter-status').value;
  const freqFilter = document.getElementById('bau-filter-frequency').value;
  const ownerFilter = document.getElementById('bau-filter-owner').value;

  // Auto-flag overdue tasks (based on next_due in the past + status != Completed/Paused)
  allBau.forEach(t => {
    if (t.next_due && t.status !== 'Completed' && t.status !== 'Paused') {
      const due = new Date(t.next_due);
      const today = new Date(); today.setHours(0,0,0,0);
      if (due < today && t.status !== 'Overdue') {
        // Display as overdue but don't auto-modify the stored status
      }
    }
  });

  const filtered = allBau.filter(t => {
    if (search && !(t.name.toLowerCase().includes(search) || (t.owner||'').toLowerCase().includes(search) || (t.secondary_owner||'').toLowerCase().includes(search) || (t.category||'').toLowerCase().includes(search))) return false;
    // Status filter. The "Overdue" option is special: a task is overdue by DATE (next_due in the past),
    // not by a stored status string — so match the same definition the Overdue chip/banner use.
    // A task also counts if its stored status literally is "Overdue" (legacy/manually-set).
    if (statusFilter) {
      if (statusFilter === 'Overdue') {
        const isDateOverdue = t.next_due && !t.is_ongoing && t.status !== 'Completed' && t.status !== 'Paused' && dateStatus(t.next_due) === 'overdue';
        if (!isDateOverdue && t.status !== 'Overdue') return false;
      } else if (t.status !== statusFilter) {
        return false;
      }
    }
    if (freqFilter && t.frequency !== freqFilter) return false;
    if (ownerFilter && t.owner !== ownerFilter && t.secondary_owner !== ownerFilter) return false;
    // Date-overdue filter (set by overdue banner click). Mirrors the overdueCount logic exactly.
    if (bauOverdueOnly) {
      if (!t.next_due || t.is_ongoing) return false;
      if (t.status === 'Completed' || t.status === 'Paused') return false;
      const today = new Date(); today.setHours(0,0,0,0);
      if (new Date(t.next_due) >= today) return false;
    }
    return true;
  });

  // Owner filter dropdown for BAU - include both primary and secondary
  const ownerSetBau = new Set();
  allBau.forEach(t => { if (t.owner) ownerSetBau.add(t.owner); if (t.secondary_owner) ownerSetBau.add(t.secondary_owner); });
  const owners = [...ownerSetBau].sort();
  const ownerSel = document.getElementById('bau-filter-owner');
  const cur = ownerSel.value;
  ownerSel.innerHTML = '<option value="">All owners</option>' + owners.map(o => '<option value="' + escapeHtml(o) + '"' + (o === cur ? ' selected' : '') + '>' + escapeHtml(o) + '</option>').join('');

  // Summary chips
  const totalBau = allBau.length;
  const overdueCount = allBau.filter(t => dateStatus(t.next_due) === 'overdue' && t.status !== 'Completed' && t.status !== 'Paused').length;
  const dueSoonCount = allBau.filter(t => dateStatus(t.next_due) === 'soon' && t.status !== 'Completed' && t.status !== 'Paused').length;
  const activeCount = allBau.filter(t => t.status === 'Active' || t.status === 'In Progress').length;
  document.getElementById('bau-summary').innerHTML =
    '<div class="bau-chip"><div class="bau-chip-label">Total Tasks</div><div class="bau-chip-value">' + totalBau + '</div></div>' +
    '<div class="bau-chip ok"><div class="bau-chip-label">Active</div><div class="bau-chip-value">' + activeCount + '</div></div>' +
    '<div class="bau-chip ' + (dueSoonCount > 0 ? 'warn' : '') + '"><div class="bau-chip-label">Due ≤ 3 Days</div><div class="bau-chip-value">' + dueSoonCount + '</div></div>' +
    '<div class="bau-chip ' + (overdueCount > 0 ? 'crit' : '') + '"><div class="bau-chip-label">Overdue</div><div class="bau-chip-value">' + overdueCount + '</div></div>';

  // Sync overdue banner (top of page) + active-filter chip (above BAU table)
  updateOverdueBanner();
  const chip = document.getElementById('bau-overdue-filter-chip');
  if (chip) chip.classList.toggle('show', bauOverdueOnly);

  const container = document.getElementById('bau-table');
  if (filtered.length === 0) {
    if (allBau.length === 0) {
      container.innerHTML = emptyStateHtml({
        type: 'bau', mode: 'none',
        icon: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
        title: 'No BAU tasks logged',
        sub: 'Add recurring operational tasks to track cadence and due dates.',
        createLabel: 'New BAU Task', createFn: 'openBauDrawer()',
      });
    } else if (bauOverdueOnly) {
      // Filtering to date-overdue but nothing matched → good news, not an error
      container.innerHTML = emptyStateHtml({
        type: 'bau', mode: 'positive', positive: true,
        icon: '<path d="M20 6 9 17l-5-5"/>',
        title: 'Nothing overdue',
        sub: 'No BAU tasks are past due right now. Clear the filter to see everything.',
        clearFn: 'clearBauFilters()',
      });
    } else {
      container.innerHTML = emptyStateHtml({
        type: 'bau', mode: 'filtered',
        icon: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
        title: 'No matching tasks',
        sub: 'No BAU tasks match your current search or filters. Try broadening them.',
        clearFn: 'clearBauFilters()',
      });
    }
    return;
  }

  container.innerHTML = '<div class="table-wrap"><table class="table"><thead><tr><th style="width: 26%;">Task</th><th>Owner</th><th>Frequency</th><th>Priority</th><th>Status</th><th>Last</th><th>Next Due</th><th></th></tr></thead><tbody>' +
    filtered.map(t => {
      const rowId = 'bau-' + t.id;
      const dStat = dateStatus(t.next_due);
      const dueClass = (dStat === 'overdue' && t.status !== 'Completed' && t.status !== 'Paused') ? 'date-overdue' : (dStat === 'soon' && t.status !== 'Completed' && t.status !== 'Paused') ? 'date-due-soon' : 'date-cell';
      const nextDueDisplay = t.is_ongoing ? '<span class="pill-ongoing">Ongoing</span>' : '<span class="' + dueClass + '">' + fmtDate(t.next_due) + '</span>';
      const stTotal = Number(t.subtask_total || 0);
      const stDone = Number(t.subtask_done || 0);
      const stBadge = stTotal > 0 ? '<span class="item-subtask-badge' + (stDone === stTotal ? ' complete' : '') + '">' + stDone + '/' + stTotal + '</span>' : '';
      const dataRow = '<tr class="data-row" data-id="' + rowId + '" onclick="toggleExpand(\\'' + rowId + '\\')">' +
        '<td data-label="Task"><div class="item-name"><span class="chevron">▸</span>' + escapeHtml(t.name) + '</div>' + categoryBadgeHtml(t.category) + (t.tool ? '<span class="item-tool">' + escapeHtml(t.tool) + '</span>' : '') + stBadge + '</td>' +
        '<td data-label="Owner"><div class="owner-stack">' +
          '<div class="owner-line primary editable-owner" data-type="bau" data-id="' + t.id + '" data-current="' + escapeHtml(t.owner || '') + '" onclick="event.stopPropagation(); openOwnerPicker(event, this)" title="Click to reassign primary PIC"><span class="avatar" style="background: linear-gradient(135deg, ' + ownerColor(t.owner) + ', var(--blue));">' + initials(t.owner) + '</span><span>' + escapeHtml(t.owner) + '</span><span class="owner-chevron">▾</span></div>' +
          (t.secondary_owner ? '<div class="owner-line secondary"><span class="avatar" style="background: linear-gradient(135deg, ' + ownerColor(t.secondary_owner) + ', var(--blue));">' + initials(t.secondary_owner) + '</span><span>' + escapeHtml(t.secondary_owner) + '</span></div>' : '') +
        '</div></td>' +
        '<td data-label="Frequency"><span class="pill pill-freq editable-freq" data-id="' + t.id + '" data-current="' + escapeHtml(t.frequency || '') + '" onclick="event.stopPropagation(); openFreqPicker(event, this)" title="Click to change frequency">' + escapeHtml(t.frequency) + '<span class="pill-chevron">▾</span></span></td>' +
        '<td data-label="Priority"><span class="' + priorityPillClass(t.priority) + ' editable-priority" data-id="' + t.id + '" data-current="' + escapeHtml(t.priority || '') + '" onclick="event.stopPropagation(); openPriorityPicker(event, this)" title="Click to change priority">' + escapeHtml(t.priority) + '<span class="pill-chevron">▾</span></span></td>' +
        '<td data-label="Status"><span class="' + statusPillClass(t.status) + ' editable-status" data-type="bau" data-id="' + t.id + '" data-current="' + escapeHtml(t.status) + '" onclick="event.stopPropagation(); openStatusPicker(event, this)" title="Click to change status">' + escapeHtml(t.status) + '<span class="pill-chevron">▾</span></span></td>' +
        '<td data-label="Last"><span class="date-cell editable-date" data-field="last_performed" data-id="' + t.id + '" data-current="' + (t.last_performed || '') + '" onclick="event.stopPropagation(); openDatePicker(event, this)" title="Click to update last performed">' + fmtDate(t.last_performed) + '</span></td>' +
        '<td data-label="Next Due">' + (t.is_ongoing ? '<span class="pill-ongoing editable-date" data-field="next_due" data-id="' + t.id + '" data-current="" data-ongoing="1" onclick="event.stopPropagation(); openDatePicker(event, this)" title="Click to set a due date">Ongoing</span>' : '<span class="' + dueClass + ' editable-date" data-field="next_due" data-id="' + t.id + '" data-current="' + (t.next_due || '') + '" data-ongoing="0" onclick="event.stopPropagation(); openDatePicker(event, this)" title="Click to change due date">' + fmtDate(t.next_due) + '</span>') + '</td>' +
        '<td data-label="" class="action-cell"><button class="icon-btn" onclick="event.stopPropagation(); editBau(\\'' + t.id + '\\')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="row-menu-btn" onclick="event.stopPropagation(); openRowMenu(event, this, \\'bau\\', \\'' + t.id + '\\')" title="More actions">⋯</button></td>' +
        '</tr>';
      const expandRow = '<tr class="expand-row" id="expand-' + rowId + '"><td colspan="8"><div class="expand-inner"><div class="expand-grid">' +
        renderSubtaskInlineList('bau', t.id) +
        '<div class="expand-field full-width"><div class="expand-field-label">Challenges</div><div class="expand-field-value' + (t.challenges ? '' : ' empty') + '">' + escapeHtml(t.challenges || 'None reported') + '</div></div>' +
        '<div class="expand-field full-width"><div class="expand-field-label">Notes</div><div class="expand-field-value' + (t.notes ? '' : ' empty') + '">' + escapeHtml(t.notes || 'None') + '</div></div>' +
        '<div class="expand-field full-width audit-section"><div class="audit-toggle-header" onclick="event.stopPropagation(); toggleAuditSection(\\'bau\\', \\'' + t.id + '\\', this)"><span class="audit-toggle-chevron">▸</span><span>Recent Activity</span><span class="audit-toggle-hint">click to expand</span></div><div class="audit-container collapsed" id="audit-bau-' + t.id + '"></div></div>' +
        '</div></div></td></tr>';
      return dataRow + expandRow;
    }).join('') +
    '</tbody></table></div>';
  wireStickyShadow(container);
}

// ============== SUB-TASKS UI ==============

function subtaskPrefix(parentType) {
  return parentType === 'project' ? 'p' : 'b';
}

// Build the sub-task section UI for either drawer
function renderSubtaskSection(parentType, items) {
  const px = subtaskPrefix(parentType);
  const list = document.getElementById(px + '-subtask-list');
  const countPill = document.getElementById(px + '-subtask-count');
  const tabBadge = document.getElementById(px + '-subtask-tab-badge');
  const total = items.length;
  const done = items.filter(s => s.status === 'Completed').length;

  // Update count pill
  countPill.textContent = done + ' / ' + total + ' ✓';
  countPill.classList.toggle('zero', total === 0);
  // Update tab badge (compact: just X/Y)
  if (tabBadge) tabBadge.textContent = done + '/' + total;

  if (total === 0) {
    list.innerHTML = '<div class="subtask-empty">No sub-tasks yet. Click + Add to break this down.</div>';
  } else {
    list.innerHTML = items.map((s, idx) => subtaskRowHtml(parentType, s, idx)).join('');
  }
}

function subtaskRowHtml(parentType, s, idx) {
  const statusClass = s.status === 'Completed' ? 'completed' : s.status === 'In Progress' ? 'in-progress' : '';
  const rowClass = s.status === 'Completed' ? ' completed' : '';
  const due = s.due_date || '';
  const isOverdue = due && s.status !== 'Completed' && new Date(due) < new Date(new Date().toDateString());
  const dueClass = isOverdue ? ' overdue' : '';
  const id = s.id ? escapeHtml(s.id) : '';
  return '<div class="subtask-row' + rowClass + '" data-st-id="' + id + '" data-st-idx="' + idx + '">' +
    '<div class="subtask-status-box ' + statusClass + '" onclick="cycleSubtaskStatus(\\'' + parentType + '\\', ' + idx + ')" title="Click to change status"></div>' +
    '<textarea class="subtask-title-input" placeholder="Sub-task description…" maxlength="300" rows="2" oninput="markSubtaskDirty(\\'' + parentType + '\\', ' + idx + ')" onblur="commitSubtask(\\'' + parentType + '\\', ' + idx + ')">' + escapeHtml(s.title || '') + '</textarea>' +
    '<input class="subtask-owner-input" placeholder="Owner" value="' + escapeHtml(s.owner || '') + '" maxlength="100" oninput="markSubtaskDirty(\\'' + parentType + '\\', ' + idx + ')" onblur="commitSubtask(\\'' + parentType + '\\', ' + idx + ')" />' +
    '<input class="subtask-due-input' + dueClass + '" type="date" value="' + escapeHtml(due) + '" onchange="markSubtaskDirty(\\'' + parentType + '\\', ' + idx + '); commitSubtask(\\'' + parentType + '\\', ' + idx + ')" />' +
    '<button type="button" class="subtask-delete-btn" onclick="removeSubtask(\\'' + parentType + '\\', ' + idx + ')" title="Delete sub-task">×</button>' +
  '</div>';
}

async function loadSubtasksIntoDrawer(parentType, parentId) {
  try {
    const r = await fetch('/api/subtasks/' + parentType + '/' + parentId);
    if (!r.ok) throw new Error('load failed');
    const items = await r.json();
    drawerSubtasks[parentType] = items;
    renderSubtaskSection(parentType, items);
  } catch (err) {
    drawerSubtasks[parentType] = [];
    renderSubtaskSection(parentType, []);
  }
}

function addSubtaskRow(parentType) {
  // Note: we no longer require an existing parent ID. For new (unsaved) parents, the row
  // is buffered locally and POSTed after the parent is created in saveProject/saveBau.
  drawerSubtasks[parentType].push({ id: null, title: '', owner: '', status: 'Not Started', due_date: null, _new: true });
  renderSubtaskSection(parentType, drawerSubtasks[parentType]);
  // Focus the newly added title input
  setTimeout(() => {
    const list = document.getElementById(subtaskPrefix(parentType) + '-subtask-list');
    const rows = list.querySelectorAll('.subtask-row');
    const last = rows[rows.length - 1];
    if (last) {
      const input = last.querySelector('.subtask-title-input');
      if (input) input.focus();
    }
  }, 30);
}

function markSubtaskDirty(parentType, idx) {
  // Read current input values back into the local model so re-renders don't lose typing
  const list = document.getElementById(subtaskPrefix(parentType) + '-subtask-list');
  const row = list.querySelectorAll('.subtask-row')[idx];
  if (!row) return;
  const s = drawerSubtasks[parentType][idx];
  if (!s) return;
  s.title = row.querySelector('.subtask-title-input').value;
  s.owner = row.querySelector('.subtask-owner-input').value;
  s.due_date = row.querySelector('.subtask-due-input').value || null;
}

async function commitSubtask(parentType, idx) {
  markSubtaskDirty(parentType, idx);
  const parentId = parentType === 'project' ? editingProjectId : editingBauId;
  const s = drawerSubtasks[parentType][idx];
  if (!s) return;
  // Skip if title is empty AND it's a fresh new row (don't persist blank placeholders)
  if (!s.title || !s.title.trim()) {
    if (s._new) return; // user blurred without typing — leave as placeholder
    showToast('Sub-task description required', true);
    return;
  }
  // No parent yet (new project/BAU not saved) → keep buffered locally. saveProject/saveBau will flush.
  if (!parentId) {
    s._pending = true;
    renderSubtaskSection(parentType, drawerSubtasks[parentType]);
    return;
  }
  const payload = { title: s.title.trim(), owner: s.owner || null, status: s.status, due_date: s.due_date || null };
  try {
    let resp;
    if (s.id) {
      resp = await fetch('/api/subtasks/' + s.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
      resp = await fetch('/api/subtasks/' + parentType + '/' + parentId, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error || 'Save failed'); }
    const saved = await resp.json();
    // Update local model with persisted record
    drawerSubtasks[parentType][idx] = { id: saved.id, title: saved.title, owner: saved.owner, status: saved.status, due_date: saved.due_date };

    // Keep the global allSubtasks in sync so the expanded-row inline list reflects edits immediately
    syncGlobalSubtask(parentType, parentId, saved);

    renderSubtaskSection(parentType, drawerSubtasks[parentType]);
    // Invalidate audit cache so it reflects the new entry on next open
    clearAuditCache(parentType, parentId);
  } catch (err) {
    showToast('Sub-task save failed: ' + (err.message || ''), true);
  }
}

// Inserts or updates a sub-task in the global allSubtasks list (used by the inline view).
// Also bumps the parent's subtask_total/subtask_done counts and re-renders the relevant table
// so the expanded row and the badge update without a full page refresh.
function syncGlobalSubtask(parentType, parentId, saved) {
  if (!Array.isArray(allSubtasks)) allSubtasks = [];
  const existingIdx = allSubtasks.findIndex(x => x.id === saved.id);
  const record = {
    id: saved.id, parent_type: parentType, parent_id: parentId,
    title: saved.title, owner: saved.owner, status: saved.status,
    due_date: saved.due_date, position: saved.position != null ? saved.position : (existingIdx >= 0 ? allSubtasks[existingIdx].position : 0),
    created_at: saved.created_at || (existingIdx >= 0 ? allSubtasks[existingIdx].created_at : new Date().toISOString()),
    updated_at: saved.updated_at || new Date().toISOString(),
  };
  if (existingIdx >= 0) allSubtasks[existingIdx] = record;
  else allSubtasks.push(record);

  // Recompute parent counts locally so badge stays accurate without a full reload
  const arr = parentType === 'project' ? allProjects : allBau;
  const parent = arr.find(x => x.id === parentId);
  if (parent) {
    const siblings = allSubtasks.filter(s => s.parent_type === parentType && s.parent_id === parentId);
    parent.subtask_total = siblings.length;
    parent.subtask_done = siblings.filter(s => s.status === 'Completed').length;
    if (parentType === 'project' && saved.parent_progress != null) parent.progress = saved.parent_progress;
  }

  // Re-render the visible table (the modal is overlaid so this is fine)
  if (parentType === 'project') renderProjects(); else renderBau();
}

function removeGlobalSubtask(parentType, parentId, subtaskId, newParentProgress) {
  if (!Array.isArray(allSubtasks)) allSubtasks = [];
  allSubtasks = allSubtasks.filter(s => s.id !== subtaskId);
  const arr = parentType === 'project' ? allProjects : allBau;
  const parent = arr.find(x => x.id === parentId);
  if (parent) {
    const siblings = allSubtasks.filter(s => s.parent_type === parentType && s.parent_id === parentId);
    parent.subtask_total = siblings.length;
    parent.subtask_done = siblings.filter(s => s.status === 'Completed').length;
    if (parentType === 'project' && newParentProgress != null) parent.progress = newParentProgress;
  }
  if (parentType === 'project') renderProjects(); else renderBau();
}

async function cycleSubtaskStatus(parentType, idx) {
  const s = drawerSubtasks[parentType][idx];
  if (!s) return;
  // Cycle: Not Started → In Progress → Completed → Not Started
  const order = ['Not Started', 'In Progress', 'Completed'];
  const next = order[(order.indexOf(s.status) + 1) % order.length];
  s.status = next;
  // Re-render immediately for snappy feel
  renderSubtaskSection(parentType, drawerSubtasks[parentType]);
  // Persist (only if it has an ID; new rows need a title first)
  if (s.id) {
    await commitSubtask(parentType, idx);
  } else if (s.title && s.title.trim()) {
    await commitSubtask(parentType, idx);
  }
}

async function removeSubtask(parentType, idx) {
  const s = drawerSubtasks[parentType][idx];
  if (!s) return;
  // If never persisted, just splice
  if (!s.id) {
    drawerSubtasks[parentType].splice(idx, 1);
    renderSubtaskSection(parentType, drawerSubtasks[parentType]);
    return;
  }
  if (!confirm('Delete sub-task "' + (s.title || 'untitled') + '"?')) return;
  try {
    const r = await fetch('/api/subtasks/' + s.id, { method: 'DELETE' });
    if (!r.ok) throw new Error('Delete failed');
    const result = await r.json();
    const parentId = parentType === 'project' ? editingProjectId : editingBauId;
    drawerSubtasks[parentType].splice(idx, 1);
    renderSubtaskSection(parentType, drawerSubtasks[parentType]);
    // Sync global state so the expanded-row inline list and badge update immediately
    if (parentId) {
      removeGlobalSubtask(parentType, parentId, s.id, null);
      clearAuditCache(parentType, parentId);
    }
  } catch (err) {
    showToast('Delete failed: ' + (err.message || ''), true);
  }
}

// Sub-task progress auto-roll-up was removed per user request. Progress stays manually editable.
function updateProgressLock(_items) { /* no-op */ }

// After a brand-new parent (project/BAU) is created, POST any sub-tasks the user added
// in the modal before clicking Save. Anything with _new flag and a non-empty title is persisted.
async function flushPendingSubtasks(parentType, parentId) {
  const items = drawerSubtasks[parentType] || [];
  for (const s of items) {
    if (s.id) continue;
    const title = (s.title || '').trim();
    if (!title) continue;
    try {
      const r = await fetch('/api/subtasks/' + parentType + '/' + parentId, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, owner: s.owner || null, status: s.status || 'Not Started', due_date: s.due_date || null }),
      });
      if (r.ok) {
        const saved = await r.json();
        s.id = saved.id;
        s._new = false; s._pending = false;
      }
    } catch (_) { /* swallow individual failures so one bad row doesn't block the rest */ }
  }
}

// ============== PROJECT DRAWER ==============
function handleProjectCategoryChange() {
  const sel = document.getElementById('p-category');
  const wrap = document.getElementById('p-custom-cat-wrap');
  const input = document.getElementById('p-category-custom');
  if (sel.value === '__OTHER__') { wrap.classList.add('show'); setTimeout(() => input.focus(), 50); }
  else { wrap.classList.remove('show'); input.value = ''; }
  populateToolDropdown(sel.value);
}

function populateToolDropdown(category, selectedTool) {
  const toolSel = document.getElementById('p-tool');
  const tools = TOOL_MAP[category] || [];
  let html = '';
  if (tools.length > 0) {
    tools.forEach(t => {
      html += '<option value="' + t + '"' + (t === selectedTool ? ' selected' : '') + '>' + t + '</option>';
    });
  }
  html += '<option value="__OTHER__"' + (selectedTool === '__OTHER__' ? ' selected' : '') + '>Other (specify)</option>';
  if (tools.length === 0 && !selectedTool) html = '<option value="">— Select tool —</option>' + html;
  toolSel.innerHTML = html;

  // If the saved tool isn't in this category's list, show as "Other"
  if (selectedTool && tools.indexOf(selectedTool) < 0 && selectedTool !== '__OTHER__') {
    toolSel.value = '__OTHER__';
    document.getElementById('p-custom-tool-wrap').classList.add('show');
    document.getElementById('p-tool-custom').value = selectedTool;
  } else {
    handleProjectToolChange();
  }
}

function handleProjectToolChange() {
  const sel = document.getElementById('p-tool');
  const wrap = document.getElementById('p-custom-tool-wrap');
  const input = document.getElementById('p-tool-custom');
  if (sel.value === '__OTHER__') { wrap.classList.add('show'); setTimeout(() => input.focus(), 50); }
  else { wrap.classList.remove('show'); input.value = ''; }
}

function openProjectDrawer(project, opts) {
  const asNew = !!(opts && opts.asNew);
  // If asNew is set, treat this as creating a new project even though we have a populated draft.
  // editingProjectId stays null → saveProject will POST (create) instead of PUT (update).
  editingProjectId = (project && project.id && !asNew) ? project.id : null;
  const titleText = (project && project.id && !asNew) ? 'Edit Project' : (asNew ? 'Duplicate Project' : 'New Project');
  const breadcrumbText = (project && project.name && !asNew) ? project.name : (asNew ? (project.name || 'New Project') : 'New Project');
  document.getElementById('project-drawer-title').textContent = titleText;
  document.getElementById('p-breadcrumb-name').textContent = breadcrumbText;
  document.getElementById('p-id').value = (project && project.id && !asNew) ? project.id : '';
  document.getElementById('p-name').value = (project && project.name) || '';
  document.getElementById('p-owner').value = (project && project.owner) || '';
  document.getElementById('p-secondary-owner').value = (project && project.secondary_owner) || '';
  document.getElementById('p-phase').value = (project && project.phase) || 'Planning';
  document.getElementById('p-status').value = (project && project.status) || 'On Track';
  const pProgress = project && project.progress != null ? project.progress : 0;
  document.getElementById('p-progress').value = pProgress;
  document.getElementById('p-progress-num').value = pProgress;
  document.getElementById('p-progress-readout').textContent = pProgress + '%';
  document.getElementById('p-target').value = (project && project.target_date) || '';
  document.getElementById('p-last-milestone').value = (project && project.last_milestone) || '';
  document.getElementById('p-next-milestone').value = (project && project.next_milestone) || '';
  document.getElementById('p-challenges').value = (project && project.challenges) || '';
  document.getElementById('p-notes').value = (project && project.notes) || '';

  // Reset to Details tab
  switchDrawerTab('p', 'details');
  // Live status pill — visible only when editing an existing project (not for asNew duplicates)
  const livePill = document.getElementById('p-live-status-pill');
  if (project && project.id && !asNew) { livePill.style.display = ''; } else { livePill.style.display = 'none'; }
  updateLiveStatusPill('project');

  const catSel = document.getElementById('p-category');
  const catWrap = document.getElementById('p-custom-cat-wrap');
  const catCustom = document.getElementById('p-category-custom');
  const cat = (project && project.category) || 'Network Security';
  if (PROJ_PREDEFINED_CATS.indexOf(cat) >= 0) { catSel.value = cat; catWrap.classList.remove('show'); catCustom.value = ''; }
  else if (cat) { catSel.value = '__OTHER__'; catWrap.classList.add('show'); catCustom.value = cat; }
  else { catSel.value = 'Network Security'; catWrap.classList.remove('show'); catCustom.value = ''; }

  // Populate tool dropdown based on category, then set saved tool
  const savedTool = (project && project.tool) || null;
  populateToolDropdown(catSel.value === '__OTHER__' ? '' : catSel.value, savedTool);

  // Delete button hidden when creating new or duplicating (no existing record to delete yet)
  document.getElementById('p-delete-btn').style.display = (project && project.id && !asNew) ? 'inline-flex' : 'none';

  // Render smart suggestions only for existing projects (asNew has no id, no audit context yet)
  renderProjectHints(asNew ? null : project);

  // Sub-task section — always visible. For new projects (and duplicates), rows are buffered locally
  // and POSTed after the project is created in saveProject. Duplicate does NOT carry sub-tasks.
  const subSec = document.getElementById('p-subtask-section');
  const subList = document.getElementById('p-subtask-list');
  subSec.style.display = '';
  drawerSubtasks.project = [];
  if (project && project.id && !asNew) {
    subList.innerHTML = '<div class="subtask-hint">Loading sub-tasks…</div>';
    loadSubtasksIntoDrawer('project', project.id);
  } else {
    renderSubtaskSection('project', []);
  }

  document.getElementById('drawer-project').classList.add('open');
  document.getElementById('overlay-project').classList.add('open');
  setTimeout(() => document.getElementById('p-name').focus(), 250);
}
async function closeProjectDrawer() {
  document.getElementById('drawer-project').classList.remove('open');
  document.getElementById('overlay-project').classList.remove('open');
  editingProjectId = null;
  // Refresh global lists in case sub-task edits changed parent progress or counts
  try {
    allProjects = await api.list('projects');
    allSubtasks = await fetch('/api/subtasks/all').then(r => r.ok ? r.json() : []);
    renderProjects();
    renderDeadlines();
  } catch (_) {}
}
function editProject(id) {
  const p = allProjects.find(x => x.id === id);
  if (p) openProjectDrawer(p);
}
async function saveProject(e) {
  e.preventDefault();
  const btn = document.getElementById('p-save-btn');
  btn.innerHTML = '<span class="loader"></span> SAVING'; btn.disabled = true;

  const catVal = document.getElementById('p-category').value;
  const catCustom = document.getElementById('p-category-custom').value.trim();
  let finalCategory;
  if (catVal === '__OTHER__') {
    if (!catCustom) { showToast('Custom category name required', true); btn.innerHTML = 'Save'; btn.disabled = false; return; }
    finalCategory = catCustom;
  } else { finalCategory = catVal; }

  const toolVal = document.getElementById('p-tool').value;
  const toolCustom = document.getElementById('p-tool-custom').value.trim();
  let finalTool;
  if (toolVal === '__OTHER__') {
    finalTool = toolCustom || null;
  } else { finalTool = toolVal || null; }

  const data = {
    id: document.getElementById('p-id').value || null,
    name: document.getElementById('p-name').value.trim(),
    owner: document.getElementById('p-owner').value.trim(),
    secondary_owner: document.getElementById('p-secondary-owner').value.trim() || null,
    category: finalCategory,
    tool: finalTool,
    phase: document.getElementById('p-phase').value,
    status: document.getElementById('p-status').value,
    progress: Number(document.getElementById('p-progress').value),
    target_date: document.getElementById('p-target').value || null,
    last_milestone: document.getElementById('p-last-milestone').value.trim(),
    next_milestone: document.getElementById('p-next-milestone').value.trim(),
    challenges: document.getElementById('p-challenges').value.trim(),
    notes: document.getElementById('p-notes').value.trim(),
  };

  try {
    const saved = await api.save('projects', data);
    if (data.id) clearAuditCache('project', data.id);
    // If this was a new project, flush any sub-tasks the user added in the drawer
    if (!data.id && saved && saved.id) {
      await flushPendingSubtasks('project', saved.id);
      try { allSubtasks = await fetch('/api/subtasks/all').then(r => r.ok ? r.json() : allSubtasks); } catch (_) {}
    }
    allProjects = await api.list('projects');
    renderProjects();
    closeProjectDrawer();
    showToast(data.id ? 'Project updated' : 'Project logged');
  } catch (err) { showToast(err.message || 'Save failed', true); }
  finally { btn.innerHTML = 'Save'; btn.disabled = false; }
}
async function deleteProject() {
  if (!editingProjectId) return;
  const id = editingProjectId;
  const ok = await deleteProjectById(id, { skipRender: true });
  if (ok) {
    renderProjects();
    closeProjectDrawer();
  }
}
// Soft-delete (archive) a project by id — usable from the row menu without an open drawer.
// Returns true on success. Pass { skipRender:true } when the caller will render itself.
async function deleteProjectById(id, opts) {
  if (!id) return false;
  const p = allProjects.find(x => x.id === id);
  const name = p ? (p.name || 'this project') : 'this project';
  if (!confirm('Move "' + name + '" to archive? It will be permanently deleted after 30 days.')) return false;
  try {
    await api.remove('projects', id);
    clearAuditCache('project', id);
    allProjects = await api.list('projects');
    if (!(opts && opts.skipRender)) renderProjects();
    showToast('Project moved to archive');
    if (archiveOpen) loadArchive();
    return true;
  } catch (err) { showToast(err.message || 'Delete failed', true); return false; }
}
function handleBauCategoryChange() {
  const sel = document.getElementById('b-category');
  const wrap = document.getElementById('b-custom-cat-wrap');
  const input = document.getElementById('b-category-custom');
  if (sel.value === '__OTHER__') { wrap.classList.add('show'); setTimeout(() => input.focus(), 50); }
  else { wrap.classList.remove('show'); input.value = ''; }
  populateBauToolDropdown(sel.value);
}

function populateBauToolDropdown(category, selectedTool) {
  const toolSel = document.getElementById('b-tool');
  const tools = BAU_TOOL_MAP[category] || [];
  let html = '<option value="">— None / N/A —</option>';
  if (tools.length > 0) {
    tools.forEach(t => {
      html += '<option value="' + t + '"' + (t === selectedTool ? ' selected' : '') + '>' + t + '</option>';
    });
  }
  html += '<option value="__OTHER__"' + (selectedTool === '__OTHER__' ? ' selected' : '') + '>Other (specify)</option>';
  toolSel.innerHTML = html;

  // If saved tool isn't in this category's list, show as "Other"
  if (selectedTool && selectedTool !== '__OTHER__' && tools.indexOf(selectedTool) < 0) {
    toolSel.value = '__OTHER__';
    document.getElementById('b-custom-tool-wrap').classList.add('show');
    document.getElementById('b-tool-custom').value = selectedTool;
  } else {
    handleBauToolChange();
  }
}

function handleBauToolChange() {
  const sel = document.getElementById('b-tool');
  const wrap = document.getElementById('b-custom-tool-wrap');
  const input = document.getElementById('b-tool-custom');
  if (sel.value === '__OTHER__') { wrap.classList.add('show'); setTimeout(() => input.focus(), 50); }
  else { wrap.classList.remove('show'); input.value = ''; }
}

function openBauDrawer(task, opts) {
  const asNew = !!(opts && opts.asNew);
  editingBauId = (task && task.id && !asNew) ? task.id : null;
  const titleText = (task && task.id && !asNew) ? 'Edit BAU Task' : (asNew ? 'Duplicate BAU Task' : 'New BAU Task');
  const breadcrumbText = (task && task.name && !asNew) ? task.name : (asNew ? (task.name || 'New BAU Task') : 'New BAU Task');
  document.getElementById('bau-drawer-title').textContent = titleText;
  document.getElementById('b-breadcrumb-name').textContent = breadcrumbText;
  document.getElementById('b-id').value = (task && task.id && !asNew) ? task.id : '';
  document.getElementById('b-name').value = (task && task.name) || '';
  document.getElementById('b-owner').value = (task && task.owner) || '';
  document.getElementById('b-secondary-owner').value = (task && task.secondary_owner) || '';
  document.getElementById('b-frequency').value = (task && task.frequency) || 'Weekly';
  document.getElementById('b-priority').value = (task && task.priority) || 'Medium';
  document.getElementById('b-status').value = (task && task.status) || 'Active';
  document.getElementById('b-last-performed').value = (task && task.last_performed) || '';
  const isOngoing = !!(task && task.is_ongoing);
  document.getElementById('b-is-ongoing').checked = isOngoing;
  document.getElementById('b-next-due').value = isOngoing ? '' : ((task && task.next_due) || '');
  document.getElementById('b-next-due').style.display = isOngoing ? 'none' : '';
  document.getElementById('b-challenges').value = (task && task.challenges) || '';
  document.getElementById('b-notes').value = (task && task.notes) || '';

  // Reset to Details tab
  switchDrawerTab('b', 'details');
  // Live status pill — only when editing existing (not for asNew duplicates)
  const livePill = document.getElementById('b-live-status-pill');
  if (task && task.id && !asNew) { livePill.style.display = ''; } else { livePill.style.display = 'none'; }
  updateLiveStatusPill('bau');

  const catSel = document.getElementById('b-category');
  const catWrap = document.getElementById('b-custom-cat-wrap');
  const catCustom = document.getElementById('b-category-custom');
  const cat = (task && task.category) || 'Network Security';
  if (BAU_PREDEFINED_CATS.indexOf(cat) >= 0) { catSel.value = cat; catWrap.classList.remove('show'); catCustom.value = ''; }
  else if (cat) { catSel.value = '__OTHER__'; catWrap.classList.add('show'); catCustom.value = cat; }
  else { catSel.value = 'Network Security'; catWrap.classList.remove('show'); catCustom.value = ''; }
  // Populate Tool dropdown based on selected category + saved tool
  populateBauToolDropdown(catSel.value === '__OTHER__' ? '' : catSel.value, (task && task.tool) || '');

  document.getElementById('b-delete-btn').style.display = (task && task.id && !asNew) ? 'inline-flex' : 'none';

  // Sub-task section — always visible (see openProjectDrawer for rationale). Duplicate does NOT carry sub-tasks.
  const subSec = document.getElementById('b-subtask-section');
  const subList = document.getElementById('b-subtask-list');
  subSec.style.display = '';
  drawerSubtasks.bau = [];
  if (task && task.id && !asNew) {
    subList.innerHTML = '<div class="subtask-hint">Loading sub-tasks…</div>';
    loadSubtasksIntoDrawer('bau', task.id);
  } else {
    renderSubtaskSection('bau', []);
  }

  document.getElementById('drawer-bau').classList.add('open');
  document.getElementById('overlay-bau').classList.add('open');
  setTimeout(() => document.getElementById('b-name').focus(), 250);
}

function handleOngoingToggle() {
  const checked = document.getElementById('b-is-ongoing').checked;
  const dateInput = document.getElementById('b-next-due');
  dateInput.style.display = checked ? 'none' : '';
  if (checked) dateInput.value = '';
}
async function closeBauDrawer() {
  document.getElementById('drawer-bau').classList.remove('open');
  document.getElementById('overlay-bau').classList.remove('open');
  editingBauId = null;
  try {
    allBau = await api.list('bau');
    allSubtasks = await fetch('/api/subtasks/all').then(r => r.ok ? r.json() : []);
    renderBau();
    renderDeadlines();
  } catch (_) {}
}
function editBau(id) {
  const t = allBau.find(x => x.id === id);
  if (t) openBauDrawer(t);
}
async function saveBau(e) {
  e.preventDefault();
  const btn = document.getElementById('b-save-btn');
  btn.innerHTML = '<span class="loader"></span> SAVING'; btn.disabled = true;

  const catVal = document.getElementById('b-category').value;
  const catCustom = document.getElementById('b-category-custom').value.trim();
  let finalCategory;
  if (catVal === '__OTHER__') {
    if (!catCustom) { showToast('Custom category name required', true); btn.innerHTML = 'Save'; btn.disabled = false; return; }
    finalCategory = catCustom;
  } else { finalCategory = catVal; }

  // Tool (optional)
  const toolVal = document.getElementById('b-tool').value;
  const toolCustom = document.getElementById('b-tool-custom').value.trim();
  let finalTool = null;
  if (toolVal === '__OTHER__') finalTool = toolCustom || null;
  else if (toolVal) finalTool = toolVal;

  const isOngoing = document.getElementById('b-is-ongoing').checked;
  const data = {
    id: document.getElementById('b-id').value || null,
    name: document.getElementById('b-name').value.trim(),
    owner: document.getElementById('b-owner').value.trim(),
    secondary_owner: document.getElementById('b-secondary-owner').value.trim() || null,
    category: finalCategory,
    tool: finalTool,
    frequency: document.getElementById('b-frequency').value,
    priority: document.getElementById('b-priority').value,
    status: document.getElementById('b-status').value,
    last_performed: document.getElementById('b-last-performed').value || null,
    next_due: isOngoing ? null : (document.getElementById('b-next-due').value || null),
    is_ongoing: isOngoing ? 1 : 0,
    challenges: document.getElementById('b-challenges').value.trim(),
    notes: document.getElementById('b-notes').value.trim(),
  };

  try {
    const saved = await api.save('bau', data);
    if (data.id) clearAuditCache('bau', data.id);
    if (!data.id && saved && saved.id) {
      await flushPendingSubtasks('bau', saved.id);
      try { allSubtasks = await fetch('/api/subtasks/all').then(r => r.ok ? r.json() : allSubtasks); } catch (_) {}
    }
    allBau = await api.list('bau');
    renderBau();
    closeBauDrawer();
    showToast(data.id ? 'BAU task updated' : 'BAU task logged');
  } catch (err) { showToast(err.message || 'Save failed', true); }
  finally { btn.innerHTML = 'Save'; btn.disabled = false; }
}
async function deleteBau() {
  if (!editingBauId) return;
  const id = editingBauId;
  const ok = await deleteBauById(id, { skipRender: true });
  if (ok) {
    renderBau();
    closeBauDrawer();
  }
}
// Soft-delete (archive) a BAU task by id — usable from the row menu without an open drawer.
async function deleteBauById(id, opts) {
  if (!id) return false;
  const t = allBau.find(x => x.id === id);
  const name = t ? (t.name || 'this task') : 'this task';
  if (!confirm('Move "' + name + '" to archive? It will be permanently deleted after 30 days.')) return false;
  try {
    await api.remove('bau', id);
    clearAuditCache('bau', id);
    allBau = await api.list('bau');
    if (!(opts && opts.skipRender)) renderBau();
    showToast('BAU task moved to archive');
    if (archiveOpen) loadArchive();
    return true;
  } catch (err) { showToast(err.message || 'Delete failed', true); return false; }
}

// ============== UI HELPERS ==============
// ============== THEME TOGGLE ==============
function toggleTheme() {
  const isLight = document.body.classList.toggle('theme-light');
  const next = isLight ? 'light' : 'dark';
  try { localStorage.setItem('secops-theme', next); } catch (_) {}
  updateThemeLabel();
}

function updateThemeLabel() {
  const lbl = document.querySelector('.theme-label-text');
  const btn = document.getElementById('theme-toggle');
  if (!lbl) return;
  const isLight = document.body.classList.contains('theme-light');
  // Button shows the theme you'll switch TO
  lbl.textContent = isLight ? 'Dark' : 'Light';
  if (btn) btn.title = 'Switch to ' + (isLight ? 'dark' : 'light') + ' mode';
}

(function initTheme() {
  try {
    const saved = localStorage.getItem('secops-theme');
    if (saved === 'light') document.body.classList.add('theme-light');
  } catch (_) {}
  // Update label once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateThemeLabel);
  } else {
    updateThemeLabel();
  }
})();

function showToast(msg, isError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('err', !!isError);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
function setHeaderDate() {
  const d = new Date();
  const txt = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase() + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const main = document.getElementById('header-date');
  if (main) main.textContent = txt;
  const mob = document.getElementById('header-date-mobile');
  if (mob) mob.textContent = txt;
}

// ============== REFRESH ==============
let lastRefreshAt = null;

function updateRefreshTimeLabel() {
  const el = document.getElementById('refresh-time');
  if (!el || !lastRefreshAt) return;
  const ms = Date.now() - lastRefreshAt;
  const mins = Math.floor(ms / 60000);
  let label;
  if (mins < 1) label = 'just now';
  else if (mins === 1) label = '1m ago';
  else if (mins < 60) label = mins + 'm ago';
  else {
    const hrs = Math.floor(mins / 60);
    label = hrs === 1 ? '1h ago' : hrs + 'h ago';
  }
  el.textContent = label;
}

async function refreshData(opts) {
  const btn = document.getElementById('refresh-btn');
  if (btn.disabled) return;  // Prevent double-clicks
  const silent = opts && opts.silent;
  // A deliberate manual refresh (button / Ctrl+R) replays the entry animations.
  // Inline edits and filter changes do NOT pass this, so they still render instantly.
  if (opts && opts.replayAnim) dashboardEntryAnimated = false;

  btn.disabled = true;
  btn.classList.add('spinning');

  try {
    // Fetch all three in parallel for speed
    const [projects, bau, subtasks] = await Promise.all([
      api.list('projects'),
      api.list('bau'),
      fetch('/api/subtasks/all').then(r => r.ok ? r.json() : []).catch(() => []),
    ]);
    allProjects = projects;
    allBau = bau;
    allSubtasks = subtasks;
    renderProjects();
    renderBau();
    if (heatmapOpen) renderHeatmap();
    renderDeadlines();
    lastRefreshAt = Date.now();
    updateRefreshTimeLabel();
    if (!silent) showToast('Data refreshed · ' + projects.length + ' project' + (projects.length === 1 ? '' : 's') + ', ' + bau.length + ' BAU task' + (bau.length === 1 ? '' : 's'));
  } catch (err) {
    showToast('Refresh failed: ' + (err.message || 'check connection'), true);
  } finally {
    btn.classList.remove('spinning');
    btn.disabled = false;
  }
}

// ============== WORKLOAD HEATMAP ==============
// Always-on now (no collapse). heatmapOpen retained so existing render gates still work.
let heatmapOpen = true;
let heatmapFilter = 'all'; // 'all' | 'projects' | 'bau'
let heatmapIncludeSecondary = false; // toggle: include secondary PIC in workload count

function toggleHeatmap() { /* no-op — heatmap is always visible on Dashboard */ }

function setHeatmapFilter(mode) {
  heatmapFilter = mode;
  renderHeatmap();
}

function toggleHeatmapSecondary() {
  heatmapIncludeSecondary = !heatmapIncludeSecondary;
  renderHeatmap();
}

function getWeekKey(date) {
  // ISO week: Monday-based, returns "YYYY-Www"
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return d.getUTCFullYear() + '-W' + String(weekNo).padStart(2, '0');
}

function getWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekColumns(numWeeks) {
  const today = new Date();
  const monday = getWeekMonday(today);
  // Start 1 week before current week
  monday.setDate(monday.getDate() - 7);
  const weeks = [];
  for (let i = 0; i < numWeeks; i++) {
    const start = new Date(monday);
    start.setDate(monday.getDate() + (i * 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const key = getWeekKey(start);
    const isCurrent = getWeekKey(today) === key;
    const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    weeks.push({ key, start, end, isCurrent, label: 'W' + key.split('-W')[1], range: startLabel + '–' + endLabel });
  }
  return weeks;
}

function heatmapLevel(count) {
  if (count === 0) return 0;
  if (count <= 1) return 1;
  if (count <= 2) return 2;
  if (count <= 3) return 3;
  if (count <= 4) return 4;
  if (count <= 5) return 5;
  return 6;
}

function renderHeatmap() {
  const container = document.getElementById('heatmap-content');
  const NUM_WEEKS = 9; // 1 past + current + 7 future
  const weeks = getWeekColumns(NUM_WEEKS);
  const mode = heatmapFilter;

  // Collect all owners from both projects and BAU (primary and optionally secondary)
  const ownerSet = new Set();
  if (mode === 'all' || mode === 'projects') {
    allProjects.forEach(p => {
      if (p.owner) ownerSet.add(p.owner);
      if (heatmapIncludeSecondary && p.secondary_owner) ownerSet.add(p.secondary_owner);
    });
  }
  if (mode === 'all' || mode === 'bau') {
    allBau.forEach(t => {
      if (t.owner) ownerSet.add(t.owner);
      if (heatmapIncludeSecondary && t.secondary_owner) ownerSet.add(t.secondary_owner);
    });
  }
  const owners = [...ownerSet].sort();

  // Filter bar
  let html = '<div class="heatmap-filter">';
  html += '<button class="heatmap-filter-btn' + (mode === 'all' ? ' active' : '') + '" onclick="setHeatmapFilter(\\'all\\')">All</button>';
  html += '<button class="heatmap-filter-btn' + (mode === 'projects' ? ' active' : '') + '" onclick="setHeatmapFilter(\\'projects\\')">Projects</button>';
  html += '<button class="heatmap-filter-btn' + (mode === 'bau' ? ' active' : '') + '" onclick="setHeatmapFilter(\\'bau\\')">BAU</button>';
  html += '<div style="flex:1"></div>';
  html += '<button class="heatmap-filter-btn' + (heatmapIncludeSecondary ? ' active' : '') + '" onclick="toggleHeatmapSecondary()" title="Include secondary PIC in workload count">+ Secondary PIC</button>';
  html += '</div>';

  if (owners.length === 0) {
    html += '<div class="heatmap-empty">No data yet — add projects or BAU tasks to see the heatmap.</div>';
    container.innerHTML = html;
    return;
  }

  // Build matrix: owner → weekKey → { count, items[] }
  const matrix = {};
  owners.forEach(o => {
    matrix[o] = {};
    weeks.forEach(w => { matrix[o][w.key] = { count: 0, items: [] }; });
  });

  // Projects: use target_date
  if (mode === 'all' || mode === 'projects') {
    allProjects.forEach(p => {
      if (!p.target_date || p.status === 'Completed') return;
      const d = new Date(p.target_date);
      if (isNaN(d)) return;
      const wk = getWeekKey(d);
      // Primary owner
      if (p.owner && matrix[p.owner] && matrix[p.owner][wk]) {
        matrix[p.owner][wk].count++;
        matrix[p.owner][wk].items.push('📋 ' + p.name);
      }
      // Secondary owner (if toggle enabled)
      if (heatmapIncludeSecondary && p.secondary_owner && matrix[p.secondary_owner] && matrix[p.secondary_owner][wk]) {
        matrix[p.secondary_owner][wk].count++;
        matrix[p.secondary_owner][wk].items.push('📋 ' + p.name + ' (2°)');
      }
    });
  }

  // BAU: use next_due
  if (mode === 'all' || mode === 'bau') {
    allBau.forEach(t => {
      if (t.is_ongoing || !t.next_due || t.status === 'Completed' || t.status === 'Paused') return;
      const d = new Date(t.next_due);
      if (isNaN(d)) return;
      const wk = getWeekKey(d);
      // Primary owner
      if (t.owner && matrix[t.owner] && matrix[t.owner][wk]) {
        matrix[t.owner][wk].count++;
        matrix[t.owner][wk].items.push('🔄 ' + t.name);
      }
      // Secondary owner (if toggle enabled)
      if (heatmapIncludeSecondary && t.secondary_owner && matrix[t.secondary_owner] && matrix[t.secondary_owner][wk]) {
        matrix[t.secondary_owner][wk].count++;
        matrix[t.secondary_owner][wk].items.push('🔄 ' + t.name + ' (2°)');
      }
    });
  }

  const cols = NUM_WEEKS;
  const gridCols = '140px ' + ('1fr '.repeat(cols)).trim();

  html += '<div class="heatmap-grid-wrap"><div class="heatmap-grid" style="grid-template-columns: ' + gridCols + ';">';

  // Header row
  html += '<div class="heatmap-corner">Owner</div>';
  weeks.forEach(w => {
    html += '<div class="heatmap-col-head' + (w.isCurrent ? ' current' : '') + '">' +
      '<span class="hw-label">' + w.label + '</span>' +
      '<span class="hw-range">' + w.range + '</span></div>';
  });

  // Data rows
  owners.forEach(o => {
    html += '<div class="heatmap-row-head"><span class="avatar" style="width:24px;height:24px;font-size:10px;background:linear-gradient(135deg,' + ownerColor(o) + ',var(--blue));">' + initials(o) + '</span>' + escapeHtml(o) + '</div>';
    weeks.forEach(w => {
      const cell = matrix[o][w.key];
      const level = heatmapLevel(cell.count);
      const tooltip = cell.items.length > 0 ? escapeHtml(cell.items.join('\\n')) : 'No tasks due';
      html += '<div class="heatmap-cell level-' + level + (w.isCurrent ? ' current-week' : '') + '" title="' + escapeHtml(o) + ' · ' + w.label + '\\n' + tooltip + '">' + (cell.count > 0 ? cell.count : '·') + '</div>';
    });
  });

  // Totals row
  html += '<div class="heatmap-totals-head">Total</div>';
  weeks.forEach(w => {
    let weekTotal = 0;
    owners.forEach(o => { weekTotal += matrix[o][w.key].count; });
    html += '<div class="heatmap-cell total-cell' + (w.isCurrent ? ' current-week' : '') + '">' + weekTotal + '</div>';
  });

  html += '</div></div>';

  // Legend
  html += '<div class="heatmap-legend">';
  html += '<span class="heatmap-legend-label">Load:</span>';
  const legendLevels = [
    { level: 0, label: 'None' },
    { level: 1, label: '1' },
    { level: 2, label: '2' },
    { level: 3, label: '3' },
    { level: 4, label: '4' },
    { level: 5, label: '5' },
    { level: 6, label: '6+' },
  ];
  legendLevels.forEach(l => {
    html += '<span class="heatmap-legend-box level-' + l.level + '" style="display:inline-flex;align-items:center;justify-content:center;font-size:9px;">' + (l.level === 0 ? '·' : '') + '</span>';
  });
  html += '<span style="margin-left:4px;">0</span><span>→</span><span>6+</span>';
  html += '<span style="margin-left: 18px; color: var(--cyan);">▪</span><span>Current week</span>';
  html += '</div>';

  container.innerHTML = html;

  // Update subtitle
  const modeLabel = mode === 'projects' ? 'projects only' : mode === 'bau' ? 'BAU only' : 'all tasks';
  let totalTasks = 0;
  if (mode === 'all' || mode === 'projects') totalTasks += allProjects.filter(p => p.target_date && p.status !== 'Completed').length;
  if (mode === 'all' || mode === 'bau') totalTasks += allBau.filter(t => t.next_due && !t.is_ongoing && t.status !== 'Completed' && t.status !== 'Paused').length;
  document.getElementById('heatmap-sub').textContent = owners.length + ' owners · ' + totalTasks + ' scheduled (' + modeLabel + ') · ' + NUM_WEEKS + ' weeks';
}

// ============== DUE DATE CALENDAR ==============
let calendarOpen = true;
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();

function toggleCalendar() { /* no-op — calendar is always visible on Dashboard */ }

function calPrev() {
  calendarMonth--;
  if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
  renderCalendar();
}
function calNext() {
  calendarMonth++;
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  renderCalendar();
}
function calToday() {
  const now = new Date();
  calendarMonth = now.getMonth();
  calendarYear = now.getFullYear();
  renderCalendar();
}

// ============== UPCOMING DEADLINES LIST ==============
// Pulls from allProjects (target_date) + allBau (next_due), filtered to the active time window.
// Time window: 7 / 14 / 30 days. Default 14. Held in deadlinesDays.
let deadlinesDays = 14;
function setDeadlinesWindow(days) {
  deadlinesDays = days;
  document.querySelectorAll('.deadlines-window-btn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.days) === days);
  });
  renderDeadlines();
}
function renderDeadlines() {
  const container = document.getElementById('deadlines-content');
  if (!container) return;
  const sub = document.getElementById('deadlines-sub');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() + deadlinesDays);

  // Build the unified item list
  const items = [];
  (allProjects || []).forEach(p => {
    if (!p.target_date) return;
    if (p.status === 'Completed' || p.status === 'On Hold') return;
    const d = new Date(p.target_date); d.setHours(0, 0, 0, 0);
    if (d > cutoff) return; // outside window
    // Include overdue (d < today) so they appear at the top
    items.push({
      kind: 'project', id: p.id, name: p.name, owner: p.owner,
      category: p.category, dateISO: p.target_date, date: d,
    });
  });
  (allBau || []).forEach(t => {
    if (!t.next_due || t.is_ongoing) return;
    if (t.status === 'Completed' || t.status === 'Paused') return;
    const d = new Date(t.next_due); d.setHours(0, 0, 0, 0);
    if (d > cutoff) return;
    items.push({
      kind: 'bau', id: t.id, name: t.name, owner: t.owner,
      category: t.category, dateISO: t.next_due, date: d,
    });
  });
  // Sort by date ascending (oldest/most-overdue first)
  items.sort((a, b) => a.date - b.date);

  if (sub) sub.textContent = '// next ' + deadlinesDays + ' days · ' + items.length + ' item' + (items.length === 1 ? '' : 's');

  if (items.length === 0) {
    container.innerHTML = '<div class="deadlines-empty">▸ Nothing due in the next ' + deadlinesDays + ' days. You\\'re clear.</div>';
    return;
  }

  // Cap visible rows to keep the dashboard compact; surplus shown as a footer line
  const VISIBLE = 8;
  const visibleItems = items.slice(0, VISIBLE);
  const overflow = items.length - VISIBLE;

  let html = '';
  visibleItems.forEach(it => {
    const days = Math.round((it.date - today) / 86400000);
    let whenText, whenCls;
    if (days < 0) {
      whenText = days === -1 ? 'YESTERDAY' : Math.abs(days) + ' DAYS LATE';
      whenCls = 'overdue';
    } else if (days === 0) { whenText = 'TODAY'; whenCls = 'today'; }
    else if (days === 1) { whenText = 'TOMORROW'; whenCls = 'soon'; }
    else if (days <= 3)  { whenText = 'IN ' + days + ' DAYS'; whenCls = 'soon'; }
    else                  { whenText = 'IN ' + days + ' DAYS'; whenCls = 'later'; }

    const typeCls = it.kind === 'project' ? 'proj' : 'bau';
    const typeLabel = it.kind === 'project' ? 'PROJ' : 'BAU';
    const openFn = it.kind === 'project'
      ? "openProjectDrawer(allProjects.find(x => x.id === '" + it.id + "'))"
      : "openBauDrawer(allBau.find(x => x.id === '" + it.id + "'))";

    // Category tag — reuses category color but as a compact tag (no icon to keep row tight)
    let catTag = '';
    if (it.category) {
      const color = catBadgeColor(it.category);
      const shortName = it.category.replace('Identity & Access Management', 'IAM')
        .replace('Web & Application Security', 'WEB & APP')
        .replace(' Security', '').replace(' & Audit', '');
      catTag = '<span class="deadlines-cat-tag" style="color:' + color + '; background:' + color + '1A; border-color:' + color + '59;">' + escapeHtml(shortName) + '</span>';
    } else {
      catTag = '<span></span>';
    }

    // Owner cell with avatar
    let ownerCell = '<span></span>';
    if (it.owner) {
      const initial = (it.owner[0] || '?').toUpperCase();
      ownerCell = '<span class="deadlines-owner-cell"><span class="avatar" style="background:' + ownerColor(it.owner) + ';">' + escapeHtml(initial) + '</span><span class="owner-name">' + escapeHtml(it.owner) + '</span></span>';
    }

    html += '<div class="deadlines-row" onclick="' + openFn + '" title="Open ' + escapeHtml(it.name) + '">' +
      '<span class="deadlines-when ' + whenCls + '">' + whenText + '</span>' +
      '<span class="deadlines-type-badge ' + typeCls + '">' + typeLabel + '</span>' +
      '<span class="deadlines-name">' + escapeHtml(it.name) + '</span>' +
      catTag +
      ownerCell +
      '<span class="deadlines-arrow">▸</span>' +
    '</div>';
  });
  if (overflow > 0) {
    html += '<div class="deadlines-footer">+ ' + overflow + ' more item' + (overflow === 1 ? '' : 's') + ' in the next ' + deadlinesDays + ' days · view in the tables</div>';
  }
  container.innerHTML = html;
}

function renderCalendar() {
  const container = document.getElementById('calendar-content');
  if (!container) return; // calendar widget removed from dashboard; safe no-op
  const year = calendarYear;
  const month = calendarMonth;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Build date → tasks map
  const dateMap = {};

  allProjects.forEach(p => {
    if (!p.target_date || !p.owner) return;
    const key = p.target_date.slice(0, 10);
    if (!dateMap[key]) dateMap[key] = [];
    dateMap[key].push({
      type: 'project',
      name: p.name,
      owner: p.owner,
      status: p.status,
      isOverdue: p.status !== 'Completed' && new Date(p.target_date) < today
    });
  });

  allBau.forEach(t => {
    if (!t.next_due || !t.owner || t.is_ongoing) return;
    const key = t.next_due.slice(0, 10);
    if (!dateMap[key]) dateMap[key] = [];
    dateMap[key].push({
      type: 'bau',
      name: t.name,
      owner: t.owner,
      status: t.status,
      isOverdue: t.status !== 'Completed' && t.status !== 'Paused' && new Date(t.next_due) < today
    });
  });

  // Sub-tasks with due dates — find the parent for context
  (allSubtasks || []).forEach(s => {
    if (!s.due_date) return;
    let parent = null;
    if (s.parent_type === 'project') parent = allProjects.find(p => p.id === s.parent_id);
    else if (s.parent_type === 'bau') parent = allBau.find(b => b.id === s.parent_id);
    if (!parent) return; // orphaned (parent archived) — skip
    const key = s.due_date.slice(0, 10);
    if (!dateMap[key]) dateMap[key] = [];
    dateMap[key].push({
      type: 'subtask',
      name: s.title + ' ↳ ' + parent.name,
      owner: s.owner || parent.owner,
      status: s.status,
      isOverdue: s.status !== 'Completed' && new Date(s.due_date) < today
    });
  });

  // Calculate grid days (Monday-start)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Day of week: 0=Sun → convert to Mon-based: Mon=0, Tue=1, ..., Sun=6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

  // Count tasks this month
  let monthTaskCount = 0;
  let monthOverdueCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    if (dateMap[key]) {
      monthTaskCount += dateMap[key].length;
      monthOverdueCount += dateMap[key].filter(t => t.isOverdue).length;
    }
  }

  let html = '';

  // Navigation
  html += '<div class="cal-nav">';
  html += '<button class="cal-nav-btn" onclick="calPrev()" title="Previous month">◀</button>';
  html += '<div class="cal-nav-title">' + monthNames[month] + ' ' + year + '</div>';
  html += '<button class="cal-nav-btn" onclick="calNext()" title="Next month">▶</button>';
  html += '<button class="cal-nav-today" onclick="calToday()">Today</button>';
  html += '</div>';

  // Grid
  html += '<div class="cal-grid">';

  // Day headers
  dayNames.forEach(d => {
    html += '<div class="cal-day-head">' + d + '</div>';
  });

  // Day cells
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startDow + 1;
    const isOutside = dayNum < 1 || dayNum > daysInMonth;

    let cellDate, cellKey;
    if (!isOutside) {
      cellDate = new Date(year, month, dayNum);
      cellKey = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(dayNum).padStart(2, '0');
    } else {
      // Calculate the actual date for outside cells
      cellDate = new Date(year, month, dayNum);
      cellKey = cellDate.getFullYear() + '-' + String(cellDate.getMonth() + 1).padStart(2, '0') + '-' + String(cellDate.getDate()).padStart(2, '0');
    }

    const tasks = dateMap[cellKey] || [];
    const isToday = cellKey === todayStr;
    const hasOverdue = tasks.some(t => t.isOverdue);
    const hasProject = tasks.some(t => t.type === 'project');
    const hasBau = tasks.some(t => t.type === 'bau');

    let classes = 'cal-day';
    if (isOutside) classes += ' outside';
    if (isToday) classes += ' today';
    if (hasOverdue && !isOutside) classes += ' has-overdue';

    html += '<div class="' + classes + '">';
    html += '<div class="cal-day-num">' + cellDate.getDate() + '</div>';

    // Dot indicator
    if (tasks.length > 0 && !isOutside) {
      const dotType = (hasProject && hasBau) ? 'mixed' : hasProject ? 'project' : 'bau';
      html += '<div class="cal-day-dot ' + dotType + '"></div>';
    }

    // Task chips (max 3 visible, then "+N more")
    const MAX_CHIPS = 3;
    const visible = tasks.slice(0, MAX_CHIPS);
    visible.forEach(t => {
      const chipClass = t.isOverdue ? 'overdue' : t.type;
      const avatarBg = 'background:linear-gradient(135deg,' + ownerColor(t.owner) + ',var(--blue))';
      html += '<div class="cal-chip ' + chipClass + '" title="' + escapeHtml(t.name) + ' (' + escapeHtml(t.owner) + ') — ' + escapeHtml(t.status) + '">';
      html += '<span class="cal-chip-avatar" style="' + avatarBg + '">' + initials(t.owner) + '</span>';
      html += '<span class="cal-chip-name">' + escapeHtml(t.name) + '</span>';
      html += '</div>';
    });

    if (tasks.length > MAX_CHIPS) {
      html += '<div class="cal-more">+' + (tasks.length - MAX_CHIPS) + ' more</div>';
    }

    html += '</div>';
  }

  html += '</div>';

  // Legend
  html += '<div class="cal-legend">';
  html += '<div class="cal-legend-item"><span class="cal-legend-swatch project"></span> Project due</div>';
  html += '<div class="cal-legend-item"><span class="cal-legend-swatch bau"></span> BAU due</div>';
  html += '<div class="cal-legend-item"><span class="cal-legend-swatch subtask"></span> Sub-task due</div>';
  html += '<div class="cal-legend-item"><span class="cal-legend-swatch overdue"></span> Overdue</div>';
  html += '<div class="cal-legend-item"><span class="cal-legend-swatch today-sw"></span> Today</div>';
  html += '</div>';

  container.innerHTML = html;

  // Update subtitle
  const sub = document.getElementById('calendar-sub');
  let subText = monthNames[month] + ' ' + year + ' · ' + monthTaskCount + ' task' + (monthTaskCount === 1 ? '' : 's') + ' due';
  if (monthOverdueCount > 0) subText += ' · ' + monthOverdueCount + ' overdue';
  sub.textContent = subText;
}

// ============== ARCHIVE ==============
let archiveOpen = false;

function toggleArchive() {
  archiveOpen = !archiveOpen;
  document.getElementById('archive-toggle').classList.toggle('open', archiveOpen);
  document.getElementById('archive-body').classList.toggle('open', archiveOpen);
  if (archiveOpen) loadArchive();
}

async function loadArchive() {
  const container = document.getElementById('archive-content');
  container.innerHTML = '<div class="archive-empty"><span class="loader"></span> Loading archive…</div>';

  try {
    const r = await fetch('/api/archive');
    if (!r.ok) throw new Error('Failed to fetch');
    const data = await r.json();
    const items = [
      ...(data.projects || []).map(p => ({ ...p, _type: 'project' })),
      ...(data.bau || []).map(t => ({ ...t, _type: 'bau' })),
    ].sort((a, b) => new Date(b.archived_at) - new Date(a.archived_at));

    if (items.length === 0) {
      container.innerHTML = '<div class="archive-empty">No archived items. Deleted projects and BAU tasks will appear here.</div>';
      document.getElementById('archive-sub').textContent = '// empty · auto-purge 30 days';
      return;
    }

    let html = '';
    items.forEach(item => {
      const archivedDate = new Date(item.archived_at);
      const now = new Date();
      const daysElapsed = Math.floor((now - archivedDate) / 86400000);
      const daysLeft = Math.max(0, 30 - daysElapsed);
      const isUrgent = daysLeft <= 5;
      const agoLabel = daysElapsed === 0 ? 'today' : daysElapsed === 1 ? '1d ago' : daysElapsed + 'd ago';

      html += '<div class="archive-item">';
      html += '<div class="archive-item-icon">🗑️</div>';
      html += '<span class="archive-item-type ' + item._type + '">' + (item._type === 'project' ? 'Project' : 'BAU') + '</span>';
      html += '<div class="archive-item-info">';
      html += '<div class="archive-item-name">' + escapeHtml(item.name) + '</div>';
      html += '<div class="archive-item-meta">';
      html += '<span>Owner: ' + escapeHtml(item.owner || '—') + '</span>';
      html += '<span>Archived: ' + agoLabel + '</span>';
      html += '</div></div>';
      html += '<div class="archive-countdown' + (isUrgent ? ' urgent' : '') + '">' + daysLeft + 'd left</div>';
      html += '<div class="archive-actions">';
      html += '<button class="archive-btn restore" onclick="restoreFromArchive(\\'' + item._type + '\\', \\'' + item.id + '\\')">Restore</button>';
      html += '<button class="archive-btn purge" onclick="permanentDelete(\\'' + item._type + '\\', \\'' + item.id + '\\', \\'' + escapeHtml(item.name).replace(/'/g, '') + '\\')">Delete</button>';
      html += '</div>';
      html += '</div>';
    });

    container.innerHTML = html;
    document.getElementById('archive-sub').textContent = items.length + ' item' + (items.length === 1 ? '' : 's') + ' · auto-purge 30 days';
  } catch (err) {
    container.innerHTML = '<div class="archive-empty" style="color:var(--st-delayed);">Could not load archive.</div>';
  }
}

async function restoreFromArchive(type, id) {
  try {
    const r = await fetch('/api/archive/restore/' + type + '/' + id, { method: 'POST' });
    if (!r.ok) throw new Error('Restore failed');
    showToast((type === 'project' ? 'Project' : 'BAU task') + ' restored');
    // Refresh active lists
    if (type === 'project') { allProjects = await api.list('projects'); renderProjects(); }
    else { allBau = await api.list('bau'); renderBau(); }
    // Refresh archive
    loadArchive();
    // Refresh heatmap/calendar if open
    if (heatmapOpen) renderHeatmap();
    renderDeadlines();
  } catch (err) {
    showToast(err.message || 'Restore failed', true);
  }
}

async function permanentDelete(type, id, name) {
  if (!confirm('Permanently delete "' + name + '"? This cannot be undone. All audit history will also be removed.')) return;
  try {
    const r = await fetch('/api/archive/' + type + '/' + id, { method: 'DELETE' });
    if (!r.ok) throw new Error('Delete failed');
    showToast('Permanently deleted');
    loadArchive();
  } catch (err) {
    showToast(err.message || 'Delete failed', true);
  }
}

// ============== PPTX REPORT GENERATOR ==============
function loadPptxGenJS() {
  if (typeof PptxGenJS !== 'undefined') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const urls = [
      'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/PptxGenJS/3.12.0/pptxgen.bundle.js',
      'https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
    ];
    let idx = 0;
    function tryNext() {
      if (idx >= urls.length) { reject(new Error('Could not load PptxGenJS from any CDN')); return; }
      const s = document.createElement('script');
      s.src = urls[idx++];
      s.onload = () => resolve();
      s.onerror = () => { s.remove(); tryNext(); };
      document.head.appendChild(s);
    }
    tryNext();
  });
}

async function fetchImageBase64(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) { return null; }
}

async function generateReport() {
  const btn = document.getElementById('report-btn');
  btn.disabled = true;
  btn.querySelector('.refresh-label').textContent = 'Loading…';

  try {
    await loadPptxGenJS();
  } catch (err) {
    showToast('Failed to load report library. Try a different browser or check network.', true);
    btn.disabled = false;
    btn.querySelector('.refresh-label').textContent = 'Report';
    return;
  }

  btn.querySelector('.refresh-label').textContent = 'Generating…';

  try {
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
    pptx.layout = 'WIDE';
    // ── 2-SLIDE LAYOUT ──
    // Slide 1: KPIs (projects) + Project table + Status donut + Workload bars
    // Slide 2: KPIs (BAU)      + BAU table    + Freq donut   + Priority bars

    // ── Palette ──
    const BLACK      = '1A1A1A';
    const DARK       = '333333';
    const GRAY       = '666666';
    const LGRAY      = '999999';
    const VLGRAY     = 'E5E5E5';
    const BG         = 'FAFAFA';
    const WHITE      = 'FFFFFF';
    const CYAN       = '0891B2';
    const TEAL       = '14B8A6';
    const GREEN      = '059669';
    const YELLOW     = 'D97706';
    const RED        = 'DC2626';
    const BLUE       = '2563EB';
    const PURPLE     = 'A855F7';
    const OVERDUE_BG = 'FEE2E2';  // light red  — delayed projects / overdue BAU
    const ATRISK_BG  = 'FEF3C7';  // light amber — at-risk / on-hold projects

    const today   = new Date();
    const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // ── Fetch metric snapshot (current + baseline ~7 days ago) ──
    let snapshot = { current: null, baseline: null };
    try {
      const r = await fetch('/api/metrics/snapshot');
      if (r.ok) snapshot = await r.json();
    } catch (_) { /* trends optional */ }
    function trendBadge(currentVal, baselineKey) {
      if (!snapshot.baseline || snapshot.baseline[baselineKey] == null) return null;
      const delta = currentVal - snapshot.baseline[baselineKey];
      if (delta === 0) return { text: '— 0', color: GRAY };
      if (delta > 0)  return { text: '▲ ' + delta, color: GREEN };
      return { text: '▼ ' + Math.abs(delta), color: RED };
    }
    // For metrics where a DECREASE is good (overdue, delayed, critical), invert color
    function trendBadgeInverse(currentVal, baselineKey) {
      if (!snapshot.baseline || snapshot.baseline[baselineKey] == null) return null;
      const delta = currentVal - snapshot.baseline[baselineKey];
      if (delta === 0) return { text: '— 0', color: GRAY };
      if (delta > 0)  return { text: '▲ ' + delta, color: RED };
      return { text: '▼ ' + Math.abs(delta), color: GREEN };
    }

    // ── Shared helpers ──
    function statusColor(s) {
      if (s === 'On Track' || s === 'Active' || s === 'Completed') return GREEN;
      if (s === 'At Risk' || s === 'On Hold') return YELLOW;
      if (s === 'Delayed' || s === 'Overdue' || s === 'Blocked') return RED;
      return GRAY;
    }

    function statusBg(s) {
      // Soft tinted background for pill effect
      if (s === 'On Track' || s === 'Active' || s === 'Completed') return 'D1FAE5';  // light green
      if (s === 'At Risk' || s === 'On Hold') return 'FEF3C7';  // light yellow
      if (s === 'Delayed' || s === 'Overdue' || s === 'Blocked') return 'FEE2E2';  // light red
      if (s === 'In Progress') return 'DBEAFE';  // light blue
      return 'F3F4F6';  // light gray
    }

    function statusText(s) {
      // Darker text for contrast on tinted bg
      if (s === 'On Track' || s === 'Active' || s === 'Completed') return '065F46';
      if (s === 'At Risk' || s === 'On Hold') return '92400E';
      if (s === 'Delayed' || s === 'Overdue' || s === 'Blocked') return '991B1B';
      if (s === 'In Progress') return '1E40AF';
      return '374151';
    }

    const logoData = null; // corporate logo removed for public version

    const slide = pptx.addSlide();
    slide.background = { color: WHITE };

    // ═══════════════════════════════════════════
    // TITLE (in body, no header bar)
    // ═══════════════════════════════════════════
    slide.addText('SecOps Project Overview', { x: 0.4, y: 0.25, w: 10, h: 0.4, fontSize: 22, fontFace: 'Calibri', color: 'F7040A', bold: true, valign: 'middle' });
    slide.addText('IT Security Operations · ' + dateStr + ' · Page 1 of 2', { x: 0.4, y: 0.6, w: 10, h: 0.25, fontSize: 10, fontFace: 'Calibri', color: GRAY, valign: 'middle' });

    // ═══════════════════════════════════════════
    // KPI CARDS
    // ═══════════════════════════════════════════
    const onTrack = allProjects.filter(p => p.status === 'On Track').length;
    const atRisk = allProjects.filter(p => p.status === 'At Risk' || p.status === 'On Hold').length;
    const delayed = allProjects.filter(p => p.status === 'Delayed').length;
    const completed = allProjects.filter(p => p.status === 'Completed').length;
    const activeBau = allBau.filter(t => t.status !== 'Completed' && t.status !== 'Paused');
    const overdueBau = allBau.filter(t => {
      if (!t.next_due || t.is_ongoing || t.status === 'Completed' || t.status === 'Paused') return false;
      return new Date(t.next_due) < today;
    }).length;
    const avgProgress = allProjects.length > 0
      ? Math.round(allProjects.reduce((s, p) => s + (p.progress || 0), 0) / allProjects.length)
      : 0;

    const kpis = [
      { label: 'TOTAL PROJECTS', value: String(allProjects.length), color: CYAN, sub: 'in portfolio',                                                trend: trendBadge(allProjects.length, 'total_projects') },
      { label: 'ON TRACK',       value: String(onTrack),            color: GREEN, sub: 'healthy',                                                    trend: trendBadge(onTrack, 'proj_on_track') },
      { label: 'AT RISK',        value: String(atRisk),             color: atRisk > 0 ? YELLOW : GREEN, sub: atRisk > 0 ? 'watch closely' : 'all clear', trend: trendBadgeInverse(atRisk, 'proj_at_risk') },
      { label: 'DELAYED',        value: String(delayed),            color: delayed > 0 ? RED : GREEN,   sub: delayed > 0 ? 'past target' : 'on schedule', trend: trendBadgeInverse(delayed, 'proj_delayed') },
      { label: 'COMPLETED',      value: String(completed),          color: BLUE, sub: 'delivered',                                                   trend: trendBadge(completed, 'proj_completed') },
      { label: 'AVG PROGRESS',   value: avgProgress + '%',          color: TEAL, sub: 'portfolio avg',                                               trend: trendBadge(avgProgress, 'proj_avg_progress') },
    ];

    const kpiW = 2.05;
    const kpiH = 0.95;
    const kpiStartX = 0.4;
    const kpiY = 1.05;
    const kpiGap = 0.07;

    kpis.forEach((k, i) => {
      const x = kpiStartX + i * (kpiW + kpiGap);
      // Card with colored top accent
      slide.addShape(pptx.ShapeType.rect, { x: x, y: kpiY, w: kpiW, h: kpiH, fill: { color: WHITE }, line: { color: VLGRAY, width: 0.75 } });
      slide.addShape(pptx.ShapeType.rect, { x: x, y: kpiY, w: kpiW, h: 0.05, fill: { color: k.color }, line: { color: k.color, width: 0 } });
      // Value
      slide.addText(k.value, { x: x, y: kpiY + 0.1, w: kpiW, h: 0.42, fontSize: 26, fontFace: 'Calibri', color: BLACK, bold: true, align: 'center', valign: 'middle' });
      // Label
      slide.addText(k.label, { x: x, y: kpiY + 0.5, w: kpiW, h: 0.22, fontSize: 8, fontFace: 'Calibri', color: GRAY, bold: true, align: 'center', valign: 'middle', letterSpacing: 2 });
      // Sub
      slide.addText(k.sub, { x: x, y: kpiY + 0.72, w: kpiW, h: 0.18, fontSize: 7, fontFace: 'Calibri', color: LGRAY, italic: true, align: 'center', valign: 'middle' });
      // Trend badge (top-right) — only when baseline available
      if (k.trend) {
        slide.addText(k.trend.text, { x: x + kpiW - 0.55, y: kpiY + 0.08, w: 0.50, h: 0.18, fontSize: 7, fontFace: 'Calibri', color: k.trend.color, bold: true, align: 'right', valign: 'middle' });
      }
    });

    // ═══════════════════════════════════════════
    // LEFT COLUMN: TABLES
    // ═══════════════════════════════════════════
    const LEFT_X = 0.4;
    const LEFT_W = 8.0;
    const RIGHT_X = 8.55;
    const RIGHT_W = 4.4;

    // ── PROJECT STATUS ──
    const s1ContentY = 2.10;
    const projTblY = s1ContentY;
    // Pre-compute counts for header label
    const _activeProjectCount = allProjects.filter(p => p.status !== 'Completed').length;
    slide.addShape(pptx.ShapeType.rect, { x: LEFT_X, y: projTblY, w: 0.04, h: 0.22, fill: { color: CYAN } });
    slide.addText([
      { text: '▣  ', options: { fontSize: 11, color: CYAN, bold: true } },
      { text: 'PROJECT STATUS', options: { fontSize: 9, color: BLACK, bold: true, charSpacing: 3 } },
    ], { x: LEFT_X + 0.12, y: projTblY - 0.02, w: 4, h: 0.25, fontFace: 'Calibri', valign: 'middle' });
    slide.addText(_activeProjectCount + ' active · sorted by priority', { x: LEFT_X + LEFT_W - 2.5, y: projTblY - 0.02, w: 2.5, h: 0.25, fontSize: 8, fontFace: 'Calibri', color: LGRAY, align: 'right', valign: 'middle' });

    const projHeaders = [[
      { text: 'PROJECT', options: { fontSize: 7, color: GRAY, bold: true, fill: { color: BG }, valign: 'middle' } },
      { text: 'OWNER', options: { fontSize: 7, color: GRAY, bold: true, fill: { color: BG }, valign: 'middle' } },
      { text: 'CHALLENGES', options: { fontSize: 7, color: GRAY, bold: true, fill: { color: BG }, valign: 'middle' } },
      { text: 'NEXT MILESTONE', options: { fontSize: 7, color: GRAY, bold: true, fill: { color: BG }, valign: 'middle' } },
      { text: 'STATUS', options: { fontSize: 7, color: GRAY, bold: true, fill: { color: BG }, valign: 'middle' } },
      { text: 'PROGRESS', options: { fontSize: 7, color: GRAY, bold: true, fill: { color: BG }, align: 'left', valign: 'middle' } },
      { text: 'TARGET', options: { fontSize: 7, color: GRAY, bold: true, fill: { color: BG }, valign: 'middle' } },
    ]];
    // Helper for short category labels
    function shortCat(cat) {
      if (!cat) return '';
      const map = {
        'Network Security': 'NETWORK',
        'Web & Application Security': 'WEB & APP',
        'Identity & Access Management': 'IDENTITY',
        'Endpoint & Email Security': 'ENDPOINT',
        'Cloud Security': 'CLOUD',
        'Mobile Security': 'MOBILE',
        'Security Operations': 'SEC OPS',
        'Compliance & Audit': 'COMPLIANCE',
      };
      return map[cat] || cat.toUpperCase();
    }
    function catColor(cat) {
      const map = {
        'Network Security': '0891B2',
        'Web & Application Security': '7C3AED',
        'Identity & Access Management': '059669',
        'Endpoint & Email Security': 'D97706',
        'Cloud Security': '0284C7',
        'Mobile Security': 'DB2777',
        'Security Operations': 'DC2626',
        'Compliance & Audit': '4F46E5',
      };
      return map[cat] || '6B7280';
    }

    // ── OPTION D: Filter completed/paused, sort by urgency, cap at 8 ──
    const PROJ_PRIORITY = { 'Delayed': 1, 'At Risk': 2, 'On Hold': 3, 'In Progress': 4, 'On Track': 5 };
    const projectsForTable = allProjects
      .filter(p => p.status !== 'Completed')
      .sort((a, b) => (PROJ_PRIORITY[a.status] || 99) - (PROJ_PRIORITY[b.status] || 99));
    const PROJ_TABLE_LIMIT = 8;
    const projectsShown = projectsForTable.slice(0, PROJ_TABLE_LIMIT);
    const projectsHidden = projectsForTable.length - projectsShown.length;

    // Returns severity for row tinting: 'high' = red (delayed / past target), 'medium' = amber (at risk / on hold), null = healthy.
    function projectSeverity(p) {
      if (p.status === 'Delayed') return 'high';
      if (p.target_date && new Date(p.target_date) < today && p.status !== 'Completed') return 'high';
      if (p.status === 'At Risk' || p.status === 'On Hold') return 'medium';
      return null;
    }
    const projRows = projectsShown.map((p, i) => {
      const sev = projectSeverity(p);
      const bg = sev === 'high' ? OVERDUE_BG : sev === 'medium' ? ATRISK_BG : (i % 2 === 0 ? WHITE : 'F8F9FA');
      const overdue = sev === 'high';
      const truncate = (s, n) => { if (!s) return '—'; return s.length > n ? s.slice(0, n - 1) + '…' : s; };
      const catLabel = shortCat(p.category);
      const projectNameCell = catLabel ? {
        text: [
          { text: (overdue ? '⚠ ' : '') + (p.name || ''), options: { fontSize: 8, color: BLACK, bold: true, breakLine: true } },
          { text: catLabel, options: { fontSize: 6, color: catColor(p.category), bold: true, charSpacing: 1 } },
        ],
        options: { fill: { color: bg }, valign: 'middle' }
      } : {
        text: (overdue ? '⚠ ' : '') + (p.name || ''),
        options: { fontSize: 8, color: BLACK, bold: true, fill: { color: bg }, valign: 'middle' }
      };
      const ownerCell = p.secondary_owner ? {
        text: [
          { text: p.owner || '', options: { fontSize: 8, color: DARK, bold: true, breakLine: true } },
          { text: '↳ ' + p.secondary_owner, options: { fontSize: 6, color: LGRAY, italic: true } },
        ],
        options: { fill: { color: bg }, valign: 'middle' }
      } : {
        text: p.owner || '',
        options: { fontSize: 8, color: DARK, fill: { color: bg }, valign: 'middle' }
      };
      return [
        projectNameCell,
        ownerCell,
        { text: p.challenges || '—', options: { fontSize: 7, color: p.challenges ? DARK : LGRAY, italic: !p.challenges, fill: { color: bg }, valign: 'middle' } },
        { text: p.next_milestone || '—', options: { fontSize: 7, color: p.next_milestone ? DARK : LGRAY, italic: !p.next_milestone, fill: { color: bg }, valign: 'middle' } },
        { text: p.status || '', options: { fontSize: 8, color: statusText(p.status), bold: true, fill: { color: statusBg(p.status) }, valign: 'middle', align: 'center' } },
        { text: (function(){
          const pct = p.progress || 0;
          const filled = Math.round(pct / 10);
          const bar = '■'.repeat(filled) + '□'.repeat(10 - filled);
          return bar + '  ' + pct + '%';
        })(), options: { fontSize: 8, color: DARK, align: 'left', fill: { color: bg }, valign: 'middle', fontFace: 'Calibri' } },
        { text: p.target_date ? new Date(p.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—', options: { fontSize: 7, color: GRAY, fill: { color: bg }, valign: 'middle' } },
      ];
    });

    slide.addTable([...projHeaders, ...projRows], {
      x: LEFT_X, y: projTblY + 0.28, w: LEFT_W,
      colW: [1.4, 0.7, 1.3, 1.3, 0.95, 1.15, 1.2],
      border: { type: 'solid', pt: 0.3, color: VLGRAY },
      rowH: 0.32,
      margin: [3, 5, 3, 5],
      fontFace: 'Calibri',
    });

    // Overflow note for projects
    if (projectsHidden > 0) {
      slide.addText('+ ' + projectsHidden + ' more project' + (projectsHidden === 1 ? '' : 's') + ' — see full list in SecOps portal', {
        x: LEFT_X, y: 6.72, w: LEFT_W, h: 0.18,
        fontSize: 7, fontFace: 'Calibri', color: GRAY, italic: true, align: 'right', valign: 'middle'
      });
    }

    // BAU table moved to Slide 2. The left column on Slide 1 is reserved for the
    // (now-larger) Projects table only, and the right column hosts the donut + workload.

    // ═══════════════════════════════════════════
    // RIGHT COLUMN (Slide 1): VISUALS
    // ═══════════════════════════════════════════

    // ── STATUS DISTRIBUTION (Donut Chart) ──
    const donutY = projTblY;
    slide.addShape(pptx.ShapeType.rect, { x: RIGHT_X, y: donutY, w: 0.04, h: 0.22, fill: { color: PURPLE } });
    slide.addText([
      { text: '◉  ', options: { fontSize: 11, color: PURPLE, bold: true } },
      { text: 'STATUS DISTRIBUTION', options: { fontSize: 9, color: BLACK, bold: true, charSpacing: 3 } },
    ], { x: RIGHT_X + 0.12, y: donutY - 0.02, w: 4, h: 0.25, fontFace: 'Calibri', valign: 'middle' });

    // Build status data (only show statuses that have count > 0)
    const statusBuckets = [
      { name: 'On Track', count: onTrack, color: GREEN },
      { name: 'At Risk', count: atRisk, color: YELLOW },
      { name: 'Delayed', count: delayed, color: RED },
      { name: 'Completed', count: completed, color: BLUE },
    ].filter(s => s.count > 0);

    if (statusBuckets.length > 0) {
      const donutData = [{
        name: 'Project Status',
        labels: statusBuckets.map(s => s.name),
        values: statusBuckets.map(s => s.count),
      }];
      slide.addChart(pptx.charts.DOUGHNUT, donutData, {
        x: RIGHT_X, y: donutY + 0.3, w: RIGHT_W, h: 1.9,
        chartColors: statusBuckets.map(s => s.color),
        showLegend: true,
        legendPos: 'r',
        legendFontSize: 9,
        legendFontFace: 'Calibri',
        legendColor: DARK,
        showValue: true,
        dataLabelFontSize: 9,
        dataLabelFontFace: 'Calibri',
        dataLabelColor: WHITE,
        dataLabelFontBold: true,
        holeSize: 60,
        showTitle: false,
      });
      // ── Total count overlaid in donut hole ──
      slide.addText(String(allProjects.length), {
        x: RIGHT_X + 1.40, y: donutY + 1.02, w: 0.76, h: 0.30,
        fontSize: 18, fontFace: 'Calibri', color: BLACK, bold: true, align: 'center', valign: 'middle'
      });
      slide.addText('total', {
        x: RIGHT_X + 1.40, y: donutY + 1.30, w: 0.76, h: 0.18,
        fontSize: 7, fontFace: 'Calibri', color: GRAY, align: 'center', valign: 'middle'
      });
    } else {
      slide.addText('No project data', { x: RIGHT_X, y: donutY + 0.5, w: RIGHT_W, h: 1.5, fontSize: 11, fontFace: 'Calibri', color: LGRAY, italic: true, align: 'center', valign: 'middle' });
    }

    // ── WORKLOAD BY OWNER ──
    const workY = donutY + 2.3;
    slide.addShape(pptx.ShapeType.rect, { x: RIGHT_X, y: workY, w: 0.04, h: 0.22, fill: { color: TEAL } });
    slide.addText([
      { text: '▤  ', options: { fontSize: 11, color: TEAL, bold: true } },
      { text: 'WORKLOAD BY OWNER', options: { fontSize: 9, color: BLACK, bold: true, charSpacing: 3 } },
    ], { x: RIGHT_X + 0.12, y: workY - 0.02, w: 4, h: 0.25, fontFace: 'Calibri', valign: 'middle' });

    const ownerLoad = {};
    allProjects.filter(p => p.owner && p.status !== 'Completed').forEach(p => {
      if (!ownerLoad[p.owner]) ownerLoad[p.owner] = { projects: 0, bau: 0 };
      ownerLoad[p.owner].projects++;
    });
    allBau.filter(t => t.owner && t.status !== 'Completed' && t.status !== 'Paused').forEach(t => {
      if (!ownerLoad[t.owner]) ownerLoad[t.owner] = { projects: 0, bau: 0 };
      ownerLoad[t.owner].bau++;
    });
    const owners = Object.keys(ownerLoad).sort((a, b) => (ownerLoad[b].projects + ownerLoad[b].bau) - (ownerLoad[a].projects + ownerLoad[a].bau));
    const maxLoad = Math.max(1, ...owners.map(o => ownerLoad[o].projects + ownerLoad[o].bau));

    const barStartY = workY + 0.35;
    const barRowH = 0.32;
    const barLabelW = 1.2;
    const barMaxW = RIGHT_W - barLabelW - 0.5;

    owners.slice(0, 5).forEach((o, i) => {
      const y = barStartY + i * barRowH;
      const load = ownerLoad[o];
      const total = load.projects + load.bau;
      const projBarW = (load.projects / maxLoad) * barMaxW;
      const bauBarW = (load.bau / maxLoad) * barMaxW;

      // Owner name
      slide.addText(o, { x: RIGHT_X, y: y, w: barLabelW, h: barRowH, fontSize: 8, fontFace: 'Calibri', color: DARK, valign: 'middle' });
      // Background track
      slide.addShape(pptx.ShapeType.rect, { x: RIGHT_X + barLabelW, y: y + 0.09, w: barMaxW, h: 0.14, fill: { color: VLGRAY }, line: { width: 0 } });
      // Project portion
      if (projBarW > 0) {
        slide.addShape(pptx.ShapeType.rect, { x: RIGHT_X + barLabelW, y: y + 0.09, w: projBarW, h: 0.14, fill: { color: CYAN }, line: { width: 0 } });
      }
      // BAU portion
      if (bauBarW > 0) {
        slide.addShape(pptx.ShapeType.rect, { x: RIGHT_X + barLabelW + projBarW, y: y + 0.09, w: bauBarW, h: 0.14, fill: { color: TEAL }, line: { width: 0 } });
      }
      // Count
      slide.addText(String(total), { x: RIGHT_X + barLabelW + barMaxW + 0.05, y: y, w: 0.4, h: barRowH, fontSize: 9, fontFace: 'Calibri', color: BLACK, bold: true, valign: 'middle' });
    });

    // Legend for workload
    const legY = barStartY + Math.min(owners.length, 5) * barRowH + 0.05;
    slide.addShape(pptx.ShapeType.rect, { x: RIGHT_X + barLabelW, y: legY + 0.04, w: 0.15, h: 0.08, fill: { color: CYAN }, line: { width: 0 } });
    slide.addText('Projects', { x: RIGHT_X + barLabelW + 0.2, y: legY, w: 0.9, h: 0.16, fontSize: 7, fontFace: 'Calibri', color: GRAY, valign: 'middle' });
    slide.addShape(pptx.ShapeType.rect, { x: RIGHT_X + barLabelW + 1.1, y: legY + 0.04, w: 0.15, h: 0.08, fill: { color: TEAL }, line: { width: 0 } });
    slide.addText('BAU', { x: RIGHT_X + barLabelW + 1.3, y: legY, w: 0.6, h: 0.16, fontSize: 7, fontFace: 'Calibri', color: GRAY, valign: 'middle' });

    // ═══════════════════════════════════════════
    // FOOTER (Slide 1)
    // ═══════════════════════════════════════════
    // Bottom-left: confidentiality text (small, gray)
    slide.addText('SecOps Portal — sample data for demonstration', { x: 0.25, y: 7.18, w: 6, h: 0.2, fontSize: 7, fontFace: 'Calibri', color: '999999', valign: 'middle' });

    // Bottom-right: red SECOPS brand box
    slide.addShape(pptx.ShapeType.rect, { x: 11.85, y: 7.05, w: 1.4, h: 0.35, fill: { color: 'F7040A' }, line: { width: 0 } });
    slide.addText([
      { text: 'SECOPS', options: { fontSize: 10, fontFace: 'Calibri', color: 'FFFFFF', bold: true } },
      { text: '™', options: { fontSize: 5, fontFace: 'Calibri', color: 'FFFFFF', bold: true, superscript: true } },
    ], { x: 11.85, y: 7.05, w: 1.4, h: 0.35, align: 'center', valign: 'middle', letterSpacing: 1 });

    // ═══════════════════════════════════════════
    // ═══════════════════════════════════════════
    // SLIDE 2: BAU OPERATIONS DETAIL
    // ═══════════════════════════════════════════
    // ═══════════════════════════════════════════
    const slide2 = pptx.addSlide();
    slide2.background = { color: WHITE };

    // ── TITLE ──
    slide2.addText('SecOps BAU Operations Detail', { x: 0.4, y: 0.25, w: 10, h: 0.4, fontSize: 22, fontFace: 'Calibri', color: 'F7040A', bold: true, valign: 'middle' });
    slide2.addText('IT Security Operations · ' + dateStr + ' · Page 2 of 2', { x: 0.4, y: 0.6, w: 10, h: 0.25, fontSize: 10, fontFace: 'Calibri', color: GRAY, valign: 'middle' });

    // ── BAU KPI CARDS ──
    const totalBau = allBau.length;
    const activeBauCount = allBau.filter(t => t.status === 'Active').length;
    const inProgressBau = allBau.filter(t => t.status === 'In Progress').length;
    const ongoingBau = allBau.filter(t => t.is_ongoing).length;
    const criticalBau = allBau.filter(t => t.priority === 'Critical' && t.status !== 'Completed' && t.status !== 'Paused').length;

    const bauKpis = [
      { label: 'TOTAL BAU',   value: String(totalBau),         color: CYAN,                                       sub: 'in catalogue',  trend: trendBadge(totalBau, 'total_bau') },
      { label: 'ACTIVE',      value: String(activeBauCount),   color: GREEN,                                      sub: 'running',       trend: trendBadge(activeBauCount, 'bau_active') },
      { label: 'IN PROGRESS', value: String(inProgressBau),    color: BLUE,                                       sub: 'underway',      trend: trendBadge(inProgressBau, 'bau_in_progress') },
      { label: 'OVERDUE',     value: String(overdueBau),       color: overdueBau > 0 ? RED : GREEN,               sub: overdueBau > 0 ? 'past due' : 'all current', trend: trendBadgeInverse(overdueBau, 'bau_overdue') },
      { label: 'ONGOING',     value: String(ongoingBau),       color: TEAL,                                       sub: 'no fixed date', trend: trendBadge(ongoingBau, 'bau_ongoing') },
      { label: 'CRITICAL',    value: String(criticalBau),      color: criticalBau > 0 ? RED : GREEN,              sub: criticalBau > 0 ? 'high priority' : 'none open', trend: trendBadgeInverse(criticalBau, 'bau_critical') },
    ];

    bauKpis.forEach((k, i) => {
      const x = kpiStartX + i * (kpiW + kpiGap);
      slide2.addShape(pptx.ShapeType.rect, { x: x, y: kpiY, w: kpiW, h: kpiH, fill: { color: WHITE }, line: { color: VLGRAY, width: 0.75 } });
      slide2.addShape(pptx.ShapeType.rect, { x: x, y: kpiY, w: kpiW, h: 0.05, fill: { color: k.color }, line: { color: k.color, width: 0 } });
      slide2.addText(k.value, { x: x, y: kpiY + 0.1, w: kpiW, h: 0.42, fontSize: 26, fontFace: 'Calibri', color: BLACK, bold: true, align: 'center', valign: 'middle' });
      slide2.addText(k.label, { x: x, y: kpiY + 0.5, w: kpiW, h: 0.22, fontSize: 8, fontFace: 'Calibri', color: GRAY, bold: true, align: 'center', valign: 'middle', letterSpacing: 2 });
      slide2.addText(k.sub, { x: x, y: kpiY + 0.72, w: kpiW, h: 0.18, fontSize: 7, fontFace: 'Calibri', color: LGRAY, italic: true, align: 'center', valign: 'middle' });
      // Trend badge (top-right corner) — only when baseline available
      if (k.trend) {
        slide2.addText(k.trend.text, { x: x + kpiW - 0.55, y: kpiY + 0.08, w: 0.50, h: 0.18, fontSize: 7, fontFace: 'Calibri', color: k.trend.color, bold: true, align: 'right', valign: 'middle' });
      }
    });

    // ── Conditional alert banner: shows only when overdue BAU exists ──
    let s2ContentY = 2.10;
    if (overdueBau > 0) {
      slide2.addShape(pptx.ShapeType.rect, { x: 0.4, y: s2ContentY, w: 12.55, h: 0.32, fill: { color: 'FEE2E2' }, line: { width: 0 } });
      slide2.addShape(pptx.ShapeType.rect, { x: 0.4, y: s2ContentY, w: 0.06, h: 0.32, fill: { color: RED }, line: { width: 0 } });
      slide2.addText([
        { text: '⚠  ', options: { fontSize: 12, color: RED, bold: true } },
        { text: overdueBau + ' BAU TASK' + (overdueBau === 1 ? '' : 'S') + ' OVERDUE   ', options: { fontSize: 10, color: '991B1B', bold: true, charSpacing: 2 } },
        { text: '· past due date — highlighted in red below, immediate action required', options: { fontSize: 9, color: '991B1B' } },
      ], { x: 0.6, y: s2ContentY, w: 12.3, h: 0.32, fontFace: 'Calibri', valign: 'middle' });
      s2ContentY += 0.42;
    }

    // ── BAU OPERATIONS TABLE ──
    const bau2TblY = s2ContentY;
    slide2.addShape(pptx.ShapeType.rect, { x: LEFT_X, y: bau2TblY, w: 0.04, h: 0.22, fill: { color: BLUE } });
    slide2.addText([
      { text: '◆  ', options: { fontSize: 11, color: BLUE, bold: true } },
      { text: 'BAU OPERATIONS', options: { fontSize: 9, color: BLACK, bold: true, charSpacing: 3 } },
    ], { x: LEFT_X + 0.12, y: bau2TblY - 0.02, w: 4, h: 0.25, fontFace: 'Calibri', valign: 'middle' });

    // ── Filter completed/paused, sort overdue-first then by status urgency, cap at 10 ──
    const BAU_PRIORITY = { 'Overdue': 1, 'Blocked': 2, 'In Progress': 3, 'Active': 4 };
    const bauForTable = allBau
      .filter(t => t.status !== 'Completed' && t.status !== 'Paused')
      .sort((a, b) => {
        const aOverdue = a.next_due && !a.is_ongoing && new Date(a.next_due) < today ? 0 : 1;
        const bOverdue = b.next_due && !b.is_ongoing && new Date(b.next_due) < today ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        return (BAU_PRIORITY[a.status] || 99) - (BAU_PRIORITY[b.status] || 99);
      });
    const BAU2_TABLE_LIMIT = 8;
    const bau2Shown = bauForTable.slice(0, BAU2_TABLE_LIMIT);
    const bau2Hidden = bauForTable.length - bau2Shown.length;
    slide2.addText(bauForTable.length + ' active · sorted by priority', { x: LEFT_X + LEFT_W - 2.5, y: bau2TblY - 0.02, w: 2.5, h: 0.25, fontSize: 8, fontFace: 'Calibri', color: LGRAY, align: 'right', valign: 'middle' });

    function isBauOverdue(t) {
      if (t.is_ongoing) return false;
      if (t.status === 'Completed' || t.status === 'Paused') return false;
      return t.next_due && new Date(t.next_due) < today;
    }

    const bau2Headers = [[
      { text: 'TASK', options: { fontSize: 7, color: GRAY, bold: true, fill: { color: BG }, valign: 'middle' } },
      { text: 'OWNER', options: { fontSize: 7, color: GRAY, bold: true, fill: { color: BG }, valign: 'middle' } },
      { text: 'CHALLENGES', options: { fontSize: 7, color: GRAY, bold: true, fill: { color: BG }, valign: 'middle' } },
      { text: 'FREQUENCY', options: { fontSize: 7, color: GRAY, bold: true, fill: { color: BG }, valign: 'middle' } },
      { text: 'PRIORITY', options: { fontSize: 7, color: GRAY, bold: true, fill: { color: BG }, align: 'center', valign: 'middle' } },
      { text: 'STATUS', options: { fontSize: 7, color: GRAY, bold: true, fill: { color: BG }, align: 'center', valign: 'middle' } },
      { text: 'NEXT DUE', options: { fontSize: 7, color: GRAY, bold: true, fill: { color: BG }, valign: 'middle' } },
    ]];

    const bau2Rows = bau2Shown.map((t, i) => {
      const overdue = isBauOverdue(t);
      const bg = overdue ? OVERDUE_BG : (i % 2 === 0 ? WHITE : 'F8F9FA');
      const ownerCell = t.secondary_owner ? {
        text: [
          { text: t.owner || '', options: { fontSize: 8, color: DARK, bold: true, breakLine: true } },
          { text: '↳ ' + t.secondary_owner, options: { fontSize: 6, color: LGRAY, italic: true } },
        ],
        options: { fill: { color: bg }, valign: 'middle' }
      } : {
        text: t.owner || '',
        options: { fontSize: 8, color: DARK, fill: { color: bg }, valign: 'middle' }
      };
      const priColor = t.priority === 'Critical' ? RED : t.priority === 'High' ? YELLOW : t.priority === 'Medium' ? BLUE : GRAY;
      const priBold = t.priority === 'Critical' || t.priority === 'High';
      // Truncate long text to keep row height predictable
      const truncate = (str, max) => {
        if (!str) return str;
        const s = String(str).trim();
        return s.length > max ? s.slice(0, max - 1).trim() + '…' : s;
      };
      const taskName = truncate(t.name || '', 38);
      const challengeText = truncate(t.challenges || '', 100);
      // Frequency color coding (matches donut palette)
      const freqColors = { 'Daily': 'CFFAFE', 'Weekly': 'D1FAE5', 'Bi-Weekly': 'D1FAE5', 'Monthly': 'E0E7FF', 'Quarterly': 'EDE9FE', 'Annual': 'FCE7F3', 'Ad-hoc': 'FED7AA' };
      const freqTextColors = { 'Daily': '155E75', 'Weekly': '065F46', 'Bi-Weekly': '065F46', 'Monthly': '3730A3', 'Quarterly': '5B21B6', 'Annual': '9D174D', 'Ad-hoc': '9A3412' };
      const freqBg   = overdue ? bg : (freqColors[t.frequency] || bg);
      const freqText = overdue ? GRAY : (freqTextColors[t.frequency] || GRAY);
      // Task cell with category label below (color-coded same as project slide)
      const bauCatLabel = shortCat(t.category);
      const taskCell = bauCatLabel ? {
        text: [
          { text: (overdue ? '⚠ ' : '') + taskName, options: { fontSize: 8, color: BLACK, bold: true, breakLine: true } },
          { text: bauCatLabel, options: { fontSize: 6, color: catColor(t.category), bold: true, charSpacing: 1 } },
        ],
        options: { fill: { color: bg }, valign: 'middle' }
      } : {
        text: (overdue ? '⚠ ' : '') + taskName,
        options: { fontSize: 8, color: BLACK, bold: true, fill: { color: bg }, valign: 'middle' }
      };
      return [
        taskCell,
        ownerCell,
        { text: challengeText || '—', options: { fontSize: 7, color: challengeText ? DARK : LGRAY, italic: !challengeText, fill: { color: bg }, valign: 'middle' } },
        { text: t.frequency || '', options: { fontSize: 7, color: freqText, bold: !overdue && !!t.frequency, fill: { color: freqBg }, valign: 'middle', align: 'center' } },
        { text: t.priority || '—', options: { fontSize: 7, color: priColor, bold: priBold, fill: { color: bg }, valign: 'middle', align: 'center' } },
        { text: t.status || '', options: { fontSize: 8, color: statusText(t.status), bold: true, fill: { color: statusBg(t.status) }, valign: 'middle', align: 'center' } },
        { text: t.next_due ? new Date(t.next_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : (t.is_ongoing ? 'Ongoing' : '—'), options: { fontSize: 7, color: overdue ? RED : GRAY, bold: overdue, fill: { color: bg }, valign: 'middle' } },
      ];
    });

    slide2.addTable([...bau2Headers, ...bau2Rows], {
      x: LEFT_X, y: bau2TblY + 0.28, w: LEFT_W,
      colW: [1.6, 0.9, 1.6, 0.9, 0.8, 1.0, 1.2],
      border: { type: 'solid', pt: 0.3, color: VLGRAY },
      rowH: 0.32,
      margin: [3, 5, 3, 5],
      fontFace: 'Calibri',
    });

    if (bau2Hidden > 0) {
      slide2.addText('+ ' + bau2Hidden + ' more BAU task' + (bau2Hidden === 1 ? '' : 's') + ' — see full list in SecOps portal', {
        x: LEFT_X, y: 6.72, w: LEFT_W, h: 0.18,
        fontSize: 7, fontFace: 'Calibri', color: GRAY, italic: true, align: 'right', valign: 'middle'
      });
    }

    // ── RECURRING VS REACTIVE (Waffle / dot grid) ──
    const recurringFreqs = ['Daily', 'Weekly', 'Bi-Weekly', 'Monthly', 'Quarterly', 'Annual'];
    const rvrActive = allBau.filter(t => t.status !== 'Completed' && t.status !== 'Paused');
    const recurringCount = rvrActive.filter(t => recurringFreqs.includes(t.frequency)).length;
    const reactiveCount  = rvrActive.filter(t => !recurringFreqs.includes(t.frequency)).length;
    const totalRvR       = recurringCount + reactiveCount;
    const recurringPct   = totalRvR > 0 ? Math.round(recurringCount / totalRvR * 100) : 0;
    const reactivePct    = 100 - recurringPct;

    const rvrY = bau2TblY + 0.28 + (bau2Shown.length + 1) * 0.42 + 0.15;

    // Waffle grid sizing
    const W_CELL = 0.22;
    const W_GAP  = 0.05;
    const W_COLS = Math.min(10, Math.max(1, totalRvR));
    const W_ROWS = Math.max(1, Math.ceil(totalRvR / 10));
    const W_GRID_H = W_ROWS * W_CELL + (W_ROWS - 1) * W_GAP;
    const W_TOTAL_H = 0.34 + W_GRID_H + 0.62 + 0.28; // header gap + grid + stats + insight

    if (totalRvR > 0 && rvrY + W_TOTAL_H < 7.05) {
      // Section header
      slide2.addShape(pptx.ShapeType.rect, { x: LEFT_X, y: rvrY, w: 0.04, h: 0.22, fill: { color: TEAL }, line: { width: 0 } });
      slide2.addText([
        { text: '◑  ',                    options: { fontSize: 11, color: TEAL,  bold: true } },
        { text: 'RECURRING VS REACTIVE',  options: { fontSize: 9,  color: BLACK, bold: true, charSpacing: 3 } },
      ], { x: LEFT_X + 0.12, y: rvrY - 0.02, w: 5, h: 0.25, fontFace: 'Calibri', valign: 'middle' });

      // Waffle grid (centered horizontally in left column)
      const W_GRID_W = W_COLS * W_CELL + (W_COLS - 1) * W_GAP;
      const W_GRID_X = LEFT_X + (LEFT_W - W_GRID_W) / 2;
      const W_GRID_Y = rvrY + 0.36;

      for (let i = 0; i < totalRvR; i++) {
        const row = Math.floor(i / 10);
        const col = i % 10;
        const cx = W_GRID_X + col * (W_CELL + W_GAP);
        const cy = W_GRID_Y + row * (W_CELL + W_GAP);
        const cellColor = i < recurringCount ? TEAL : YELLOW;
        slide2.addShape(pptx.ShapeType.roundRect, {
          x: cx, y: cy, w: W_CELL, h: W_CELL,
          fill: { color: cellColor }, line: { width: 0 }, rectRadius: 0.03
        });
      }

      // Twin stat blocks below grid (centered, side by side)
      const W_STATS_Y    = W_GRID_Y + W_GRID_H + 0.16;
      const W_STAT_W     = 1.5;
      const W_STAT_GAP   = 0.60;
      const W_STATS_W    = W_STAT_W * 2 + W_STAT_GAP;
      const W_STATS_X    = LEFT_X + (LEFT_W - W_STATS_W) / 2;

      // Recurring
      slide2.addText(String(recurringCount), {
        x: W_STATS_X, y: W_STATS_Y, w: W_STAT_W, h: 0.30,
        fontSize: 20, fontFace: 'Calibri', color: TEAL, bold: true, align: 'center', valign: 'middle'
      });
      slide2.addText('RECURRING', {
        x: W_STATS_X, y: W_STATS_Y + 0.30, w: W_STAT_W, h: 0.18,
        fontSize: 7.5, fontFace: 'Calibri', color: GRAY, bold: true, align: 'center', valign: 'middle', charSpacing: 2
      });

      // Reactive
      slide2.addText(String(reactiveCount), {
        x: W_STATS_X + W_STAT_W + W_STAT_GAP, y: W_STATS_Y, w: W_STAT_W, h: 0.30,
        fontSize: 20, fontFace: 'Calibri', color: YELLOW, bold: true, align: 'center', valign: 'middle'
      });
      slide2.addText('REACTIVE', {
        x: W_STATS_X + W_STAT_W + W_STAT_GAP, y: W_STATS_Y + 0.30, w: W_STAT_W, h: 0.18,
        fontSize: 7.5, fontFace: 'Calibri', color: GRAY, bold: true, align: 'center', valign: 'middle', charSpacing: 2
      });

      // Plain-English insight line
      let rvrInsight;
      if (recurringPct >= 70)      rvrInsight = recurringPct + '% of BAU runs on a planned cadence — strong operational discipline';
      else if (recurringPct >= 50) rvrInsight = recurringPct + '% recurring · ' + reactivePct + '% reactive — healthy balance, monitor ad-hoc creep';
      else                         rvrInsight = 'High reactive load (' + reactivePct + '%) — consider scheduling ' + reactiveCount + ' ad-hoc task' + (reactiveCount === 1 ? '' : 's') + ' into recurring cycles';

      slide2.addText('◦  ' + rvrInsight, {
        x: LEFT_X, y: W_STATS_Y + 0.55, w: LEFT_W, h: 0.22,
        fontSize: 7.5, fontFace: 'Calibri', color: GRAY, italic: true, align: 'center', valign: 'middle'
      });
    }

    // ═══════════════════════════════════════════
    // RIGHT COLUMN (Slide 2): BAU breakdowns
    // ═══════════════════════════════════════════

    // ── BAU BY FREQUENCY (Donut) ──
    const freqY = bau2TblY;
    slide2.addShape(pptx.ShapeType.rect, { x: RIGHT_X, y: freqY, w: 0.04, h: 0.22, fill: { color: PURPLE } });
    slide2.addText([
      { text: '◉  ', options: { fontSize: 11, color: PURPLE, bold: true } },
      { text: 'BAU BY FREQUENCY', options: { fontSize: 9, color: BLACK, bold: true, charSpacing: 3 } },
    ], { x: RIGHT_X + 0.12, y: freqY - 0.02, w: 4, h: 0.25, fontFace: 'Calibri', valign: 'middle' });

    const freqBuckets = {};
    allBau.filter(t => t.status !== 'Completed' && t.status !== 'Paused').forEach(t => {
      const f = t.frequency || 'Unspecified';
      freqBuckets[f] = (freqBuckets[f] || 0) + 1;
    });
    const freqOrder = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual', 'Ad-hoc', 'Unspecified'];
    const freqEntries = freqOrder
      .filter(f => freqBuckets[f] > 0)
      .map(f => [f, freqBuckets[f]])
      .concat(Object.entries(freqBuckets).filter(([f]) => !freqOrder.includes(f)));
    const freqColorPalette = ['0891B2', '14B8A6', '7C3AED', 'D97706', '2563EB', 'DB2777', '6B7280'];

    if (freqEntries.length > 0) {
      slide2.addChart(pptx.charts.DOUGHNUT, [{ name: 'BAU Frequency', labels: freqEntries.map(e => e[0]), values: freqEntries.map(e => e[1]) }], {
        x: RIGHT_X, y: freqY + 0.3, w: RIGHT_W, h: 1.9,
        chartColors: freqEntries.map((_, i) => freqColorPalette[i % freqColorPalette.length]),
        showLegend: true, legendPos: 'r', legendFontSize: 9, legendFontFace: 'Calibri', legendColor: DARK,
        showValue: true, dataLabelFontSize: 9, dataLabelFontFace: 'Calibri', dataLabelColor: WHITE, dataLabelFontBold: true,
        holeSize: 60, showTitle: false,
      });
      // ── Total count overlaid in donut hole ──
      slide2.addText(String(activeBau.length), {
        x: RIGHT_X + 1.42, y: freqY + 1.02, w: 0.76, h: 0.30,
        fontSize: 18, fontFace: 'Calibri', color: BLACK, bold: true, align: 'center', valign: 'middle'
      });
      slide2.addText('total', {
        x: RIGHT_X + 1.42, y: freqY + 1.30, w: 0.76, h: 0.18,
        fontSize: 7, fontFace: 'Calibri', color: GRAY, align: 'center', valign: 'middle'
      });
    } else {
      slide2.addText('No active BAU', { x: RIGHT_X, y: freqY + 0.5, w: RIGHT_W, h: 1.5, fontSize: 11, fontFace: 'Calibri', color: LGRAY, italic: true, align: 'center', valign: 'middle' });
    }

    // ── BAU BY PRIORITY (Risk meter + Severity pyramid) ──
    const priY = freqY + 2.3;
    slide2.addShape(pptx.ShapeType.rect, { x: RIGHT_X, y: priY, w: 0.04, h: 0.22, fill: { color: TEAL } });
    slide2.addText([
      { text: '▤  ', options: { fontSize: 11, color: TEAL, bold: true } },
      { text: 'BAU BY PRIORITY', options: { fontSize: 9, color: BLACK, bold: true, charSpacing: 3 } },
    ], { x: RIGHT_X + 0.12, y: priY - 0.02, w: 4, h: 0.25, fontFace: 'Calibri', valign: 'middle' });

    const priLevels = ['Critical', 'High', 'Medium', 'Low'];
    const priCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    allBau.filter(t => t.status !== 'Completed' && t.status !== 'Paused').forEach(t => {
      if (t.priority && priCounts.hasOwnProperty(t.priority)) priCounts[t.priority]++;
    });
    const priTotal = priCounts.Critical + priCounts.High + priCounts.Medium + priCounts.Low;
    const priMaxVal = Math.max(1, ...priLevels.map(p => priCounts[p]));
    // Weighted risk score (0-5 range)
    const riskScore = priTotal > 0
      ? ((priCounts.Critical * 5 + priCounts.High * 3 + priCounts.Medium * 2 + priCounts.Low * 1) / priTotal)
      : 0;
    const riskPctOfTrack = Math.min(1, Math.max(0, riskScore / 5)); // 0-1

    // ── Risk meter (faux gradient via 5 segments) ──
    const meterY     = priY + 0.36;
    const meterW     = RIGHT_W - 0.85;        // leave room for score block on right
    const meterH     = 0.18;
    const meterX     = RIGHT_X;
    const meterSegW  = meterW / 5;
    const meterColors = ['10B981', '84CC16', 'FACC15', 'F97316', 'EF4444'];
    // Track segments
    for (let s = 0; s < 5; s++) {
      const sx = meterX + s * meterSegW;
      slide2.addShape(pptx.ShapeType.rect, {
        x: sx, y: meterY, w: meterSegW, h: meterH,
        fill: { color: meterColors[s] }, line: { width: 0 }
      });
    }
    // Marker (vertical line + arrow at top)
    const markerX = meterX + riskPctOfTrack * meterW - 0.02;
    slide2.addShape(pptx.ShapeType.rect, {
      x: markerX, y: meterY - 0.04, w: 0.04, h: meterH + 0.08,
      fill: { color: '111827' }, line: { width: 0 }
    });
    // Score block (right of meter)
    const scoreX = meterX + meterW + 0.10;
    slide2.addText(riskScore.toFixed(1), {
      x: scoreX, y: meterY - 0.06, w: 0.65, h: 0.26,
      fontSize: 18, fontFace: 'Calibri', color: BLACK, bold: true, align: 'center', valign: 'middle'
    });
    slide2.addText('RISK SCORE', {
      x: scoreX, y: meterY + 0.20, w: 0.65, h: 0.14,
      fontSize: 6, fontFace: 'Calibri', color: GRAY, bold: true, align: 'center', valign: 'middle', charSpacing: 1
    });
    // Stop labels under meter
    const stopLabels = ['SAFE', 'LOW', 'MED', 'HIGH', 'CRIT'];
    stopLabels.forEach((lbl, s) => {
      slide2.addText(lbl, {
        x: meterX + s * meterSegW, y: meterY + meterH + 0.02, w: meterSegW, h: 0.14,
        fontSize: 6, fontFace: 'Calibri', color: GRAY, bold: true, align: 'center', valign: 'middle', charSpacing: 1
      });
    });
    // Formula caption
    slide2.addText('◦  weighted (Critical×5 + High×3 + Medium×2 + Low×1) ÷ total active', {
      x: RIGHT_X, y: meterY + meterH + 0.18, w: RIGHT_W, h: 0.16,
      fontSize: 6.5, fontFace: 'Calibri', color: LGRAY, italic: true, align: 'center', valign: 'middle'
    });

    // Thin divider line between meter and pyramid
    slide2.addShape(pptx.ShapeType.rect, {
      x: RIGHT_X, y: meterY + meterH + 0.40, w: RIGHT_W, h: 0.008,
      fill: { color: VLGRAY }, line: { width: 0 }
    });

    // ── Severity pyramid (4 rows below meter) ──
    const pyrStartY  = meterY + meterH + 0.50;
    const pyrRowH    = 0.30;
    const pyrLabelW  = 0.70;
    const pyrMaxW    = RIGHT_W - pyrLabelW - 0.15;
    const priColorByLevel = { Critical: 'DC2626', High: 'D97706', Medium: '2563EB', Low: '9CA3AF' };
    // Pyramid widths: wider for lower severity (visualizes "headroom")
    // Critical=narrowest (0.40×), High=0.60×, Medium=0.80×, Low=1.00×
    const pyrWidthMultiplier = { Critical: 0.40, High: 0.60, Medium: 0.80, Low: 1.00 };

    priLevels.forEach((level, i) => {
      const y = pyrStartY + i * pyrRowH;
      const count = priCounts[level];
      const maxBarW = pyrMaxW * pyrWidthMultiplier[level];
      const barW = count > 0 ? Math.max(0.30, (count / priMaxVal) * maxBarW) : 0.28;
      const isFaded = count === 0;
      // Label
      slide2.addText(level, {
        x: RIGHT_X, y, w: pyrLabelW, h: pyrRowH,
        fontSize: 9, fontFace: 'Calibri', color: DARK, bold: level === 'Critical', align: 'right', valign: 'middle'
      });
      // Colored bar with count inside
      slide2.addShape(pptx.ShapeType.roundRect, {
        x: RIGHT_X + pyrLabelW + 0.05, y: y + 0.04, w: barW, h: pyrRowH - 0.08,
        fill: { color: priColorByLevel[level], transparency: isFaded ? 70 : 0 },
        line: { width: 0 },
        rectRadius: 0.03
      });
      slide2.addText(String(count), {
        x: RIGHT_X + pyrLabelW + 0.05, y: y + 0.04, w: barW, h: pyrRowH - 0.08,
        fontSize: 10, fontFace: 'Calibri', color: WHITE, bold: true, align: 'center', valign: 'middle'
      });
    });

    // ── FOOTER (Slide 2) ──
    slide2.addText('SecOps Portal — sample data for demonstration', { x: 0.25, y: 7.18, w: 6, h: 0.2, fontSize: 7, fontFace: 'Calibri', color: '999999', valign: 'middle' });
    slide2.addShape(pptx.ShapeType.rect, { x: 11.85, y: 7.05, w: 1.4, h: 0.35, fill: { color: 'F7040A' }, line: { width: 0 } });
    slide2.addText([
      { text: 'SECOPS', options: { fontSize: 10, fontFace: 'Calibri', color: 'FFFFFF', bold: true } },
      { text: '™', options: { fontSize: 5, fontFace: 'Calibri', color: 'FFFFFF', bold: true, superscript: true } },
    ], { x: 11.85, y: 7.05, w: 1.4, h: 0.35, align: 'center', valign: 'middle', letterSpacing: 1 });
    // ── GENERATE ──
    const fileName = 'SecOps_Board_Report_' + today.toISOString().slice(0, 10) + '.pptx';
    await pptx.writeFile({ fileName: fileName });
    showToast('Report generated (2 slides): ' + fileName);

  } catch (err) {
    showToast('Report generation failed: ' + (err.message || 'unknown error'), true);
    console.error('PPTX Error:', err);
  } finally {
    btn.disabled = false;
    btn.querySelector('.refresh-label').textContent = 'Report';
  }
}
// ============== INIT ==============
document.getElementById('search').addEventListener('input', renderProjects);
document.getElementById('filter-status').addEventListener('change', renderProjects);
document.getElementById('filter-owner').addEventListener('change', renderProjects);
document.getElementById('bau-search').addEventListener('input', renderBau);
document.getElementById('bau-filter-status').addEventListener('change', renderBau);
document.getElementById('bau-filter-frequency').addEventListener('change', renderBau);
document.getElementById('bau-filter-owner').addEventListener('change', renderBau);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const hm = document.getElementById('help-modal');
    if (hm && hm.classList.contains('open')) { closeHelpPanel(); return; }
    if (document.getElementById('drawer-project').classList.contains('open')) closeProjectDrawer();
    if (document.getElementById('drawer-bau').classList.contains('open')) closeBauDrawer();
  }
  // Ctrl+R / Cmd+R → refresh data (overrides browser reload for a much faster experience)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r' && !e.shiftKey) {
    e.preventDefault();
    refreshData({ replayAnim: true });
  }
});

// ============== TAB NAVIGATION ==============
// Three tabs: dashboard | projects | bau. Default = dashboard.
// URL routing: ?tab=projects or ?tab=bau survives reloads and bookmarks.
// State (filters, search) persists naturally because we only toggle CSS visibility.
const VALID_TABS = ['dashboard', 'projects', 'bau'];
function switchTab(name, opts) {
  if (VALID_TABS.indexOf(name) < 0) name = 'dashboard';
  document.querySelectorAll('.tab-content').forEach(function(el){ el.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
  const content = document.getElementById('tab-' + name);
  const btn = document.querySelector('.tab-btn[data-tab="' + name + '"]');
  if (content) content.classList.add('active');
  if (btn) btn.classList.add('active');
  document.body.setAttribute('data-tab', name);
  // Update URL (push state only if it's a user action, not on initial load)
  if (!(opts && opts.skipUrl)) {
    const url = new URL(window.location.href);
    if (name === 'dashboard') url.searchParams.delete('tab');
    else url.searchParams.set('tab', name);
    window.history.replaceState({}, '', url.toString());
  }
}
function getInitialTab() {
  try {
    const url = new URL(window.location.href);
    const t = url.searchParams.get('tab');
    if (VALID_TABS.indexOf(t) >= 0) return t;
  } catch (_) {}
  return 'dashboard';
}
function updateTabCounts() {
  // Projects count: active projects (exclude archived — already not in allProjects)
  const projCount = (typeof allProjects !== 'undefined') ? allProjects.length : 0;
  const bauCount = (typeof allBau !== 'undefined') ? allBau.length : 0;
  // Overdue count for BAU (date-based, mirrors the banner logic)
  let overdue = 0;
  if (typeof allBau !== 'undefined') {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    overdue = allBau.filter(function(t){
      if (!t.next_due || t.is_ongoing) return false;
      if (t.status === 'Completed' || t.status === 'Paused') return false;
      return new Date(t.next_due) < today;
    }).length;
  }
  const pEl = document.getElementById('tab-count-projects');
  const bEl = document.getElementById('tab-count-bau');
  if (pEl) pEl.textContent = projCount;
  if (bEl) {
    bEl.textContent = bauCount;
    bEl.classList.toggle('has-overdue', overdue > 0);
  }
}
(function initTabs() {
  function setup() {
    switchTab(getInitialTab(), { skipUrl: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();

// ============== PORTAL GUIDE / HELP PANEL ==============
function openHelpPanel() {
  document.getElementById('help-overlay').classList.add('open');
  document.getElementById('help-modal').classList.add('open');
}
function closeHelpPanel() {
  document.getElementById('help-overlay').classList.remove('open');
  document.getElementById('help-modal').classList.remove('open');
}
function toggleHelpPanel() {
  const m = document.getElementById('help-modal');
  if (m && m.classList.contains('open')) closeHelpPanel(); else openHelpPanel();
}
// Wire up help panel tab switching
(function initHelpTabs() {
  function setup() {
    document.querySelectorAll('#help-tabs .help-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        document.querySelectorAll('#help-tabs .help-tab').forEach(function(t){ t.classList.remove('active'); });
        document.querySelectorAll('#help-body .help-section').forEach(function(s){ s.classList.remove('show'); });
        tab.classList.add('active');
        var sec = document.getElementById('hsec-' + tab.dataset.sec);
        if (sec) sec.classList.add('show');
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();

(async () => {
  setHeaderDate();
  setInterval(setHeaderDate, 30000);
  // Update the "Xm ago" label on the refresh button every 30s
  setInterval(updateRefreshTimeLabel, 30000);
  try {
    allProjects = await api.list('projects');
    allBau = await api.list('bau');
    try {
      allSubtasks = await fetch('/api/subtasks/all').then(r => r.ok ? r.json() : []);
    } catch (_) { allSubtasks = []; }
    renderProjects();
    renderBau();
    // Dashboard widgets are always visible now — render on first load
    if (heatmapOpen) renderHeatmap();
    renderDeadlines();
    lastRefreshAt = Date.now();
    updateRefreshTimeLabel();
  } catch (err) {
    showToast('Failed to load data', true);
  }
})();
</script>
</body>
</html>
`;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const PROJ_STATUSES = ['On Track', 'At Risk', 'Delayed', 'On Hold', 'Completed'];
const PROJ_PHASES = ['Planning', 'Design', 'Implementation', 'Testing', 'Deployment', 'Closure'];
const BAU_STATUSES = ['Active', 'In Progress', 'Overdue', 'Paused', 'Completed'];
const BAU_FREQUENCIES = ['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Annual', 'Ad-hoc'];
const BAU_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const SUBTASK_STATUSES = ['Not Started', 'In Progress', 'Completed'];

const PROJECT_AUDIT_FIELDS = ['name', 'owner', 'secondary_owner', 'category', 'tool', 'phase', 'status', 'progress', 'target_date', 'last_milestone', 'next_milestone', 'challenges', 'notes'];
const BAU_AUDIT_FIELDS = ['name', 'owner', 'secondary_owner', 'category', 'tool', 'frequency', 'priority', 'status', 'last_performed', 'next_due', 'is_ongoing', 'challenges', 'notes'];

function validateProject(body) {
  const errs = [];
  if (!body.name || typeof body.name !== 'string' || body.name.length > 200) errs.push('name required (max 200 chars)');
  if (!body.owner || typeof body.owner !== 'string' || body.owner.length > 100) errs.push('owner required (max 100 chars)');
  if (!PROJ_STATUSES.includes(body.status)) errs.push('invalid status');
  if (!PROJ_PHASES.includes(body.phase)) errs.push('invalid phase');
  if (typeof body.progress !== 'number' || body.progress < 0 || body.progress > 100) errs.push('progress must be 0–100');
  if (body.category && body.category.length > 50) errs.push('category too long');
  if (body.notes && body.notes.length > 2000) errs.push('notes too long');
  if (body.challenges && body.challenges.length > 2000) errs.push('challenges too long');
  return errs;
}

function validateBau(body) {
  const errs = [];
  if (!body.name || typeof body.name !== 'string' || body.name.length > 200) errs.push('name required (max 200 chars)');
  if (!body.owner || typeof body.owner !== 'string' || body.owner.length > 100) errs.push('owner required (max 100 chars)');
  if (!BAU_STATUSES.includes(body.status)) errs.push('invalid status');
  if (!BAU_FREQUENCIES.includes(body.frequency)) errs.push('invalid frequency');
  if (!BAU_PRIORITIES.includes(body.priority)) errs.push('invalid priority');
  if (body.category && body.category.length > 50) errs.push('category too long');
  if (body.notes && body.notes.length > 2000) errs.push('notes too long');
  if (body.challenges && body.challenges.length > 2000) errs.push('challenges too long');
  return errs;
}

// ============== AUDIT HELPERS ==============

function getUserEmail(request) {
  const email = request.headers.get('Cf-Access-Authenticated-User-Email');
  if (email && email.length > 0 && email.length < 256) return email;
  return 'anonymous';
}

function computeDiff(oldRec, newRec, fields) {
  const diff = {};
  if (!oldRec) return diff;
  for (const f of fields) {
    let o = oldRec[f];
    let n = newRec[f];
    if (o === undefined || o === '') o = null;
    if (n === undefined || n === '') n = null;
    if (f === 'is_ongoing') {
      o = o ? 1 : 0;
      n = n ? 1 : 0;
    }
    if (o !== n) {
      diff[f] = { old: o, new: n };
    }
  }
  return diff;
}

async function logAudit(env, { resourceType, resourceId, resourceName, action, userEmail, changes }) {
  try {
    const id = crypto.randomUUID();
    const ts = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO audit_log (id, resource_type, resource_id, resource_name, action, user_email, changes, timestamp)
       VALUES (?,?,?,?,?,?,?,?)`
    ).bind(
      id, resourceType, resourceId, resourceName || null, action,
      userEmail || 'anonymous',
      changes ? JSON.stringify(changes) : null, ts
    ).run();
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

// ============== SUB-TASKS ==============

function validateSubtask(body) {
  const errs = [];
  if (!body.title || typeof body.title !== 'string' || body.title.length > 300) errs.push('title required (max 300 chars)');
  if (body.owner && (typeof body.owner !== 'string' || body.owner.length > 100)) errs.push('owner too long');
  if (body.status && !SUBTASK_STATUSES.includes(body.status)) errs.push('invalid status');
  if (body.due_date && typeof body.due_date !== 'string') errs.push('invalid due_date');
  return errs;
}

// Sub-task progress was previously rolled up into the parent's `progress` column.
// That behaviour was removed per user request — progress is now fully manual on Projects.
// We still surface counts via subtask_total / subtask_done on the parent GET, but we no
// longer mutate parent.progress here.
async function recomputeParentProgress(env, parentType, parentId) {
  // No-op: kept as a stub so callers still work and the response contract is stable.
  return null;
}

async function getParentName(env, parentType, parentId) {
  const table = parentType === 'project' ? 'projects' : 'bau_tasks';
  const rec = await env.DB.prepare('SELECT name FROM ' + table + ' WHERE id=?').bind(parentId).first();
  return rec ? rec.name : null;
}

async function handleSubtasks(request, env, url) {
  const path = url.pathname;
  const method = request.method;
  const userEmail = getUserEmail(request);

  // GET /api/subtasks/all — bulk fetch (used by calendar + counts)
  if (path === '/api/subtasks/all' && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM sub_tasks ORDER BY parent_type, parent_id, position, created_at'
    ).all();
    return json(results || []);
  }

  // GET /api/subtasks/:type/:parentId — list for a single parent
  const listMatch = path.match(/^\/api\/subtasks\/(project|bau)\/([a-f0-9-]+)$/i);
  if (listMatch && method === 'GET') {
    const [, parentType, parentId] = listMatch;
    const { results } = await env.DB.prepare(
      'SELECT * FROM sub_tasks WHERE parent_type=? AND parent_id=? ORDER BY position, created_at'
    ).bind(parentType, parentId).all();
    return json(results || []);
  }

  // POST /api/subtasks/:type/:parentId — create
  if (listMatch && method === 'POST') {
    const [, parentType, parentId] = listMatch;
    const body = await request.json();
    const errs = validateSubtask(body);
    if (errs.length) return json({ error: errs.join('; ') }, 400);

    // Verify parent exists
    const parentName = await getParentName(env, parentType, parentId);
    if (!parentName) return json({ error: 'Parent not found' }, 404);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const status = body.status && SUBTASK_STATUSES.includes(body.status) ? body.status : 'Not Started';

    // Place at end
    const last = await env.DB.prepare(
      'SELECT MAX(position) AS maxpos FROM sub_tasks WHERE parent_type=? AND parent_id=?'
    ).bind(parentType, parentId).first();
    const position = (last && last.maxpos != null ? Number(last.maxpos) : -1) + 1;

    await env.DB.prepare(
      `INSERT INTO sub_tasks (id, parent_type, parent_id, title, owner, status, due_date, position, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).bind(id, parentType, parentId, body.title.trim(), body.owner || null, status, body.due_date || null, position, now, now).run();

    const newProgress = await recomputeParentProgress(env, parentType, parentId);

    await logAudit(env, {
      resourceType: parentType, resourceId: parentId, resourceName: parentName,
      action: 'subtask_added', userEmail,
      changes: { subtask: { title: body.title.trim(), owner: body.owner || null, status, due_date: body.due_date || null } },
    });

    return json({ id, parent_type: parentType, parent_id: parentId, title: body.title.trim(), owner: body.owner || null, status, due_date: body.due_date || null, position, created_at: now, updated_at: now, parent_progress: newProgress });
  }

  // PUT /api/subtasks/:id — update
  // DELETE /api/subtasks/:id — delete
  const idMatch = path.match(/^\/api\/subtasks\/([a-f0-9-]+)$/i);
  if (idMatch && method === 'PUT') {
    const id = idMatch[1];
    const body = await request.json();
    const errs = validateSubtask(body);
    if (errs.length) return json({ error: errs.join('; ') }, 400);

    const oldRecord = await env.DB.prepare('SELECT * FROM sub_tasks WHERE id=?').bind(id).first();
    if (!oldRecord) return json({ error: 'Not found' }, 404);

    const status = body.status && SUBTASK_STATUSES.includes(body.status) ? body.status : oldRecord.status;
    const now = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE sub_tasks SET title=?, owner=?, status=?, due_date=?, updated_at=? WHERE id=?`
    ).bind(body.title.trim(), body.owner || null, status, body.due_date || null, now, id).run();

    const newProgress = await recomputeParentProgress(env, oldRecord.parent_type, oldRecord.parent_id);

    // Build diff for audit
    const diff = {};
    const fields = ['title', 'owner', 'status', 'due_date'];
    const newRec = { title: body.title.trim(), owner: body.owner || null, status, due_date: body.due_date || null };
    for (const f of fields) {
      let o = oldRecord[f]; if (o === undefined || o === '') o = null;
      let n = newRec[f];    if (n === undefined || n === '') n = null;
      if (o !== n) diff[f] = { old: o, new: n };
    }

    if (Object.keys(diff).length > 0) {
      const parentName = await getParentName(env, oldRecord.parent_type, oldRecord.parent_id);
      await logAudit(env, {
        resourceType: oldRecord.parent_type, resourceId: oldRecord.parent_id, resourceName: parentName,
        action: 'subtask_updated', userEmail,
        changes: { subtask_title: oldRecord.title, ...diff },
      });
    }

    return json({ id, ...newRec, parent_type: oldRecord.parent_type, parent_id: oldRecord.parent_id, updated_at: now, parent_progress: newProgress });
  }

  if (idMatch && method === 'DELETE') {
    const id = idMatch[1];
    const oldRecord = await env.DB.prepare('SELECT * FROM sub_tasks WHERE id=?').bind(id).first();
    if (!oldRecord) return json({ error: 'Not found' }, 404);

    await env.DB.prepare('DELETE FROM sub_tasks WHERE id=?').bind(id).run();
    const newProgress = await recomputeParentProgress(env, oldRecord.parent_type, oldRecord.parent_id);

    const parentName = await getParentName(env, oldRecord.parent_type, oldRecord.parent_id);
    await logAudit(env, {
      resourceType: oldRecord.parent_type, resourceId: oldRecord.parent_id, resourceName: parentName,
      action: 'subtask_removed', userEmail,
      changes: { subtask: { title: oldRecord.title, owner: oldRecord.owner, status: oldRecord.status, due_date: oldRecord.due_date } },
    });

    return json({ ok: true, parent_progress: newProgress });
  }

  return null;
}

// ============== PROJECTS ==============

async function handleProjects(request, env, url) {
  const path = url.pathname;
  const method = request.method;
  const userEmail = getUserEmail(request);

  if (path === '/api/projects' && method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT p.*,
        (SELECT COUNT(*) FROM sub_tasks WHERE parent_type='project' AND parent_id=p.id) AS subtask_total,
        (SELECT COUNT(*) FROM sub_tasks WHERE parent_type='project' AND parent_id=p.id AND status='Completed') AS subtask_done
       FROM projects p WHERE p.archived_at IS NULL ORDER BY (p.status = 'Completed') ASC, p.updated_at DESC`
    ).all();
    return json(results || []);
  }

  if (path === '/api/projects' && method === 'POST') {
    const body = await request.json();
    const errs = validateProject(body);
    if (errs.length) return json({ error: errs.join('; ') }, 400);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO projects (id, name, owner, secondary_owner, category, tool, phase, status, progress, target_date, last_milestone, next_milestone, challenges, notes, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(id, body.name, body.owner, body.secondary_owner || null, body.category || null, body.tool || null, body.phase, body.status, body.progress, body.target_date || null, body.last_milestone || null, body.next_milestone || null, body.challenges || null, body.notes || null, now, now).run();

    const initialValues = {};
    for (const f of PROJECT_AUDIT_FIELDS) initialValues[f] = body[f] ?? null;
    await logAudit(env, {
      resourceType: 'project', resourceId: id, resourceName: body.name,
      action: 'create', userEmail, changes: { _initial: initialValues },
    });

    return json({ id, ...body, created_at: now, updated_at: now });
  }

  const idMatch = path.match(/^\/api\/projects\/([a-f0-9-]+)$/i);
  if (idMatch && method === 'PUT') {
    const id = idMatch[1];
    const body = await request.json();
    const errs = validateProject(body);
    if (errs.length) return json({ error: errs.join('; ') }, 400);

    const oldRecord = await env.DB.prepare('SELECT * FROM projects WHERE id=?').bind(id).first();
    if (!oldRecord) return json({ error: 'Not found' }, 404);

    const now = new Date().toISOString();
    const res = await env.DB.prepare(
      `UPDATE projects SET name=?, owner=?, secondary_owner=?, category=?, tool=?, phase=?, status=?, progress=?, target_date=?, last_milestone=?, next_milestone=?, challenges=?, notes=?, updated_at=? WHERE id=?`
    ).bind(body.name, body.owner, body.secondary_owner || null, body.category || null, body.tool || null, body.phase, body.status, body.progress, body.target_date || null, body.last_milestone || null, body.next_milestone || null, body.challenges || null, body.notes || null, now, id).run();
    if (res.meta.changes === 0) return json({ error: 'Not found' }, 404);

    const diff = computeDiff(oldRecord, body, PROJECT_AUDIT_FIELDS);
    if (Object.keys(diff).length > 0) {
      await logAudit(env, {
        resourceType: 'project', resourceId: id, resourceName: body.name,
        action: 'update', userEmail, changes: diff,
      });
    }

    return json({ id, ...body, updated_at: now });
  }

  if (idMatch && method === 'DELETE') {
    const id = idMatch[1];
    const oldRecord = await env.DB.prepare('SELECT * FROM projects WHERE id=?').bind(id).first();
    if (!oldRecord) return json({ error: 'Not found' }, 404);
    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE projects SET archived_at=?, updated_at=? WHERE id=?').bind(now, now, id).run();

    await logAudit(env, {
      resourceType: 'project', resourceId: id,
      resourceName: oldRecord.name,
      action: 'archive', userEmail, changes: { status: { old: oldRecord.status, 'new': 'Archived' } },
    });

    return json({ ok: true });
  }
  return null;
}

// ============== BAU ==============

async function handleBau(request, env, url) {
  const path = url.pathname;
  const method = request.method;
  const userEmail = getUserEmail(request);

  if (path === '/api/bau' && method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT b.*,
        (SELECT COUNT(*) FROM sub_tasks WHERE parent_type='bau' AND parent_id=b.id) AS subtask_total,
        (SELECT COUNT(*) FROM sub_tasks WHERE parent_type='bau' AND parent_id=b.id AND status='Completed') AS subtask_done
       FROM bau_tasks b WHERE b.archived_at IS NULL ORDER BY (b.status IN ('Completed', 'Paused')) ASC, b.updated_at DESC`
    ).all();
    return json(results || []);
  }

  if (path === '/api/bau' && method === 'POST') {
    const body = await request.json();
    const errs = validateBau(body);
    if (errs.length) return json({ error: errs.join('; ') }, 400);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO bau_tasks (id, name, owner, secondary_owner, category, tool, frequency, priority, status, last_performed, next_due, is_ongoing, challenges, notes, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(id, body.name, body.owner, body.secondary_owner || null, body.category || null, body.tool || null, body.frequency, body.priority, body.status, body.last_performed || null, body.next_due || null, body.is_ongoing ? 1 : 0, body.challenges || null, body.notes || null, now, now).run();

    const initialValues = {};
    for (const f of BAU_AUDIT_FIELDS) initialValues[f] = body[f] ?? null;
    await logAudit(env, {
      resourceType: 'bau', resourceId: id, resourceName: body.name,
      action: 'create', userEmail, changes: { _initial: initialValues },
    });

    return json({ id, ...body, created_at: now, updated_at: now });
  }

  const idMatch = path.match(/^\/api\/bau\/([a-f0-9-]+)$/i);
  if (idMatch && method === 'PUT') {
    const id = idMatch[1];
    const body = await request.json();
    const errs = validateBau(body);
    if (errs.length) return json({ error: errs.join('; ') }, 400);

    const oldRecord = await env.DB.prepare('SELECT * FROM bau_tasks WHERE id=?').bind(id).first();
    if (!oldRecord) return json({ error: 'Not found' }, 404);

    const now = new Date().toISOString();
    const res = await env.DB.prepare(
      `UPDATE bau_tasks SET name=?, owner=?, secondary_owner=?, category=?, tool=?, frequency=?, priority=?, status=?, last_performed=?, next_due=?, is_ongoing=?, challenges=?, notes=?, updated_at=? WHERE id=?`
    ).bind(body.name, body.owner, body.secondary_owner || null, body.category || null, body.tool || null, body.frequency, body.priority, body.status, body.last_performed || null, body.next_due || null, body.is_ongoing ? 1 : 0, body.challenges || null, body.notes || null, now, id).run();
    if (res.meta.changes === 0) return json({ error: 'Not found' }, 404);

    const diff = computeDiff(oldRecord, body, BAU_AUDIT_FIELDS);
    if (Object.keys(diff).length > 0) {
      await logAudit(env, {
        resourceType: 'bau', resourceId: id, resourceName: body.name,
        action: 'update', userEmail, changes: diff,
      });
    }

    return json({ id, ...body, updated_at: now });
  }

  if (idMatch && method === 'DELETE') {
    const id = idMatch[1];
    const oldRecord = await env.DB.prepare('SELECT * FROM bau_tasks WHERE id=?').bind(id).first();
    if (!oldRecord) return json({ error: 'Not found' }, 404);
    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE bau_tasks SET archived_at=?, updated_at=? WHERE id=?').bind(now, now, id).run();

    await logAudit(env, {
      resourceType: 'bau', resourceId: id,
      resourceName: oldRecord.name,
      action: 'archive', userEmail, changes: { status: { old: oldRecord.status, 'new': 'Archived' } },
    });

    return json({ ok: true });
  }
  return null;
}

// ============== AUDIT ENDPOINT ==============

async function handleAudit(request, env, url) {
  const match = url.pathname.match(/^\/api\/audit\/(project|bau)\/([a-f0-9-]+)$/i);
  if (!match || request.method !== 'GET') return null;
  const [, resourceType, resourceId] = match;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '5', 10), 50);

  const { results } = await env.DB.prepare(
    `SELECT id, action, user_email, changes, timestamp
     FROM audit_log
     WHERE resource_type = ? AND resource_id = ?
     ORDER BY timestamp DESC
     LIMIT ?`
  ).bind(resourceType, resourceId, limit).all();

  const entries = (results || []).map(r => ({
    ...r,
    changes: r.changes ? JSON.parse(r.changes) : null,
  }));
  return json(entries);
}

// ============== ROUTER ==============

// ============== ARCHIVE ENDPOINT ==============

async function handleArchive(request, env, url) {
  const path = url.pathname;
  const method = request.method;
  const userEmail = getUserEmail(request);

  // GET /api/archive — list all archived items
  if (path === '/api/archive' && method === 'GET') {
    const { results: projects } = await env.DB.prepare('SELECT *, \'project\' as _type FROM projects WHERE archived_at IS NOT NULL ORDER BY archived_at DESC').all();
    const { results: bau } = await env.DB.prepare('SELECT *, \'bau\' as _type FROM bau_tasks WHERE archived_at IS NOT NULL ORDER BY archived_at DESC').all();
    return json({ projects: projects || [], bau: bau || [] });
  }

  // POST /api/archive/restore/:type/:id — restore from archive
  const restoreMatch = path.match(/^\/api\/archive\/restore\/(project|bau)\/([a-f0-9-]+)$/i);
  if (restoreMatch && method === 'POST') {
    const [, type, id] = restoreMatch;
    const table = type === 'project' ? 'projects' : 'bau_tasks';
    const now = new Date().toISOString();
    const record = await env.DB.prepare('SELECT * FROM ' + table + ' WHERE id=?').bind(id).first();
    if (!record) return json({ error: 'Not found' }, 404);
    await env.DB.prepare('UPDATE ' + table + ' SET archived_at=NULL, updated_at=? WHERE id=?').bind(now, id).run();

    await logAudit(env, {
      resourceType: type, resourceId: id,
      resourceName: record.name,
      action: 'restore', userEmail, changes: { status: { old: 'Archived', 'new': record.status } },
    });

    return json({ ok: true });
  }

  // DELETE /api/archive/:type/:id — permanently delete
  const purgeMatch = path.match(/^\/api\/archive\/(project|bau)\/([a-f0-9-]+)$/i);
  if (purgeMatch && method === 'DELETE') {
    const [, type, id] = purgeMatch;
    const table = type === 'project' ? 'projects' : 'bau_tasks';
    const record = await env.DB.prepare('SELECT * FROM ' + table + ' WHERE id=?').bind(id).first();
    await env.DB.prepare('DELETE FROM ' + table + ' WHERE id=?').bind(id).run();
    await env.DB.prepare('DELETE FROM audit_log WHERE resource_type=? AND resource_id=?').bind(type, id).run();
    await env.DB.prepare('DELETE FROM sub_tasks WHERE parent_type=? AND parent_id=?').bind(type, id).run();

    return json({ ok: true });
  }

  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/health') return json({ ok: true, time: new Date().toISOString() });

    if (url.pathname === '/api/metrics/snapshot') {
      try {
        // Current live metrics
        const { results: projs } = await env.DB.prepare("SELECT status, progress FROM projects WHERE archived_at IS NULL").all();
        const { results: baus } = await env.DB.prepare("SELECT status, priority, is_ongoing, next_due FROM bau_tasks WHERE archived_at IS NULL").all();
        const todayIso = new Date().toISOString().slice(0, 10);
        const onTrack = projs.filter(p => p.status === 'On Track').length;
        const atRisk  = projs.filter(p => p.status === 'At Risk' || p.status === 'On Hold').length;
        const delayed = projs.filter(p => p.status === 'Delayed').length;
        const completed = projs.filter(p => p.status === 'Completed').length;
        const avgProgress = projs.length > 0 ? Math.round(projs.reduce((s, p) => s + (p.progress || 0), 0) / projs.length) : 0;
        const bauActive = baus.filter(t => t.status === 'Active').length;
        const bauInProgress = baus.filter(t => t.status === 'In Progress').length;
        const bauOngoing = baus.filter(t => t.is_ongoing).length;
        const bauCritical = baus.filter(t => t.priority === 'Critical' && t.status !== 'Completed' && t.status !== 'Paused').length;
        const todayTs = Date.now();
        const bauOverdue = baus.filter(t => {
          if (!t.next_due || t.is_ongoing || t.status === 'Completed' || t.status === 'Paused') return false;
          return new Date(t.next_due).getTime() < todayTs;
        }).length;
        const current = {
          snapshot_date: todayIso,
          total_projects: projs.length, proj_on_track: onTrack, proj_at_risk: atRisk,
          proj_delayed: delayed, proj_completed: completed, proj_avg_progress: avgProgress,
          total_bau: baus.length, bau_active: bauActive, bau_in_progress: bauInProgress,
          bau_overdue: bauOverdue, bau_ongoing: bauOngoing, bau_critical: bauCritical,
        };
        // Baseline: closest snapshot 5-14 days old
        let baseline = null;
        try {
          const lo = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
          const hi = new Date(Date.now() -  5 * 86400000).toISOString().slice(0, 10);
          baseline = await env.DB.prepare(
            "SELECT * FROM metric_snapshots WHERE snapshot_date >= ? AND snapshot_date <= ? ORDER BY snapshot_date DESC LIMIT 1"
          ).bind(lo, hi).first();
        } catch (_) { baseline = null; }
        return json({ current, baseline });
      } catch (err) {
        return json({ error: err.message || 'Snapshot error' }, 500);
      }
    }

    if (url.pathname.startsWith('/api/archive')) {
      try { const r = await handleArchive(request, env, url); if (r) return r; }
      catch (err) { return json({ error: err.message || 'Server error' }, 500); }
      return json({ error: 'Method not allowed' }, 405);
    }

    if (url.pathname.startsWith('/api/audit/')) {
      try { const r = await handleAudit(request, env, url); if (r) return r; }
      catch (err) { return json({ error: err.message || 'Server error' }, 500); }
      return json({ error: 'Method not allowed' }, 405);
    }
    if (url.pathname.startsWith('/api/projects')) {
      try { const r = await handleProjects(request, env, url); if (r) return r; }
      catch (err) { return json({ error: err.message || 'Server error' }, 500); }
      return json({ error: 'Method not allowed' }, 405);
    }
    if (url.pathname.startsWith('/api/bau')) {
      try { const r = await handleBau(request, env, url); if (r) return r; }
      catch (err) { return json({ error: err.message || 'Server error' }, 500); }
      return json({ error: 'Method not allowed' }, 405);
    }
    if (url.pathname.startsWith('/api/subtasks')) {
      try { const r = await handleSubtasks(request, env, url); if (r) return r; }
      catch (err) { return json({ error: err.message || 'Server error' }, 500); }
      return json({ error: 'Method not allowed' }, 405);
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'X-Frame-Options': 'DENY',
        },
      });
    }
    return new Response('Not Found', { status: 404 });
  },

  async scheduled(event, env) {
    // ── Capture daily metric snapshot ──
    try {
      const { results: projs } = await env.DB.prepare("SELECT status, progress FROM projects WHERE archived_at IS NULL").all();
      const { results: baus } = await env.DB.prepare("SELECT status, priority, is_ongoing, next_due FROM bau_tasks WHERE archived_at IS NULL").all();
      const todayIso = new Date().toISOString().slice(0, 10);
      const onTrack = projs.filter(p => p.status === 'On Track').length;
      const atRisk  = projs.filter(p => p.status === 'At Risk' || p.status === 'On Hold').length;
      const delayed = projs.filter(p => p.status === 'Delayed').length;
      const completed = projs.filter(p => p.status === 'Completed').length;
      const avgProgress = projs.length > 0 ? Math.round(projs.reduce((s, p) => s + (p.progress || 0), 0) / projs.length) : 0;
      const bauActive = baus.filter(t => t.status === 'Active').length;
      const bauInProgress = baus.filter(t => t.status === 'In Progress').length;
      const bauOngoing = baus.filter(t => t.is_ongoing).length;
      const bauCritical = baus.filter(t => t.priority === 'Critical' && t.status !== 'Completed' && t.status !== 'Paused').length;
      const todayTs = Date.now();
      const bauOverdue = baus.filter(t => {
        if (!t.next_due || t.is_ongoing || t.status === 'Completed' || t.status === 'Paused') return false;
        return new Date(t.next_due).getTime() < todayTs;
      }).length;
      await env.DB.prepare(
        `INSERT OR REPLACE INTO metric_snapshots
         (snapshot_date, total_projects, proj_on_track, proj_at_risk, proj_delayed, proj_completed, proj_avg_progress,
          total_bau, bau_active, bau_in_progress, bau_overdue, bau_ongoing, bau_critical, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(todayIso, projs.length, onTrack, atRisk, delayed, completed, avgProgress,
             baus.length, bauActive, bauInProgress, bauOverdue, bauOngoing, bauCritical, Date.now()).run();
    } catch (err) {
      // Table may not exist yet (migration not run) — fail silently so purge can continue
      console.error('Snapshot capture failed:', err.message);
    }

    // Auto-purge: permanently delete items archived > 30 days ago
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get IDs for audit + subtask cleanup
    const { results: oldProjects } = await env.DB.prepare('SELECT id FROM projects WHERE archived_at IS NOT NULL AND archived_at < ?').bind(cutoff).all();
    const { results: oldBau } = await env.DB.prepare('SELECT id FROM bau_tasks WHERE archived_at IS NOT NULL AND archived_at < ?').bind(cutoff).all();

    // Delete records
    await env.DB.prepare('DELETE FROM projects WHERE archived_at IS NOT NULL AND archived_at < ?').bind(cutoff).run();
    await env.DB.prepare('DELETE FROM bau_tasks WHERE archived_at IS NOT NULL AND archived_at < ?').bind(cutoff).run();

    // Clean up audit logs + sub-tasks for purged records
    for (const r of (oldProjects || [])) {
      await env.DB.prepare('DELETE FROM audit_log WHERE resource_id=?').bind(r.id).run();
      await env.DB.prepare('DELETE FROM sub_tasks WHERE parent_type=? AND parent_id=?').bind('project', r.id).run();
    }
    for (const r of (oldBau || [])) {
      await env.DB.prepare('DELETE FROM audit_log WHERE resource_id=?').bind(r.id).run();
      await env.DB.prepare('DELETE FROM sub_tasks WHERE parent_type=? AND parent_id=?').bind('bau', r.id).run();
    }
  },
};