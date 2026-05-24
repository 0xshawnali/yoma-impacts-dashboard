/**
 * app.js
 * Yoma Impacts Dashboard — application logic.
 *
 * Waits for the portal:init event from portal-bridge.js before rendering.
 * Falls back to standalone mode (mock data) when not inside a Portal iframe.
 * All privileged actions go through window.IxoPortalBridge.requestAction().
 */

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────

  const BLOCKSYNC_URL = 'https://blocksync-graphql.ixo.earth/graphql';
  const STANDALONE_TIMEOUT_MS = 1200; // ms to wait for INIT before assuming standalone

  // ── State ─────────────────────────────────────────────────────────────────

  let _portalContext = null;    // set on portal:init
  let _standalone    = false;   // true when running outside Portal

  // ── Active tab ───────────────────────────────────────────────────────────

  let _activeView    = 'contract';
  let _activeSub     = { contract: 'overview' };

  // ── Data ──────────────────────────────────────────────────────────────────

  // Contract ID comes from Portal entity context when available;
  // falls back to env var injected at build time or placeholder.
  function getContractId() {
    if (_portalContext && _portalContext.entityDid) return _portalContext.entityDid;
    return (typeof __CONTRACT_ENTITY_DID__ !== 'undefined')
      ? __CONTRACT_ENTITY_DID__
      : 'UNICEF-IXO-2024-001'; // placeholder for standalone mode
  }

  // ── Blocksync query (live data path) ─────────────────────────────────────

  async function blocksyncQuery(query, variables) {
    const res = await fetch(BLOCKSYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error('Blocksync HTTP ' + res.status);
    const json = await res.json();
    if (json.errors && json.errors.length) throw new Error(json.errors[0].message);
    return json.data;
  }

  // ── Mock data (standalone / no live endpoint) ─────────────────────────────

  const MOCK = {
    reportMeta: {
      contract: '43450556',
      period: 'Up to 20 April 2026',
      phase: 'Foundation & activation — scale delivery from June/July 2026',
    },
    targets: {
      youthRecruited: 16600, awareness: 13000,
      gigs: 6000, placements: 300,
      entM1: 67, entM2: 84,
    },
    metrics: {
      youthReached: 0, youthOnboarded: 0, youthActive: 0,
      digitalIds: 14, credentials: 0,
      gigsActivated: 0, gigsCompleted: 0, gigsVerified: 0,
      gigsGreen: 0, youthEarning: 0, avgEarnings: 0,
      claimsSubmitted: 0, claimsApproved: 0, paymentsMade: 0,
      entM1: 0, entM2: 0,
      launchLabEnrolled: 0, launchLabPlacements: 0,
      sustained3m: 0, sustained6m: 0,
      solutionsEngineers: 14,
    },
    trajectory: {
      youthOnboarding: [
        { q: 'Q1', inc: 0,    cum: 0,     note: 'Infrastructure & readiness' },
        { q: 'Q2', inc: 5000, cum: 5000,  note: 'DPP1 activation' },
        { q: 'Q3', inc: 7500, cum: 12500, note: 'DPP1+DPP2 scale' },
        { q: 'Q4', inc: 4100, cum: 16600, note: 'Full target' },
      ],
      verifiedTasks: [
        { q: 'Q1', inc: 0,    cum: 0,    note: 'No verified output yet' },
        { q: 'Q2', inc: 400,  cum: 400,  note: 'First outputs late Q2' },
        { q: 'Q3', inc: 3500, cum: 3900, note: 'Scale delivery' },
        { q: 'Q4', inc: 2100, cum: 6000, note: 'Full target' },
      ],
    },
    dpp1: [
      { name: 'Hoedspruit Hub / PYEI', focus: 'Functional Numeracy',        range: '3,000–5,000', mid: 4000 },
      { name: 'DUCT',                  focus: 'Environmental Monitoring',    range: '800–1,200',   mid: 1000 },
      { name: 'Umuzi',                 focus: 'Digital Livelihoods (MSRC)',  range: '200–400',     mid: 300  },
      { name: 'Green Pill Cape Town',  focus: 'Circular Economy / Web3',     range: '50–150',      mid: 100  },
      { name: 'Shonaquip',            focus: 'Assistive Technology',         range: '50–150',      mid: 100  },
    ],
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }
  function pct(v, t) { return t ? Math.min(100, Math.round(v / t * 100)) : 0; }

  function kpiCard(label, value, target, color, sub, status) {
    const p  = target && target !== 1 ? pct(value, target) : null;
    const sc = { ON_TRACK: '#16A34A', AT_RISK: '#D97706', DELAYED: '#DC2626', COMPLETE: '#0891B2' };
    const sb = status ? `<span class="badge badge-${status.toLowerCase().replace('_', '-')}">${status.replace('_', ' ')}</span>` : '';
    const bar = p !== null ? `<div class="kpi-bar"><div class="kpi-fill" style="width:${p}%;background:${color}"></div></div>` : '';
    const tDisp = target && target !== 1 ? `<span class="kpi-target">/ ${fmt(target)}</span>` : '';
    return `
      <div class="kpi">
        <div class="kpi-label">${label}</div>
        <div class="kpi-value" style="color:${color}">${fmt(value)}${tDisp}</div>
        ${bar}
        <div class="kpi-meta"><span>${sub || ''}</span>${p !== null ? `<span style="color:${color};font-weight:700">${p}%</span>` : ''}</div>
        ${sb}
      </div>`;
  }

  function secHead(label) {
    return `<div class="sec-head"><span>${label}</span></div>`;
  }

  function trajTable(rows, target) {
    const rowsHtml = rows.map(r => {
      const p   = pct(r.cum, target);
      const col = r.cum === 0 ? '#9CA3AF' : r.cum >= target ? '#16A34A' : '#7C3AED';
      return `<tr>
        <td class="bold">${r.q}</td>
        <td>${r.inc ? '+' + r.inc.toLocaleString() : '—'}</td>
        <td style="color:${col};font-weight:700">${r.cum.toLocaleString()}</td>
        <td><div class="mini-bar-wrap"><div class="mini-bar"><div class="mini-fill" style="width:${p}%;background:${col}"></div></div><span style="color:${col};font-size:11px">${p}%</span></div></td>
        <td class="muted">${r.note}</td>
      </tr>`;
    }).join('');
    return `<table class="data-table"><thead><tr><th>Period</th><th>Increment</th><th>Cumulative</th><th>Progress</th><th>Note</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
  }

  // ── Views ─────────────────────────────────────────────────────────────────

  function renderOverview(m, t) {
    return `
      <div class="alert amber">
        <span class="alert-icon">⚠</span>
        <div><strong>Q1–Q2 2026: Readiness & activation phase.</strong>
        DPP1 activated April 2026. First verified outputs expected late Q2. Scale delivery begins Q3 with DPP1+DPP2.</div>
      </div>

      ${secHead('Youth engagement')}
      <div class="kpi-grid">
        ${kpiCard('Youth reached',      m.youthReached,   t.awareness,      '#0891B2', 'awareness target',    'AT_RISK')}
        ${kpiCard('Youth onboarded',    m.youthOnboarded, t.youthRecruited, '#7C3AED', 'recruitment target',  'AT_RISK')}
        ${kpiCard('Youth active (30d)', m.youthActive,    null,             '#6B7280', pct(m.youthActive, m.youthOnboarded) + '% of onboarded')}
        ${kpiCard('Digital IDs issued', m.digitalIds,     null,             '#16A34A', 'YoID · YOMA compatible', 'COMPLETE')}
        ${kpiCard('Credentials issued', m.credentials,    null,             '#A855F7', 'Verified completions')}
      </div>

      ${secHead('Gig & opportunity delivery — DPP1')}
      <div class="kpi-grid">
        ${kpiCard('Gigs verified',          m.gigsVerified,  t.gigs,  '#16A34A', 'of 6,000 minimum', 'ON_TRACK')}
        ${kpiCard('Gigs completed',         m.gigsCompleted, null,    '#6B7280', pct(m.gigsCompleted, m.gigsActivated) + '% completion')}
        ${kpiCard('Green-linked gigs',      m.gigsGreen,     null,    '#16A34A', 'SDG 13/15 tagged')}
        ${kpiCard('Youth earning via gigs', m.youthEarning,  140,     '#7C3AED', 'Cohorts 1+2', 'COMPLETE')}
        ${kpiCard('Avg earnings / youth',   m.avgEarnings,   null,    '#EA580C', 'Target ~R5,000/month')}
      </div>

      ${secHead('Claims & payments')}
      <div class="kpi-grid">
        ${kpiCard('Claims submitted',  m.claimsSubmitted, null, '#6B7280', 'All partners')}
        ${kpiCard('Claims approved',   m.claimsApproved,  null, '#16A34A', pct(m.claimsApproved, m.claimsSubmitted) + '% approval rate')}
        ${kpiCard('Payments made',     m.paymentsMade,    null, '#0891B2', '90% of approved')}
        ${kpiCard('Entrepreneurs M1',  m.entM1, t.entM1,       '#D97706', 'milestone 1', 'AT_RISK')}
        ${kpiCard('Entrepreneurs M2',  m.entM2, t.entM2,       '#DC2626', 'milestone 2', 'DELAYED')}
      </div>

      ${secHead('Livelihoods & placements')}
      <div class="kpi-grid">
        ${kpiCard('Launch Lab enrolled',       m.launchLabEnrolled,  250,          '#D97706', 'of 250 recommended', 'AT_RISK')}
        ${kpiCard('Solutions engineers (SEs)', m.solutionsEngineers, t.placements, '#7C3AED', 'toward 300 target',  'ON_TRACK')}
        ${kpiCard('In placement pathway',      m.launchLabPlacements,null,         '#6B7280', 'Employment/income')}
        ${kpiCard('Sustained 3-month',         m.sustained3m,        null,         '#D97706', 'Follow-up confirmed')}
        ${kpiCard('Sustained 6-month',         m.sustained6m,        t.placements, '#DC2626', 'of 300 contract target', 'DELAYED')}
      </div>`;
  }

  function renderTrajectory(data) {
    return `
      <div class="info-box">
        <strong>Source: Interim Delivery Readiness & Pipeline Report — Contract 43450556 · 20 April 2026</strong><br>
        Q1–Q2 is weighted toward system and partner activation. Scale delivery and verified results are expected in Q3–Q4.
      </div>

      ${secHead('5.1 Youth onboarding — target 16,600')}
      ${trajTable(data.trajectory.youthOnboarding, data.targets.youthRecruited)}

      ${secHead('5.2 Verified impact tasks — target 6,000')}
      ${trajTable(data.trajectory.verifiedTasks, data.targets.gigs)}

      ${secHead('DPP1 partner contribution pipeline (Q2–Q3 indicative)')}
      <table class="data-table">
        <thead><tr><th>Partner</th><th>Focus area</th><th>Range (Q2–Q3)</th><th>Midpoint</th><th>Status</th></tr></thead>
        <tbody>${data.dpp1.map(p => `
          <tr>
            <td class="bold">${p.name}</td>
            <td>${p.focus}</td>
            <td style="font-family:monospace;color:#D97706">${p.range}</td>
            <td style="font-family:monospace;font-weight:700;color:#16A34A">${p.mid.toLocaleString()}</td>
            <td><span class="badge badge-on-track">DPP1 Active</span></td>
          </tr>`).join('')}
        </tbody>
      </table>

      <div class="gap-callout">
        <div class="gap-title">⚠ DPP2 — July 2026 expansion (planned)</div>
        <div>A second Design Partner cohort planned for July 2026 will expand active delivery partners and accelerate Q3–Q4 output generation.
        Partner estimates are under development. <strong>DPP2 is a critical path dependency for meeting 16,600 and 6,000 targets.</strong></div>
      </div>`;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function renderNav() {
    const views = [
      { id: 'contract', label: 'Contract delivery' },
      { id: 'orgs',     label: 'Organisations' },
    ];
    return `
      <nav class="view-nav" role="navigation" aria-label="Dashboard views">
        ${views.map(v => `
          <button class="vnav-btn ${_activeView === v.id ? 'active' : ''}"
            onclick="window.__app.switchView('${v.id}')">${v.label}</button>
        `).join('')}
      </nav>`;
  }

  function renderSubNav(view) {
    const subs = {
      contract: [
        { id: 'overview',    label: 'Executive overview' },
        { id: 'trajectory',  label: 'Target trajectory' },
      ],
      orgs: [
        { id: 'dpp1',  label: 'DPP1 partners' },
        { id: 'dpp2',  label: 'DPP2 pipeline' },
      ],
    };
    const tabs = subs[view] || [];
    const cur  = _activeSub[view] || tabs[0]?.id;
    return `
      <div class="sub-nav" role="tablist">
        ${tabs.map(t => `
          <button class="stab ${cur === t.id ? 'active' : ''}"
            role="tab" aria-selected="${cur === t.id}"
            onclick="window.__app.switchSub('${view}', '${t.id}')">${t.label}</button>
        `).join('')}
      </div>`;
  }

  // ── Full render ───────────────────────────────────────────────────────────

  function render() {
    const m = MOCK.metrics;
    const t = MOCK.targets;
    const cur = _activeSub[_activeView] || 'overview';

    let bodyHtml = '';
    if (_activeView === 'contract') {
      if (cur === 'overview')   bodyHtml = renderOverview(m, t);
      if (cur === 'trajectory') bodyHtml = renderTrajectory(MOCK);
    } else if (_activeView === 'orgs') {
      if (cur === 'dpp1') {
        bodyHtml = `
          ${secHead('DPP1 active partners — Q2 2026')}
          <table class="data-table">
            <thead><tr><th>Partner</th><th>Focus area</th><th>Range</th><th>Midpoint</th></tr></thead>
            <tbody>${MOCK.dpp1.map(p => `
              <tr><td class="bold">${p.name}</td><td>${p.focus}</td>
              <td style="font-family:monospace">${p.range}</td>
              <td style="font-family:monospace;font-weight:700">${p.mid.toLocaleString()}</td></tr>`).join('')}
            </tbody>
          </table>`;
      }
      if (cur === 'dpp2') {
        bodyHtml = `
          <div class="info-box">DPP2 partners (Kruger 2 Canyons Biosphere, GroundTruth, Amandla Safe Hubs, Giga) are
          onboarding in Q3 2026. Pipeline details will appear here once workflows are configured.</div>`;
      }
    }

    const contextLabel = _portalContext
      ? `Entity: ${_portalContext.entityDid || 'connected'}`
      : 'Standalone mode';

    document.getElementById('app-root').innerHTML = `
      <div class="dashboard">
        <header class="dash-header">
          <div class="dash-wordmark">
            <div class="dash-logo">Y</div>
            <div>
              <div class="dash-title">Yoma Impacts Exchange</div>
              <div class="dash-sub">Multi-funder reporting dashboard · Contract 43450556</div>
            </div>
          </div>
          <div class="dash-meta">
            <span class="context-chip">${contextLabel}</span>
            <span class="context-chip">IXO World AG / Umuzi · Jan–Dec 2026</span>
          </div>
        </header>
        ${renderNav()}
        ${renderSubNav(_activeView)}
        <main class="dash-body">${bodyHtml}</main>
      </div>`;
  }

  // ── Portal event wiring ───────────────────────────────────────────────────

  window.addEventListener('portal:init', function (e) {
    _portalContext = e.detail;
    // If Portal provided a specific contract entity DID, we could use it
    // to fetch live data from Blocksync here.
    render();
  });

  window.addEventListener('portal:contextUpdate', function (e) {
    _portalContext = Object.assign(_portalContext || {}, e.detail);
    render();
  });

  // ── Public interface (for onclick handlers) ───────────────────────────────

  window.__app = {
    switchView(viewId) {
      _activeView = viewId;
      if (!_activeSub[viewId]) _activeSub[viewId] = viewId === 'contract' ? 'overview' : 'dpp1';
      render();
    },
    switchSub(viewId, subId) {
      _activeSub[viewId] = subId;
      render();
    },
    requestPortalAction(action, params) {
      if (window.IxoPortalBridge) {
        window.IxoPortalBridge.requestAction(action, params);
      }
    },
  };

  // ── Standalone fallback ───────────────────────────────────────────────────
  // If INIT not received within timeout, render with mock data anyway.

  setTimeout(function () {
    if (!_portalContext) {
      _standalone = true;
      render();
    }
  }, STANDALONE_TIMEOUT_MS);

})();
