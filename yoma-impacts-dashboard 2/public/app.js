/**
 * app.js
 * Yoma Impacts Dashboard — application logic.
 *
 * Data source: confirmed actuals as of May 2026
 * Waits for portal:init before rendering; falls back to standalone after 1.2s.
 * All privileged actions go through window.IxoPortalBridge.requestAction().
 */

(function () {
  'use strict';

  const BLOCKSYNC_URL        = 'https://blocksync-graphql.ixo.earth/graphql';
  const STANDALONE_TIMEOUT_MS = 1200;

  let _portalContext = null;
  let _standalone    = false;
  let _activeView    = 'overview';
  let _activeSub     = {};

  // ─────────────────────────────────────────────
  // DATA  — confirmed actuals May 2026
  // ─────────────────────────────────────────────
  const D = {

    meta: {
      contract:     '43450556',
      period:       'Up to May 2026',
      phase:        'Foundation & activation complete — scale delivery from June/July 2026',
      reportedBy:   'IXO World AG',
      reportedFor:  'UNICEF-SA / PwC / Capgemini / Canada',
    },

    targets: {
      youthRecruited:      16600,
      awareness:           13000,
      gigs:                6000,
      placements:          300,
      entM1:               67,
      entM2:               84,
    },

    metrics: {
      // ── Youth engagement ──────────────────────────────────────────────────
      // Campaign launches next month; update once measurable
      youthReached:   0,
      youthOnboarded: 0,
      youthActive:    0,
      // 14 Solutioneers; broader YoID count pending
      digitalIds:     14,
      credentials:    0,

      // ── Contract targets & pipeline ───────────────────────────────────────
      pipelineYouthQ2:           5000,
      youthAwarenessTarget:      13000,
      youthOnboardingTarget:     16600,
      verifiedTaskTarget:        6000,
      sustainedEmploymentTarget: 300,

      // ── Design Programme ──────────────────────────────────────────────────
      designProgrammeProgressPct: 50,
      activeDesignPartners:       6,
      dpp1Active:                 true,
      dpp2Planned:                true,
      dpp2StartDate:              'July 2026',

      // ── Umuzi paid impact gigs & livelihoods ──────────────────────────────
      umuziPaidImpactDeedsPlanned:                     2800,
      umuziDeliveryPeriod:                             'Next quarter',
      umuziEmploymentPathwayActive:                    true,
      umuziSustainedJobStandardMonths:                 6,
      umuziProjectedContributionToVerifiedTasksPct:    46.7,

      // ── Solutioneers ──────────────────────────────────────────────────────
      solutionsEngineers:              14,
      solutioneerProgrammeProgressPct: 50,
      solutioneerClaimsSubmitted:      195,
      solutioneerClaimsApproved:       194,
      solutioneerClaimsPending:        1,
      solutioneerClaimApprovalRatePct: 99.5,
      solutioneerExpectedClaimsTotal:  1022,
      solutioneerPhase1MappedClaims:   518,
      solutioneerPhase2ProjectedClaims:504,
      solutioneerUnblocks:             24,

      // ── Solutioneer payouts ───────────────────────────────────────────────
      firstPayoutRecipients:  5,
      payoutPerYouthZAR:      7833.33,
      totalFirstPayoutZAR:    39166.65,
      firstPayoutStatus:      'Expected this month',

      // ── Sustained pathways ────────────────────────────────────────────────
      youthInSixMonthTrainingEmploymentPathways:  40,
      potentialSustainedEmploymentContribution:   40,

      // ── BeGreen ───────────────────────────────────────────────────────────
      begreenInitialFunnel:             1000,
      begreenFinalEntrepreneurs:        100,
      begreenBusinessIdsCompleted:      90,
      begreenBusinessIdsPending:        10,
      begreenBusinessIdCompletionPct:   90,
      begreenInPersonVerificationsUnderway: true,
      begreenSeedTranchePerEntrepreneurUSD: 2500,
      begreenPotentialFirstTrancheTotalUSD: 250000,

      // ── DUCT ─────────────────────────────────────────────────────────────
      ductStatus:                       'Preparing for go-live',
      ductGoLiveTiming:                 'Next month',
      ductWaterQualityWorkflowConfigured: true,
      ductWaterQualityClaimsSubmitted:  0,
      ductWaterQualityClaimsVerified:   0,

      // ── GroundTruth ───────────────────────────────────────────────────────
      groundTruthStatus:                        'Active',
      groundTruthWaterCreditMethodologyStatus:  'In development',
      groundTruthWRCPartnershipActive:          true,
      groundTruthLaunchThroughYIE:              true,
      groundTruthWaterCreditsCreatedOnChain:    0,
      groundTruthYouthDataCollectorPayoutsStatus: 'Planned',

      // ── Platform & governance ─────────────────────────────────────────────
      mobileClaimsInterfaceConfigured:  true,
      mobileClaimsUrl:                  'jambo.impacts.exchange',
      decentralizedIdentityConfigured:  true,
      kycKybConfigured:                 true,
      realTimeDashboardStatus:          'Work in progress',
      impactCertificateAnnexPlanned:    true,
      yomaVentureCooperativeRegistered: true,
      digitalPublicGoodsGovernanceStatus: 'Registered / operationalising',
    },

    trajectory: {
      youthOnboarding: [
        { q: 'Q1', inc: 0,    cum: 0,     note: 'Infrastructure & readiness' },
        { q: 'Q2', inc: 5000, cum: 5000,  note: 'DPP1 activation — pipeline open' },
        { q: 'Q3', inc: 7500, cum: 12500, note: 'DPP1 + DPP2 scale delivery' },
        { q: 'Q4', inc: 4100, cum: 16600, note: 'Full target achieved' },
      ],
      verifiedTasks: [
        { q: 'Q1', inc: 0,    cum: 0,    note: 'No verified output yet' },
        { q: 'Q2', inc: 400,  cum: 400,  note: 'First outputs late Q2 (~400)' },
        { q: 'Q3', inc: 3500, cum: 3900, note: 'Scale delivery — Umuzi 2,800 + others' },
        { q: 'Q4', inc: 2100, cum: 6000, note: 'Full target achieved' },
      ],
      sustainedEmployment: [
        { q: 'Q1–Q2', inc: 0,   cum: 0,   note: 'Readiness phase — no placements yet' },
        { q: 'Q3',    inc: 150, cum: 150, note: 'First placement cohort confirmed' },
        { q: 'Q4',    inc: 150, cum: 300, note: 'Full target achieved' },
      ],
    },

    partners: {
      dpp1: [
        {
          name: 'Hoedspruit Hub / PYEI',
          focus:  'Functional Numeracy',
          range:  '3,000–5,000',
          status: 'ACTIVE',
          note:   'Largest pipeline contributor Q2–Q3',
        },
        {
          name: 'DUCT',
          focus:  'Environmental Monitoring — Water Quality',
          range:  '800–1,200',
          status: 'PREPARING',
          note:   'Workflow configured; go-live next month',
        },
        {
          name: 'Umuzi',
          focus:  'Digital Livelihoods (MSRC) — 2,800 paid gigs planned next quarter',
          range:  '200–400',
          status: 'ACTIVE',
          note:   '46.7% of verified task target; 6-month employment pathway active',
        },
        {
          name: 'Green Pill Cape Town',
          focus:  'Circular Economy / Web3',
          range:  '50–150',
          status: 'ACTIVE',
          note:   '',
        },
        {
          name: 'Shonaquip',
          focus:  'Assistive Technology',
          range:  '50–150',
          status: 'ACTIVE',
          note:   '',
        },
        {
          name: 'GroundTruth',
          focus:  'Water Credit Methodology + Youth Data Collectors',
          range:  'TBC',
          status: 'ACTIVE',
          note:   'WRC partnership active; water credits on-chain planned; youth payouts planned',
        },
      ],
      dpp2: [
        { name: 'Kruger 2 Canyons Biosphere', focus: 'Conservation & biodiversity monitoring',      notes: 'MiniSASS & citizen science alignment' },
        { name: 'Amandla Safe Hubs',           focus: 'Youth safe spaces & social cohesion',          notes: 'Placement & psychosocial pathway' },
        { name: 'Giga',                         focus: 'School connectivity & digital infrastructure', notes: 'Digital skills & infrastructure gigs' },
      ],
    },
  };

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────
  const fmtN  = n => typeof n === 'number' && n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
  const fmtZAR = n => 'R' + Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const fmtUSD = n => '$' + Number(n).toLocaleString('en-US');
  const pct   = (v, t) => t ? Math.min(100, Math.round(v / t * 100)) : 0;

  const COLORS = {
    purple: '#7C3AED', purpleMid: '#A855F7',
    green:  '#16A34A', teal: '#0891B2',
    amber:  '#D97706', red:  '#DC2626',
    orange: '#EA580C', grey: '#6B7280',
  };

  const STATUS_LABEL = { ON_TRACK:'On track', AT_RISK:'At risk', DELAYED:'Delayed', COMPLETE:'Complete', ACTIVE:'Active', PREPARING:'Preparing' };

  function badge(s) {
    const cls = { ON_TRACK:'on-track', AT_RISK:'at-risk', DELAYED:'delayed', COMPLETE:'complete', ACTIVE:'on-track', PREPARING:'at-risk' }[s] || 'pending';
    return `<span class="badge badge-${cls}">${STATUS_LABEL[s] || s}</span>`;
  }

  function chip(label, type) {
    // type: ok | warn | info | muted
    const cls = { ok:'chip-ok', warn:'chip-warn', info:'chip-info', muted:'chip-muted' }[type] || 'chip-muted';
    return `<span class="chip ${cls}">${label}</span>`;
  }

  function kpi(label, value, opts) {
    // opts: { target, color, sub, status, format }
    const o     = opts || {};
    const color = o.color || COLORS.purple;
    const fmt   = o.format === 'ZAR' ? fmtZAR : o.format === 'USD' ? fmtUSD : fmtN;
    const disp  = fmt(value);
    const tDisp = o.target ? `<span class="kpi-target">/ ${fmtN(o.target)}</span>` : '';
    const p     = o.target ? pct(value, o.target) : null;
    const bar   = p !== null ? `<div class="kpi-bar"><div class="kpi-fill" style="width:${p}%;background:${color}"></div></div>` : '';
    const meta  = `<div class="kpi-meta"><span>${o.sub || ''}</span>${p !== null ? `<span style="color:${color};font-weight:700">${p}%</span>` : ''}</div>`;
    const bdg   = o.status ? badge(o.status) : '';
    return `<div class="kpi">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value" style="color:${color}">${disp}${tDisp}</div>
      ${bar}${meta}${bdg}
    </div>`;
  }

  function kpiGrid(cards) {
    return `<div class="kpi-grid">${cards.join('')}</div>`;
  }

  function secHead(label) {
    return `<div class="sec-head"><span>${label}</span></div>`;
  }

  function infoBox(html) {
    return `<div class="info-box">${html}</div>`;
  }

  function alertBox(html, type) {
    return `<div class="alert ${type || 'amber'}"><span class="alert-icon">⚠</span><div>${html}</div></div>`;
  }

  function table(heads, rows) {
    return `<div class="table-wrap"><table class="data-table">
      <thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table></div>`;
  }

  function tr(...cells) {
    return `<tr>${cells.map((c, i) => `<td class="${i === 0 ? 'bold' : ''}">${c}</td>`).join('')}</tr>`;
  }

  function trajTable(rows, target) {
    return table(
      ['Period', 'Increment', 'Cumulative', 'Progress', 'Note'],
      rows.map(r => {
        const p   = pct(r.cum, target);
        const col = r.cum === 0 ? COLORS.grey : r.cum >= target ? COLORS.green : COLORS.purple;
        const bar = `<div class="mini-bar-wrap"><div class="mini-bar"><div class="mini-fill" style="width:${p}%;background:${col}"></div></div><span style="color:${col};font-size:11px;font-weight:700">${p}%</span></div>`;
        return tr(
          r.q,
          r.inc ? '+' + r.inc.toLocaleString() : '—',
          `<span style="color:${col};font-weight:700">${r.cum.toLocaleString()}</span>`,
          bar,
          `<span class="muted">${r.note}</span>`
        );
      })
    );
  }

  function statRow(label, value, chipType) {
    const val = typeof value === 'boolean'
      ? (value ? chip('Yes', 'ok') : chip('No', 'muted'))
      : `<strong>${value}</strong>`;
    return `<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-val">${val}</span></div>`;
  }

  function statCard(title, rows) {
    return `<div class="stat-card"><div class="stat-card-title">${title}</div>${rows.join('')}</div>`;
  }

  // ─────────────────────────────────────────────
  // VIEWS
  // ─────────────────────────────────────────────

  function viewOverview() {
    const m = D.metrics; const t = D.targets;
    return `
      ${alertBox(`<strong>Q1–Q2 2026: Readiness & activation phase.</strong>
        DPP1 activated April 2026. First verified outputs expected late Q2.
        Scale delivery begins Q3 with DPP1 + DPP2 (July 2026).`)}

      ${secHead('Programme readiness')}
      ${kpiGrid([
        kpi('Active design partners',    m.activeDesignPartners,   { color: COLORS.purple, sub: 'DPP1 live', status: 'ON_TRACK' }),
        kpi('Design programme progress', m.designProgrammeProgressPct, { color: COLORS.purple, sub: '% completion', format: 'raw' }),
        kpi('Solutioneers onboarded',    m.solutionsEngineers,     { target: t.placements, color: COLORS.teal, sub: 'toward 300 target', status: 'ON_TRACK' }),
        kpi('Youth in 6-month pathways', m.youthInSixMonthTrainingEmploymentPathways, { color: COLORS.orange, sub: 'Training + employment', status: 'ON_TRACK' }),
        kpi('Pipeline Q2 (youth)',       m.pipelineYouthQ2,        { target: t.youthRecruited, color: COLORS.grey, sub: 'activating now', status: 'AT_RISK' }),
      ])}

      ${secHead('Solutioneer claims — confirmed actuals')}
      ${kpiGrid([
        kpi('Claims submitted',     m.solutioneerClaimsSubmitted,   { color: COLORS.purple, sub: 'Solutioneers' }),
        kpi('Claims approved',      m.solutioneerClaimsApproved,    { color: COLORS.green,  sub: m.solutioneerClaimApprovalRatePct + '% approval rate', status: 'ON_TRACK' }),
        kpi('Claims pending',       m.solutioneerClaimsPending,     { color: COLORS.amber,  sub: 'Awaiting review' }),
        kpi('Expected total claims',m.solutioneerExpectedClaimsTotal,{ color: COLORS.grey,   sub: 'Phase 1 + Phase 2' }),
        kpi('Unblocks recorded',    m.solutioneerUnblocks,          { color: COLORS.teal,   sub: 'Documented resolution events' }),
      ])}

      ${secHead('First payout — Solutioneers')}
      ${kpiGrid([
        kpi('Payout recipients',    m.firstPayoutRecipients,  { color: COLORS.green, sub: 'First cohort', status: 'AT_RISK' }),
        kpi('Amount per youth',     m.payoutPerYouthZAR,      { color: COLORS.orange, sub: 'ZAR', format: 'ZAR' }),
        kpi('Total first payout',   m.totalFirstPayoutZAR,    { color: COLORS.orange, sub: m.firstPayoutStatus, format: 'ZAR' }),
      ])}

      ${secHead('BeGreen entrepreneur verification')}
      ${kpiGrid([
        kpi('Initial funnel',              m.begreenInitialFunnel,          { color: COLORS.grey,   sub: 'Applicants' }),
        kpi('Final entrepreneurs',         m.begreenFinalEntrepreneurs,     { color: COLORS.purple, sub: 'Selected for seed funding' }),
        kpi('Business IDs completed',      m.begreenBusinessIdsCompleted,   { color: COLORS.green,  sub: m.begreenBusinessIdCompletionPct + '% complete', status: 'ON_TRACK' }),
        kpi('Business IDs pending',        m.begreenBusinessIdsPending,     { color: COLORS.amber,  sub: 'In progress' }),
        kpi('Potential first tranche (USD)',m.begreenPotentialFirstTrancheTotalUSD, { color: COLORS.teal, format: 'USD', sub: '$2,500 per entrepreneur' }),
      ])}

      ${secHead('Platform & identity')}
      ${kpiGrid([
        kpi('Digital IDs issued',        m.digitalIds,                     { color: COLORS.green, sub: 'YoID / YOMA compatible', status: 'COMPLETE' }),
        kpi('Mobile claims configured',  m.mobileClaimsInterfaceConfigured ? 1 : 0, { color: COLORS.green, sub: 'jambo.impacts.exchange', status: 'COMPLETE' }),
        kpi('KYC / KYB configured',      m.kycKybConfigured ? 1 : 0,       { color: COLORS.green, sub: 'Identity verification live', status: 'COMPLETE' }),
        kpi('Venture Co-op registered',  m.yomaVentureCooperativeRegistered ? 1 : 0, { color: COLORS.teal, sub: 'Liechtenstein LVC', status: 'COMPLETE' }),
      ])}`;
  }

  function viewTrajectory() {
    const m = D.metrics;
    return `
      ${infoBox(`<strong>Interim Delivery Readiness & Pipeline Report — Contract 43450556 · April 2026</strong><br>
        Q1–Q2 weighted toward activation. Scale delivery in Q3–Q4.
        Umuzi contributes ~${m.umuziProjectedContributionToVerifiedTasksPct}% of verified task target (${m.umuziPaidImpactDeedsPlanned.toLocaleString()} paid gigs planned ${m.umuziDeliveryPeriod.toLowerCase()}).`)}

      ${secHead('Youth onboarding — target 16,600')}
      ${trajTable(D.trajectory.youthOnboarding, D.targets.youthRecruited)}

      ${secHead('Verified impact tasks — target 6,000')}
      ${trajTable(D.trajectory.verifiedTasks, D.targets.gigs)}

      ${secHead('Sustained employment — target 300')}
      ${trajTable(D.trajectory.sustainedEmployment, D.targets.placements)}

      <div class="gap-callout">
        <div class="gap-title">⚠ DPP2 — July 2026 (critical path)</div>
        <div>DPP2 cohort planned for July 2026 is a critical dependency for reaching the 16,600 and 6,000 targets.
        Partners include Kruger 2 Canyons Biosphere, Amandla Safe Hubs, and Giga.
        Estimates confirmed following onboarding and workflow configuration.</div>
      </div>`;
  }

  function viewSolutioneers() {
    const m = D.metrics;
    return `
      ${secHead('Solutioneer programme — current status')}
      <div class="two-col">
        ${statCard('Programme progress', [
          statRow('Solutioneers onboarded',    m.solutionsEngineers),
          statRow('Programme progress',        m.solutioneerProgrammeProgressPct + '%'),
          statRow('Phase 1 mapped claims',     m.solutioneerPhase1MappedClaims.toLocaleString()),
          statRow('Phase 2 projected claims',  m.solutioneerPhase2ProjectedClaims.toLocaleString()),
          statRow('Expected claims total',     m.solutioneerExpectedClaimsTotal.toLocaleString()),
          statRow('Unblocks documented',       m.solutioneerUnblocks),
        ])}
        ${statCard('Claims pipeline', [
          statRow('Claims submitted',   m.solutioneerClaimsSubmitted),
          statRow('Claims approved',    m.solutioneerClaimsApproved),
          statRow('Claims pending',     m.solutioneerClaimsPending),
          statRow('Approval rate',      m.solutioneerClaimApprovalRatePct + '%'),
        ])}
      </div>

      ${secHead('First payout cohort')}
      <div class="two-col">
        ${statCard('Payout details', [
          statRow('Recipients',         m.firstPayoutRecipients),
          statRow('Amount per youth',   fmtZAR(m.payoutPerYouthZAR)),
          statRow('Total first payout', fmtZAR(m.totalFirstPayoutZAR)),
          statRow('Status',             m.firstPayoutStatus),
        ])}
        ${statCard('Sustained pathways', [
          statRow('Youth in 6-month training/employment pathways', m.youthInSixMonthTrainingEmploymentPathways),
          statRow('Potential sustained employment contribution',    m.potentialSustainedEmploymentContribution),
          statRow('Sustained job standard (months)',                m.umuziSustainedJobStandardMonths),
        ])}
      </div>`;
  }

  function viewUmuzi() {
    const m = D.metrics;
    return `
      ${infoBox(`<strong>Umuzi — Managed Service Resource Centre (MSRC)</strong><br>
        ${m.umuziPaidImpactDeedsPlanned.toLocaleString()} paid impact gigs planned for ${m.umuziDeliveryPeriod.toLowerCase()}.
        Projected contribution: <strong>${m.umuziProjectedContributionToVerifiedTasksPct}%</strong> of the 6,000 verified task target.`)}

      ${secHead('Umuzi delivery status')}
      <div class="two-col">
        ${statCard('Gig pipeline', [
          statRow('Paid impact gigs planned',       m.umuziPaidImpactDeedsPlanned.toLocaleString()),
          statRow('Delivery period',                m.umuziDeliveryPeriod),
          statRow('% of verified task target',      m.umuziProjectedContributionToVerifiedTasksPct + '%'),
          statRow('Employment pathway active',      m.umuziEmploymentPathwayActive),
        ])}
        ${statCard('Livelihood standard', [
          statRow('Sustained job definition (months)', m.umuziSustainedJobStandardMonths),
          statRow('Youth in 6-month pathways',         m.youthInSixMonthTrainingEmploymentPathways),
          statRow('Potential sustained contribution',  m.potentialSustainedEmploymentContribution),
        ])}
      </div>`;
  }

  function viewBeGreen() {
    const m = D.metrics;
    return `
      ${secHead('BeGreen entrepreneur verification pipeline')}
      ${kpiGrid([
        kpi('Initial funnel',          m.begreenInitialFunnel,         { color: COLORS.grey,   sub: 'Total applicants' }),
        kpi('Final entrepreneurs',     m.begreenFinalEntrepreneurs,    { color: COLORS.purple, sub: 'Selected' }),
        kpi('Business IDs completed',  m.begreenBusinessIdsCompleted,  { color: COLORS.green,  sub: m.begreenBusinessIdCompletionPct + '% done', status: 'ON_TRACK' }),
        kpi('Business IDs pending',    m.begreenBusinessIdsPending,    { color: COLORS.amber,  sub: 'In progress' }),
        kpi('Seed tranche / entrepreneur', m.begreenSeedTranchePerEntrepreneurUSD, { color: COLORS.teal, format: 'USD', sub: 'Per entrepreneur' }),
        kpi('Potential first tranche total', m.begreenPotentialFirstTrancheTotalUSD, { color: COLORS.teal, format: 'USD', sub: 'If all verified' }),
      ])}

      ${secHead('Verification status')}
      <div class="two-col">
        ${statCard('Current status', [
          statRow('In-person verifications underway', m.begreenInPersonVerificationsUnderway),
          statRow('Business ID completion',           m.begreenBusinessIdCompletionPct + '%'),
          statRow('Pending IDs',                      m.begreenBusinessIdsPending),
        ])}
        ${statCard('Financing pipeline', [
          statRow('Seed tranche per entrepreneur',     fmtUSD(m.begreenSeedTranchePerEntrepreneurUSD)),
          statRow('Potential first tranche total',     fmtUSD(m.begreenPotentialFirstTrancheTotalUSD)),
          statRow('Trigger',                           'Successful business ID verification'),
        ])}
      </div>`;
  }

  function viewPartners() {
    const m = D.metrics;

    const partnerRows = D.partners.dpp1.map(p => {
      const statusMap = { ACTIVE: 'ON_TRACK', PREPARING: 'AT_RISK' };
      return tr(p.name, p.focus, p.range, badge(statusMap[p.status] || 'AT_RISK'), p.note || '—');
    });

    const dpp2Rows = D.partners.dpp2.map(p =>
      tr(p.name, p.focus, `<span class="muted">${p.notes}</span>`, badge('AT_RISK'))
    );

    return `
      ${secHead('DPP1 — Active partners (Q2 2026)')}
      ${table(['Partner', 'Focus area', 'Participant range', 'Status', 'Note'], partnerRows)}

      ${secHead('DUCT — Environmental monitoring')}
      <div class="two-col">
        ${statCard('Readiness status', [
          statRow('Status',                         m.ductStatus),
          statRow('Go-live timing',                 m.ductGoLiveTiming),
          statRow('Water quality workflow configured', m.ductWaterQualityWorkflowConfigured),
          statRow('Claims submitted',               m.ductWaterQualityClaimsSubmitted),
          statRow('Claims verified',                m.ductWaterQualityClaimsVerified),
        ])}
        ${statCard('GroundTruth — Water Credits', [
          statRow('Status',                         m.groundTruthStatus),
          statRow('Water credit methodology',       m.groundTruthWaterCreditMethodologyStatus),
          statRow('WRC partnership active',         m.groundTruthWRCPartnershipActive),
          statRow('Launch through YIE',             m.groundTruthLaunchThroughYIE),
          statRow('Water credits on-chain',         m.groundTruthWaterCreditsCreatedOnChain),
          statRow('Youth data collector payouts',   m.groundTruthYouthDataCollectorPayoutsStatus),
        ])}
      </div>

      ${secHead('DPP2 — Planned July 2026')}
      ${table(['Partner', 'Focus area', 'Notes', 'Status'], dpp2Rows)}`;
  }

  function viewPlatform() {
    const m = D.metrics;
    return `
      ${secHead('Platform infrastructure — live status')}
      <div class="two-col">
        ${statCard('Claims & identity', [
          statRow('Mobile claims interface',        m.mobileClaimsInterfaceConfigured),
          statRow('Mobile claims URL',              m.mobileClaimsUrl),
          statRow('Decentralized identity (DID)',   m.decentralizedIdentityConfigured),
          statRow('KYC / KYB configured',           m.kycKybConfigured),
          statRow('Digital IDs issued (YoID)',      m.digitalIds),
        ])}
        ${statCard('Governance & reporting', [
          statRow('Real-time dashboard',            m.realTimeDashboardStatus),
          statRow('Impact certificate annex',       m.impactCertificateAnnexPlanned ? 'Planned' : 'Not planned'),
          statRow('Yoma Venture Co-op registered',  m.yomaVentureCooperativeRegistered),
          statRow('Digital Public Goods governance',m.digitalPublicGoodsGovernanceStatus),
        ])}
      </div>`;
  }

  // ─────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────
  const VIEWS = [
    { id: 'overview',     label: 'Overview' },
    { id: 'trajectory',   label: 'Trajectory' },
    { id: 'solutioneers', label: 'Solutioneers' },
    { id: 'umuzi',        label: 'Umuzi' },
    { id: 'begreen',      label: 'BeGreen' },
    { id: 'partners',     label: 'Partners' },
    { id: 'platform',     label: 'Platform' },
  ];

  function renderNav() {
    return `<nav class="view-nav" role="navigation" aria-label="Dashboard views">
      ${VIEWS.map(v => `
        <button class="vnav-btn ${_activeView === v.id ? 'active' : ''}"
          onclick="window.__app.switchView('${v.id}')">${v.label}</button>`).join('')}
    </nav>`;
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  const VIEW_FN = {
    overview:     viewOverview,
    trajectory:   viewTrajectory,
    solutioneers: viewSolutioneers,
    umuzi:        viewUmuzi,
    begreen:      viewBeGreen,
    partners:     viewPartners,
    platform:     viewPlatform,
  };

  function render() {
    const contextLabel = _portalContext
      ? `Entity: ${_portalContext.entityDid || 'connected'}`
      : 'Standalone mode';

    const bodyFn = VIEW_FN[_activeView] || viewOverview;

    document.getElementById('app-root').innerHTML = `
      <div class="dashboard">
        <header class="dash-header">
          <div class="dash-wordmark">
            <div class="dash-logo">Y</div>
            <div>
              <div class="dash-title">Yoma Impacts Exchange</div>
              <div class="dash-sub">Contract monitoring · 43450556 · ${D.meta.period}</div>
            </div>
          </div>
          <div class="dash-meta">
            <span class="context-chip">${contextLabel}</span>
            <span class="context-chip">${D.meta.phase}</span>
          </div>
        </header>
        ${renderNav()}
        <main class="dash-body">${bodyFn()}</main>
      </div>`;
  }

  // ─────────────────────────────────────────────
  // PORTAL & PUBLIC API
  // ─────────────────────────────────────────────
  window.addEventListener('portal:init', function (e) {
    _portalContext = e.detail;
    render();
  });

  window.addEventListener('portal:contextUpdate', function (e) {
    _portalContext = Object.assign(_portalContext || {}, e.detail);
    render();
  });

  window.__app = {
    switchView(id) { _activeView = id; render(); },
    switchSub(view, sub) { _activeSub[view] = sub; render(); },
    requestPortalAction(action, params) {
      if (window.IxoPortalBridge) window.IxoPortalBridge.requestAction(action, params);
    },
  };

  setTimeout(function () {
    if (!_portalContext) { _standalone = true; render(); }
  }, STANDALONE_TIMEOUT_MS);

})();
