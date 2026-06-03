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

  let _activeView = 'contract';
  let _activeSub  = { contract: 'overview', funders: 'pwc', orgs: 'dpp1' };

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
    // ── Yoma World & YoID platform analytics (source: GA4 snapshot, 01 Jan 2025 – 03 Jun 2026)
    yomaAnalytics: {
      period:   '01 Jan 2025 – 03 Jun 2026',
      vsPeriod: 'vs 01 Aug 2023 – 31 Dec 2024',
      activeUsers:          423902,  activeUsersGrowth:    227.55,
      newUsers:             415679,  newUsersGrowth:       223.68,
      avgEngagementTime:    '00:05:15',
      avgEngagementGrowth:  41.72,
      byChannel: [
        { channel: 'Direct',         users: 272921, growth: 203.29 },
        { channel: 'Organic Search', users: 67730,  growth: 195.88 },
        { channel: 'Referral',       users: 46164,  growth: 347.89 },
        { channel: 'Organic Social', users: 28687,  growth: 463.82 },
      ],
      byCountry: [
        { country: 'Nigeria',      flag: '🇳🇬', users: 220797, growth: 184.95   },
        { country: 'South Africa', flag: '🇿🇦', users: 74854,  growth: 250.67,  programme: true },
        { country: 'Philippines',  flag: '🇵🇭', users: 29803,  growth: 10816.85 },
        { country: 'Kenya',        flag: '🇰🇪', users: 21041,  growth: 240.58   },
      ],
      byCity: [
        { city: 'Lagos',  users: 108690, growth: 184.70  },
        { city: 'Abuja',  users: 59730,  growth: 210.38  },
      ],
    },

    dpp2: [
      {
        name: 'Humanitarian OpenStreetMap Team (HOT)',
        focus: 'Community Mapping & Geospatial Data',
        target: 1000, quarter: 'Q3 2026', status: 'confirmed',
        note: 'Youth-led participatory mapping of impact zones and green infrastructure.',
      },
      {
        name: 'Kruger 2 Canyons Biosphere',
        focus: 'Environmental Conservation',
        target: null, quarter: 'Q3 2026', status: 'onboarding',
        note: 'Biodiversity monitoring and youth ranger programme.',
      },
      {
        name: 'GroundTruth',
        focus: 'Environmental Monitoring',
        target: null, quarter: 'Q3 2026', status: 'onboarding',
        note: 'Citizen science and environmental data collection.',
      },
      {
        name: 'Amandla Safe Hubs',
        focus: 'Youth Safety & Livelihoods',
        target: null, quarter: 'Q3 2026', status: 'onboarding',
        note: 'Safe spaces and livelihood pathways for vulnerable youth.',
      },
      {
        name: 'Giga',
        focus: 'School Connectivity',
        target: null, quarter: 'Q3 2026', status: 'onboarding',
        note: 'Connecting schools to the internet to enable digital opportunities.',
      },
    ],

    dpp1: [
      { name: 'Hoedspruit Hub / PYEI', focus: 'Functional Numeracy',        range: '3,000–5,000', mid: 4000 },
      { name: 'DUCT',                  focus: 'Environmental Monitoring',    range: '800–1,200',   mid: 1000 },
      { name: 'Umuzi',                 focus: 'Digital Livelihoods (MSRC)',  range: '200–400',     mid: 300  },
      { name: 'Green Pill Cape Town',  focus: 'Circular Economy / Web3',     range: '50–150',      mid: 100  },
      { name: 'Shonaquip',             focus: 'Assistive Technology',        range: '50–150',      mid: 100  },
    ],
  };

  // ── Funder data ───────────────────────────────────────────────────────────

  const FUNDERS = {
    pwc: {
      name: 'PwC',
      fullName: 'PricewaterhouseCoopers',
      color: '#D04A02',
      colorLight: '#FFF7F5',
      colorBorder: '#FDBA74',
      mandate: 'Digital impact marketplace & youth economic inclusion',
      contribution: 'R 3,200,000',
      period: 'Jan – Dec 2026',
      focus: ['Digital impact marketplace', 'Youth engagement (30k)', 'Online skilling (500)', 'Governance & strategy', 'Impact economy research'],
      narrative: 'PwC\'s programme spans five integrated work streams: building and deploying the GenU SA digital impact marketplace (IXO as technical partner and Siba as research consultant); youth engagement and consultations toward a 30,000 target; GenU SA governance structure; online skilling curriculum (500 completions); and private sector partnership development for a sustainable gig pipeline. Stakeholder consultations and draft strategies were completed in Q1. The marketplace platform is going live in June 2026 — scale delivery of browsing, registration, and gig completion targets is the focus for Q3.',
      allocation: [
        { label: 'Digital marketplace — research (Siba) + technical (IXO)', pct: 35, amount: 'R 1,120,000' },
        { label: 'Youth engagement & consultations',                          pct: 25, amount: 'R 800,000'   },
        { label: 'Governance & strategy frameworks',                          pct: 20, amount: 'R 640,000'   },
        { label: 'Private sector partnership development',                    pct: 12, amount: 'R 384,000'   },
        { label: 'Impact economy research + comms & M&E',                    pct:  8, amount: 'R 256,000'   },
      ],
      kpis: [
        { label: 'Youth in consultations / platforms', value: 5000, target: 30000, color: '#D97706', sub: 'GenU SA annual target',      status: 'AT_RISK'  },
        { label: 'Youth browsed marketplace',          value: 0,    target: 10000, color: '#0891B2', sub: 'by Dec 2026',                status: 'AT_RISK'  },
        { label: 'Youth registered',                   value: 0,    target: 5000,  color: '#7C3AED', sub: 'by Dec 2026',                status: 'AT_RISK'  },
        { label: 'Youth completed gigs / jobs',        value: 0,    target: 1000,  color: '#16A34A', sub: 'by Dec 2026',                status: 'AT_RISK'  },
        { label: 'Online skilling completions',        value: 0,    target: 500,   color: '#A855F7', sub: 'curriculum completed',       status: 'AT_RISK'  },
        { label: 'Marketplace deployed',               value: 0,    target: null,  color: '#0891B2', sub: 'live deployment — Jun 2026', status: 'ON_TRACK' },
        { label: 'Thought leadership piece',           value: 0,    target: null,  color: '#D97706', sub: 'draft shared — Jun 2026',    status: 'ON_TRACK' },
      ],
      // Digital marketplace conversion funnel — sourced from PwC_Milestones.xlsx
      funnel: [
        { label: 'Youth in consultations / platforms', value: 5000, target: 30000 },
        { label: 'Browsed digital marketplace',        value: 0,    target: 10000 },
        { label: 'Registered on marketplace',          value: 0,    target: 5000  },
        { label: 'Applied for gigs / jobs',            value: 0,    target: 2000  },
        { label: 'Completed gigs / jobs',              value: 0,    target: 1000  },
      ],
      milestones: [
        { label: 'Governance desk review + platform planning (IXO)',     due: 'Jan 2026', status: 'complete'    },
        { label: 'Research & private sector desk reviews (Siba)',         due: 'Feb 2026', status: 'complete'    },
        { label: 'Stakeholder consultations + draft strategies',          due: 'Mar 2026', status: 'complete'    },
        { label: 'Expertise appointed + platform demo (test/dev env)',    due: 'Apr 2026', status: 'complete'    },
        { label: 'Final strategies + platform roll-out begins',           due: 'May 2026', status: 'complete'    },
        { label: 'Marketplace LIVE + Digital ID integration',             due: 'Jun 2026', status: 'in-progress' },
        { label: 'Draft thought leadership piece shared for review',      due: 'Jun 2026', status: 'in-progress' },
        { label: '4k registered · 2k applied · youth onboarded for gigs',due: 'Jul 2026', status: 'upcoming'    },
        { label: 'Final GenU board structure (TORs) + targets on track',  due: 'Aug 2026', status: 'upcoming'    },
        { label: 'Final project report & platform demo',                  due: 'Dec 2026', status: 'upcoming'    },
      ],
    },

    canada: {
      name: 'Canada',
      fullName: 'Government of Canada — Global Affairs (GAC)',
      color: '#CC0000',
      colorLight: '#FFF5F5',
      colorBorder: '#FECACA',
      mandate: 'Digital livelihoods · Green Rising · Youth economic inclusion',
      contribution: 'R 7,800,000',
      period: 'Jan – Dec 2025 / 2026',
      focus: ['Yoma digital marketplace (SA)', 'Passport to Earning (P2E)', 'Green Rising actions', 'Job placements (60% female)', 'Digital credentials'],
      narrative: 'GAC-supported programming operates through two streams: (1) Digital Initiatives — leveraging Yoma as a learning-to-earning ecosystem in South Africa, where 46.1% of youth aged 15–34 are unemployed (Stats SA, Q1 2025) and internet connectivity stands at 75.7%. Yoma SA has already delivered 7,748 youth skilled and 1,020 job/apprenticeship placements (54.4% female). (2) Green Rising — mobilising youth to take verified climate actions via Yoma, Volunteering, U-Report, and Education programmes, reporting on environmental outcomes (trees planted, land rehabilitated, water and energy saved). Global targets: 4 million P2E-certified youth and 500,000 job placements via Yoma/1MiO/YouthHub.',
      allocation: [
        { label: 'Yoma & digital marketplace — South Africa', pct: 38, amount: 'R 2,964,000' },
        { label: 'Passport to Earning (P2E) — digital skills', pct: 27, amount: 'R 2,106,000' },
        { label: 'Green Rising programme (SA)',                pct: 20, amount: 'R 1,560,000' },
        { label: 'Gender equity & inclusion',                  pct:  8, amount: 'R 624,000'   },
        { label: 'Programme management',                       pct:  7, amount: 'R 546,000'   },
      ],
      kpis: [
        { label: 'Yoma SA — youth skilled',        value: 7748,  target: null,    color: '#7C3AED', sub: '54.4% female · Jan–Dec 2025',         status: 'ON_TRACK' },
        { label: 'Job / apprenticeship placements', value: 1020,  target: null,    color: '#16A34A', sub: '54.4% female · Yoma SA reported',      status: 'ON_TRACK' },
        { label: 'Yoma SA platform users',          value: 74854, target: null,    color: '#CC0000', sub: '↑ 250.67% · Jan 2025–Jun 2026',        status: 'ON_TRACK' },
        { label: 'Youth mobilised — green actions', value: 0,     target: null,    color: '#0891B2', sub: 'Yoma + Volunteering + U-Report',        status: null       },
        { label: 'P2E certified skills (global)',   value: 0,     target: 4000000, color: '#D97706', sub: '60% female target · global',            status: 'AT_RISK'  },
        { label: 'Global placements target',        value: 0,     target: 500000,  color: '#A855F7', sub: 'Yoma / 1MiO / YouthHub',               status: 'AT_RISK'  },
      ],
      milestones: [
        { label: 'SA digital initiatives baseline established',       due: 'Jan 2025', status: 'complete'    },
        { label: 'Yoma SA: 7,748 youth skilled (reported)',           due: 'Dec 2025', status: 'complete'    },
        { label: 'Yoma SA: 1,020 job / apprenticeship placements',    due: 'Dec 2025', status: 'complete'    },
        { label: 'Green Rising reporting cycle (Jan–Dec 2025)',        due: 'Dec 2025', status: 'complete'    },
        { label: 'P2E skills taxonomy + content library rollout',      due: 'Q2 2026', status: 'in-progress' },
        { label: 'Gender-disaggregated results submitted to GAC',      due: 'Jun 2026', status: 'in-progress' },
        { label: 'Year 2 digital initiatives reporting cycle opens',   due: 'Jan 2026', status: 'upcoming'    },
        { label: '500k placements global target (Yoma/1MiO/YouthHub)', due: 'Dec 2026', status: 'upcoming'    },
      ],
    },

    capgemini: {
      name: 'Capgemini',
      fullName: 'Capgemini Group',
      color: '#0070AD',
      colorLight: '#EFF6FF',
      colorBorder: '#BFDBFE',
      mandate: 'GreenRising (GVI + Merilife) · YouthHub · Climate action',
      contribution: 'R 2,600,000',
      period: 'Jan – Dec 2025 / 2026',
      focus: ['Green Volunteering Initiative (GVI)', 'Merilife — Amazon biodiversity', 'YouthHub digital skills', 'Climate action (SDG 13)', '800 municipalities'],
      narrative: 'Capgemini\'s UNICEF partnership covers two reporting streams: GreenRising (including the Green Volunteering Initiative and the Merilife Amazon programme) and YouthHub. GreenRising targets 79,000 adolescents taking verified climate action across 800 municipalities, with Merilife focused on 250,000 people in the Amazon region (SDG 13/15). YouthHub connects youth to digital skills and livelihood pathways. Beneficiary counting follows strict methodology: direct beneficiaries must actively participate or complete a module; indirect beneficiaries benefit through broader programme impact. Platform engagement requires a minimum interaction threshold to qualify as meaningful use and avoid double counting via unique identifiers.',
      allocation: [
        { label: 'GreenRising — GVI & Merilife (Amazon)', pct: 50, amount: 'R 1,300,000' },
        { label: 'YouthHub — digital skills & livelihoods', pct: 30, amount: 'R 780,000'  },
        { label: 'Methodology, M&E & beneficiary validation', pct: 12, amount: 'R 312,000' },
        { label: 'Communications & visibility',              pct:  8, amount: 'R 208,000'  },
      ],
      kpis: [
        { label: 'Municipalities impacted (GVI)',     value: 0, target: 800,    color: '#0070AD', sub: 'GreenRising · 2025 target',          status: 'AT_RISK' },
        { label: 'People impacted — Amazon',          value: 0, target: 250000, color: '#16A34A', sub: 'Merilife · SDG 13/15',               status: 'AT_RISK' },
        { label: 'Adolescents — climate action',      value: 0, target: 79000,  color: '#0891B2', sub: 'GreenRising total',                  status: 'AT_RISK' },
        { label: 'Direct beneficiaries (all)',        value: 0, target: null,   color: '#7C3AED', sub: 'active participants · all programmes', status: null     },
        { label: 'Indirect beneficiaries',            value: 0, target: null,   color: '#6B7280', sub: 'community & family reach',            status: null     },
        { label: 'YouthHub — youth skilled',          value: 0, target: null,   color: '#D97706', sub: 'digital skills completions',          status: null     },
      ],
      milestones: [
        { label: 'GreenRising partnership agreement finalised',      due: 'Jan 2026', status: 'complete'    },
        { label: 'GVI programme launch — municipalities onboarded',  due: 'Q1 2026',  status: 'complete'    },
        { label: 'Merilife Amazon activities begin',                  due: 'Q2 2026',  status: 'in-progress' },
        { label: 'YouthHub digital skills cohort 1',                  due: 'Q2 2026',  status: 'in-progress' },
        { label: 'Mid-year report submitted to Capgemini',            due: 'Jul 2026', status: 'upcoming'    },
        { label: '800 municipalities impacted — GVI target',          due: 'Dec 2026', status: 'upcoming'    },
        { label: '79,000 adolescents taking climate action',          due: 'Dec 2026', status: 'upcoming'    },
        { label: 'Annual report + beneficiary validation complete',   due: 'Dec 2026', status: 'upcoming'    },
      ],
    },
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }
  function pct(v, t) { return t ? Math.min(100, Math.round(v / t * 100)) : 0; }

  function kpiCard(label, value, target, color, sub, status) {
    const p  = target && target !== 1 ? pct(value, target) : null;
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
        ${kpiCard('Youth reached',      m.youthReached,   t.awareness,      '#4cade9', 'awareness target',    'AT_RISK')}
        ${kpiCard('Youth onboarded',    m.youthOnboarded, t.youthRecruited, '#41204b', 'recruitment target',  'AT_RISK')}
        ${kpiCard('Youth active (30d)', m.youthActive,    null,             '#9B8FAA', pct(m.youthActive, m.youthOnboarded) + '% of onboarded')}
        ${kpiCard('Digital IDs issued', m.digitalIds,     null,             '#387f6a', 'YoID · YOMA compatible', 'COMPLETE')}
        ${kpiCard('Credentials issued', m.credentials,    null,             '#6B3578', 'Verified completions')}
      </div>

      ${secHead('Gig & opportunity delivery — DPP1')}
      <div class="kpi-grid">
        ${kpiCard('Gigs verified',          m.gigsVerified,  t.gigs,  '#387f6a', 'of 6,000 minimum', 'ON_TRACK')}
        ${kpiCard('Gigs completed',         m.gigsCompleted, null,    '#9B8FAA', pct(m.gigsCompleted, m.gigsActivated) + '% completion')}
        ${kpiCard('Green-linked gigs',      m.gigsGreen,     null,    '#387f6a', 'SDG 13/15 tagged')}
        ${kpiCard('Youth earning via gigs', m.youthEarning,  140,     '#41204b', 'Cohorts 1+2', 'COMPLETE')}
        ${kpiCard('Avg earnings / youth',   m.avgEarnings,   null,    '#fe4d57', 'Target ~R5,000/month')}
      </div>

      ${secHead('Claims & payments')}
      <div class="kpi-grid">
        ${kpiCard('Claims submitted',  m.claimsSubmitted, null, '#9B8FAA', 'All partners')}
        ${kpiCard('Claims approved',   m.claimsApproved,  null, '#387f6a', pct(m.claimsApproved, m.claimsSubmitted) + '% approval rate')}
        ${kpiCard('Payments made',     m.paymentsMade,    null, '#4cade9', '90% of approved')}
        ${kpiCard('Entrepreneurs M1',  m.entM1, t.entM1,       '#F9AB3E', 'milestone 1', 'AT_RISK')}
        ${kpiCard('Entrepreneurs M2',  m.entM2, t.entM2,       '#fe4d57', 'milestone 2', 'DELAYED')}
      </div>

      ${secHead('Livelihoods & placements')}
      <div class="kpi-grid">
        ${kpiCard('Launch Lab enrolled',       m.launchLabEnrolled,  250,          '#F9AB3E', 'of 250 recommended', 'AT_RISK')}
        ${kpiCard('Solutions engineers (SEs)', m.solutionsEngineers, t.placements, '#41204b', 'toward 300 target',  'ON_TRACK')}
        ${kpiCard('In placement pathway',      m.launchLabPlacements,null,         '#9B8FAA', 'Employment/income')}
        ${kpiCard('Sustained 3-month',         m.sustained3m,        null,         '#F9AB3E', 'Follow-up confirmed')}
        ${kpiCard('Sustained 6-month',         m.sustained6m,        t.placements, '#fe4d57', 'of 300 contract target', 'DELAYED')}
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

  function renderFunder(funderId) {
    const f = FUNDERS[funderId];
    if (!f) return '<p>Funder not found.</p>';

    const msStatusClass = { complete: 'complete', 'in-progress': 'at-risk', upcoming: 'delayed' };
    const msStatusLabel = { complete: 'Complete', 'in-progress': 'In progress', upcoming: 'Upcoming' };
    const msDotColor    = { complete: '#16A34A',  'in-progress': '#D97706',     upcoming: '#D1D5DB'  };

    const allocRows = f.allocation.map(a => `
      <div class="alloc-row">
        <div class="alloc-label">${a.label}</div>
        <div class="alloc-right">
          <div class="alloc-bar-wrap">
            <div class="alloc-bar-fill" style="width:${a.pct}%;background:${f.color}"></div>
          </div>
          <span class="alloc-pct" style="color:${f.color}">${a.pct}%</span>
          <span class="alloc-amount">${a.amount}</span>
        </div>
      </div>`).join('');

    const msRows = f.milestones.map(m => `
      <div class="ms-row">
        <div class="ms-dot" style="background:${msDotColor[m.status]}"></div>
        <div class="ms-label">${m.label}</div>
        <div class="ms-due">${m.due}</div>
        <span class="badge badge-${msStatusClass[m.status]}">${msStatusLabel[m.status]}</span>
      </div>`).join('');

    const kpiCards = f.kpis.map(k =>
      kpiCard(k.label, k.value, k.target, k.color, k.sub, k.status)
    ).join('');

    const funnelHtml = f.funnel ? `
      ${secHead('Digital marketplace funnel')}
      <div class="funnel-card">
        ${f.funnel.map((s, i) => {
          const p = pct(s.value, s.target);
          const width = Math.max(15, Math.round((s.target / f.funnel[0].target) * 100));
          return `
          <div class="funnel-row">
            <div class="funnel-step" style="background:${f.color}">${i + 1}</div>
            <div class="funnel-label">${s.label}</div>
            <div class="funnel-bar-wrap" style="max-width:${width}%">
              <div class="funnel-bar-fill" style="width:${p}%;background:${f.color}"></div>
            </div>
            <div class="funnel-nums">
              <span class="funnel-value" style="color:${f.color}">${s.value.toLocaleString()}</span>
              <span class="funnel-target">/ ${s.target.toLocaleString()}</span>
              <span class="funnel-pct" style="color:${f.color}">${p}%</span>
            </div>
          </div>`;
        }).join('')}
      </div>` : '';

    return `
      <div class="funder-header" style="--funder-color:${f.color};--funder-light:${f.colorLight};--funder-border:${f.colorBorder}">
        <div class="funder-header-top">
          <div class="funder-logo-chip" style="background:${f.color}">${f.name[0]}</div>
          <div class="funder-title-block">
            <div class="funder-name">${f.fullName}</div>
            <div class="funder-mandate">${f.mandate}</div>
          </div>
          <div class="funder-contrib-box" style="border-color:${f.colorBorder};background:${f.colorLight}">
            <div class="funder-contrib-label">Total contribution</div>
            <div class="funder-contrib-value" style="color:${f.color}">${f.contribution}</div>
            <div class="funder-contrib-period">${f.period}</div>
          </div>
        </div>
        <div class="funder-focus-tags">
          ${f.focus.map(tag => `
            <span class="focus-tag" style="background:${f.colorLight};color:${f.color};border-color:${f.colorBorder}">${tag}</span>
          `).join('')}
        </div>
      </div>

      <div class="funder-narrative">${f.narrative}</div>

      ${secHead('Key performance indicators')}
      <div class="kpi-grid">${kpiCards}</div>

      ${funnelHtml}

      ${secHead('Funding allocation')}
      <div class="alloc-card">${allocRows}</div>

      ${secHead('Milestone tracker')}
      <div class="ms-card">${msRows}</div>`;
  }

  function renderPlatformAnalytics() {
    const a = MOCK.yomaAnalytics;
    const fmtGrowth = g => `<span class="growth-up">↑ ${g % 1 === 0 ? g : g.toFixed(2)}%</span>`;
    const sharePct  = (v, t) => Math.round(v / t * 100);

    const channelRows = a.byChannel.map(c => {
      const share = sharePct(c.users, a.newUsers);
      return `<tr>
        <td class="bold">${c.channel}</td>
        <td style="font-family:monospace;font-weight:700;color:var(--text-pri)">${c.users.toLocaleString()}</td>
        <td>${fmtGrowth(c.growth)}</td>
        <td><div class="mini-bar-wrap">
          <div class="mini-bar"><div class="mini-fill" style="width:${share}%;background:#7C3AED"></div></div>
          <span style="font-size:11px;color:#7C3AED;font-weight:700">${share}%</span>
        </div></td>
      </tr>`;
    }).join('');

    const countryRows = a.byCountry.map(c => {
      const share = sharePct(c.users, a.activeUsers);
      const col   = c.programme ? '#D04A02' : '#0891B2';
      const tag   = c.programme ? `<span class="badge badge-on-track" style="font-size:9px;padding:2px 6px;margin-left:6px">Programme focus</span>` : '';
      return `<tr>
        <td class="bold">${c.flag}&nbsp; ${c.country}${tag}</td>
        <td style="font-family:monospace;font-weight:700;color:var(--text-pri)">${c.users.toLocaleString()}</td>
        <td>${fmtGrowth(c.growth)}</td>
        <td><div class="mini-bar-wrap">
          <div class="mini-bar"><div class="mini-fill" style="width:${share}%;background:${col}"></div></div>
          <span style="font-size:11px;color:${col};font-weight:700">${share}%</span>
        </div></td>
      </tr>`;
    }).join('');

    const cityRows = a.byCity.map(c => `
      <tr>
        <td class="bold">${c.city}</td>
        <td style="font-family:monospace;font-weight:700;color:var(--text-pri)">${c.users.toLocaleString()}</td>
        <td>${fmtGrowth(c.growth)}</td>
      </tr>`).join('');

    return `
      <div class="analytics-period">
        <span class="analytics-period-label">Reporting period</span>
        <span class="analytics-period-value">${a.period}</span>
        <span class="analytics-period-vs">${a.vsPeriod}</span>
      </div>

      ${secHead('User geography')}
      <div id="geo-map-container" class="geo-map-container"></div>

      ${secHead('Platform overview')}
      <div class="kpi-grid">
        <div class="kpi">
          <div class="kpi-label">Active users</div>
          <div class="kpi-value" style="color:#0891B2">${(a.activeUsers / 1000).toFixed(0)}K</div>
          <div class="kpi-meta"><span>all platforms</span>${fmtGrowth(a.activeUsersGrowth)}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">New users</div>
          <div class="kpi-value" style="color:#7C3AED">${(a.newUsers / 1000).toFixed(0)}K</div>
          <div class="kpi-meta"><span>all platforms</span>${fmtGrowth(a.newUsersGrowth)}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Avg engagement time</div>
          <div class="kpi-value" style="color:#16A34A;font-size:18px">${a.avgEngagementTime}</div>
          <div class="kpi-meta"><span>per session</span>${fmtGrowth(a.avgEngagementGrowth)}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">South Africa users</div>
          <div class="kpi-value" style="color:#D04A02">${a.byCountry.find(c => c.programme).users.toLocaleString()}</div>
          <div class="kpi-meta"><span>programme focus market</span>${fmtGrowth(a.byCountry.find(c => c.programme).growth)}</div>
        </div>
      </div>

      ${secHead('New users by acquisition channel')}
      <table class="data-table">
        <thead><tr><th>Channel</th><th>New users</th><th>vs prev period</th><th>Share</th></tr></thead>
        <tbody>${channelRows}</tbody>
      </table>

      ${secHead('Active users by country')}
      <table class="data-table">
        <thead><tr><th>Country</th><th>Active users</th><th>vs prev period</th><th>Share</th></tr></thead>
        <tbody>${countryRows}</tbody>
      </table>

      ${secHead('Top cities')}
      <table class="data-table">
        <thead><tr><th>City</th><th>Active users</th><th>vs prev period</th></tr></thead>
        <tbody>${cityRows}</tbody>
      </table>`;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function renderNav() {
    const views = [
      { id: 'contract', label: 'Yoma Impacts Economy' },
      { id: 'funders',  label: 'Funders' },
      { id: 'orgs',     label: 'Organisations' },
    ];
    return `
      <nav class="view-nav" role="navigation" aria-label="Dashboard views">
        ${views.map(v => `
          <button class="vnav-btn ${_activeView === v.id ? 'active' : ''}"
            data-action="view" data-id="${v.id}">${v.label}</button>
        `).join('')}
      </nav>`;
  }

  function renderSubNav(view) {
    const subs = {
      contract: [
        { id: 'overview',   label: 'Executive overview'   },
        { id: 'trajectory', label: 'Target trajectory'    },
        { id: 'analytics',  label: 'Platform analytics'   },
      ],
      funders: [
        { id: 'pwc',       label: 'PwC'       },
        { id: 'canada',    label: 'Canada'    },
        { id: 'capgemini', label: 'Capgemini' },
      ],
      orgs: [
        { id: 'dpp1', label: 'DPP1 partners' },
        { id: 'dpp2', label: 'DPP2 pipeline' },
      ],
    };
    const tabs = subs[view] || [];
    const cur  = _activeSub[view] || tabs[0]?.id;
    return `
      <div class="sub-nav" role="tablist">
        ${tabs.map(t => `
          <button class="stab ${cur === t.id ? 'active' : ''}"
            role="tab" aria-selected="${cur === t.id}"
            data-action="sub" data-view="${view}" data-id="${t.id}">${t.label}</button>
        `).join('')}
      </div>`;
  }

  // ── Full render ───────────────────────────────────────────────────────────

  function render() {
    const m   = MOCK.metrics;
    const t   = MOCK.targets;
    const cur = _activeSub[_activeView] || 'overview';

    let bodyHtml = '';
    if (_activeView === 'contract') {
      if (cur === 'overview')   bodyHtml = renderOverview(m, t);
      if (cur === 'trajectory') bodyHtml = renderTrajectory(MOCK);
      if (cur === 'analytics')  { bodyHtml = renderPlatformAnalytics(); }
    } else if (_activeView === 'funders') {
      bodyHtml = renderFunder(cur);
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
        const statusClass = { confirmed: 'on-track', onboarding: 'at-risk' };
        const statusLabel = { confirmed: 'Confirmed Q3', onboarding: 'Onboarding' };
        bodyHtml = `
          ${secHead('DPP2 design partners — Q3 2026 expansion')}
          <table class="data-table">
            <thead><tr><th>Partner</th><th>Focus area</th><th>Youth target</th><th>Quarter</th><th>Status</th></tr></thead>
            <tbody>${MOCK.dpp2.map(p => `
              <tr>
                <td class="bold">${p.name}</td>
                <td>${p.focus}</td>
                <td style="font-family:monospace;font-weight:700;color:${p.target ? '#41204b' : '#9B8FAA'}">${p.target ? p.target.toLocaleString() : '—'}</td>
                <td style="font-size:11px;color:var(--text-sec)">${p.quarter}</td>
                <td><span class="badge badge-${statusClass[p.status]}">${statusLabel[p.status]}</span></td>
              </tr>
              <tr><td colspan="5" style="font-size:11px;color:var(--text-sec);padding:4px 13px 10px;border-bottom:1px solid var(--border)">${p.note}</td></tr>
            `).join('')}
            </tbody>
          </table>
          <div class="gap-callout">
            <div class="gap-title">DPP2 total indicative youth target: 1,000+ (Q3 2026)</div>
            HOT confirmed with 1,000 youth target. Remaining partners (Kruger 2 Canyons, GroundTruth, Amandla, Giga) are finalising delivery agreements — targets to be confirmed by July 2026.
          </div>`;
      }
    }

    const contextLabel = _portalContext
      ? `Entity: ${_portalContext.entityDid || 'connected'}`
      : 'Standalone mode';

    if (window.GeoMap) window.GeoMap.destroy();

    document.getElementById('app-root').innerHTML = `
      <div class="dashboard">
        <header class="dash-header">
          <div class="dash-wordmark">
            <div class="dash-logo">
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Yoma "o" logo mark: circle + coral arc + green dot -->
                <circle cx="19" cy="22" r="13" stroke="#41204b" stroke-width="4.5" fill="none"/>
                <path d="M 8.5 28 A 13 13 0 0 1 19 9" stroke="#fe4d57" stroke-width="4.5" stroke-linecap="round" fill="none"/>
                <circle cx="13" cy="5.5" r="3.5" fill="#387f6a"/>
              </svg>
            </div>
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

    // Init geo map after DOM is updated
    if (_activeView === 'contract' && cur === 'analytics') {
      requestAnimationFrame(() => window.GeoMap && window.GeoMap.init('geo-map-container'));
    }
  }

  // ── Portal event wiring ───────────────────────────────────────────────────

  window.addEventListener('portal:init', function (e) {
    _portalContext = e.detail;
    render();
  });

  window.addEventListener('portal:contextUpdate', function (e) {
    _portalContext = Object.assign(_portalContext || {}, e.detail);
    render();
  });

  // ── Delegated click handler (CSP-safe — no inline onclick attributes) ────

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;

    if (action === 'view') {
      const viewId = btn.dataset.id;
      _activeView = viewId;
      if (!_activeSub[viewId]) {
        _activeSub[viewId] = viewId === 'contract' ? 'overview'
                           : viewId === 'funders'  ? 'pwc'
                           : 'dpp1';
      }
      render();
    }

    if (action === 'sub') {
      _activeSub[btn.dataset.view] = btn.dataset.id;
      render();
    }
  });

  // ── Public interface (kept for portal bridge / external use) ─────────────

  window.__app = {
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
