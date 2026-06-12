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

    outcomes: {
      lastUpdated: '20 Apr 2026',
      totalIssued: 8768,
      totalVerified: 8768,
      certificates: [
        {
          type: 'Education Certificates',
          icon: '🎓',
          color: '#41204b',
          colorLight: '#F4EDF7',
          colorBorder: '#D8C8E8',
          issued: 7748,
          target: 4000000,
          unit: 'certificates',
          sdgs: ['SDG 4', 'SDG 8'],
          verifier: 'Yoma / Passport to Earning (P2E)',
          protocol: 'IXO Claims Protocol',
          status: 'ON_TRACK',
          description: 'Verified digital skills and curriculum completions issued via Yoma and P2E. Certificates are portable, blockchain-anchored credentials recognised by employers.',
          breakdown: [
            { label: 'Yoma SA — digital skills', value: 7748 },
            { label: 'P2E certified (global pipeline)', value: 0 },
            { label: 'Umuzi MSRC completions', value: 0 },
          ],
        },
        {
          type: 'Employment Outcomes',
          icon: '💼',
          color: '#4cade9',
          colorLight: '#DFF1FC',
          colorBorder: '#BFDBFE',
          issued: 1020,
          target: 500000,
          unit: 'placements verified',
          sdgs: ['SDG 8', 'SDG 10'],
          verifier: 'Yoma SA / IXO Blocksync',
          protocol: 'IXO Claims Protocol',
          status: 'ON_TRACK',
          description: 'Verified job and apprenticeship placements with blockchain-anchored proof of outcome. 54.4% female. Covers Yoma SA-reported placements and Solutions Engineers in active pathways.',
          breakdown: [
            { label: 'Job / apprenticeship placements (SA)', value: 1020 },
            { label: 'Solutions engineers in pathway', value: 14 },
            { label: 'Sustained 6-month placements', value: 0 },
          ],
        },
        {
          type: 'Carbon Credits',
          icon: '🌿',
          color: '#387f6a',
          colorLight: '#DDF2EC',
          colorBorder: '#BBF7D0',
          issued: 0,
          target: null,
          unit: 'tonnes CO₂e verified',
          sdgs: ['SDG 13', 'SDG 15'],
          verifier: 'DUCT / Green Pill Cape Town / HOT',
          protocol: 'IXO Impact Claims + Verra VCS',
          status: null,
          description: 'Verified carbon offsets generated through youth-led environmental monitoring, circular economy gigs, and participatory mapping. Credits to be issued upon verified claim completion in Q3–Q4 2026.',
          breakdown: [
            { label: 'Environmental monitoring gigs (DUCT)', value: 0 },
            { label: 'Circular economy / Web3 (Green Pill)', value: 0 },
            { label: 'Community mapping (HOT — Q3 target 1k youth)', value: 0 },
          ],
        },
        {
          type: 'Biodiversity Certificates',
          icon: '🌳',
          color: '#28a745',
          colorLight: '#ECFDF5',
          colorBorder: '#A7F3D0',
          issued: 0,
          target: null,
          unit: 'certificates',
          sdgs: ['SDG 15', 'SDG 13'],
          verifier: 'Kruger 2 Canyons / GroundTruth (DPP2)',
          protocol: 'IXO Impact Claims',
          status: null,
          description: 'Verified conservation and biodiversity impact from youth ranger programmes, habitat monitoring, and species tracking. Certificates will be issued through DPP2 partners onboarding Q3 2026.',
          breakdown: [
            { label: 'Kruger 2 Canyons — youth rangers', value: 0 },
            { label: 'GroundTruth — citizen science', value: 0 },
            { label: 'Amandla Safe Hubs — habitat activities', value: 0 },
          ],
        },
      ],
    },

    dpp2: [
      {
        name: 'Humanitarian OpenStreetMap Team (HOT)',
        focus: 'Community Mapping & Geospatial Data',
        target: 1000, quarter: 'Q3 2026', status: 'confirmed',
        geography: 'National', region: 'Remote / Multi-province',
        note: 'Youth-led participatory mapping of impact zones and green infrastructure.',
      },
      {
        name: 'Kruger 2 Canyons Biosphere',
        focus: 'Environmental Conservation',
        target: null, quarter: 'Q3 2026', status: 'onboarding',
        geography: 'Limpopo', region: 'Hoedspruit / Greater Kruger',
        note: 'Biodiversity monitoring and youth ranger programme.',
      },
      {
        name: 'GroundTruth',
        focus: 'Environmental Monitoring',
        target: null, quarter: 'Q3 2026', status: 'onboarding',
        geography: 'Mpumalanga / National', region: 'Kruger Park buffer zones',
        note: 'Citizen science and environmental data collection.',
      },
      {
        name: 'Amandla Safe Hubs',
        focus: 'Youth Safety & Livelihoods',
        target: null, quarter: 'Q3 2026', status: 'onboarding',
        geography: 'Gauteng', region: 'Johannesburg townships',
        note: 'Safe spaces and livelihood pathways for vulnerable youth.',
      },
      {
        name: 'Giga',
        focus: 'School Connectivity',
        target: null, quarter: 'Q3 2026', status: 'onboarding',
        geography: 'National', region: 'Rural schools — multi-province',
        note: 'Connecting schools to the internet to enable digital opportunities.',
      },
    ],

    dpp1: [
      { name: 'Hoedspruit Hub / PYEI', focus: 'Functional Numeracy',        range: '3,000–5,000', mid: 4000, geography: 'Limpopo',       region: 'Hoedspruit / Tzaneen' },
      { name: 'DUCT',                  focus: 'Environmental Monitoring',    range: '800–1,200',   mid: 1000, geography: 'Western Cape',   region: 'Cape Town' },
      { name: 'Umuzi',                 focus: 'Digital Livelihoods (MSRC)',  range: '200–400',     mid: 300,  geography: 'Gauteng',        region: 'Johannesburg' },
      { name: 'Green Pill Cape Town',  focus: 'Circular Economy / Web3',     range: '50–150',      mid: 100,  geography: 'Western Cape',   region: 'Cape Town' },
      { name: 'Shonaquip',             focus: 'Assistive Technology',        range: '50–150',      mid: 100,  geography: 'Western Cape',   region: 'Cape Town' },
    ],
  };

  // ── Methodology library (5 deed outcome units) ───────────────────────────

  const METHODOLOGY_LIBRARY = [
    {
      id: 'LLPA',
      name: 'Launch Lab Participant Activation',
      partner: 'Umuzi',
      domain: 'Employment & Livelihoods',
      color: '#41204b', colorLight: '#F4EDF7', colorBorder: '#D8C8E8',
      confidenceTier: 'A',
      oracle: 'Umuzi Launch Lab Sustained Employment Oracle v1.0',
      oracleVersion: '1.0',
      scenariosPassed: '12/12',
      description: 'Verified sustained employment: two-stage claim chain — work placement confirmed + sustained-outcome (months ≥ threshold, payslip reviewed). High-stakes gate at collection 38101.',
      crosswalks: [
        { registry: 'IRIS+', code: 'OI5368', label: 'Employees: Receiving Living Wage', alignment: 'direct' },
        { registry: 'IRIS+', code: 'OI7708', label: 'Jobs Created and Supported', alignment: 'direct' },
        { registry: 'SDG',   code: '8.5.1',  label: 'Average hourly earnings — youth', alignment: 'direct' },
        { registry: 'SDG',   code: '8.5.2',  label: 'Unemployment rate — youth', alignment: 'proxy' },
        { registry: 'ILO',   code: 'DW-7',   label: 'Youth employment-to-population ratio', alignment: 'proxy' },
        { registry: 'SIB',   code: 'SIB-EMPLOY-ZA', label: 'Sustained employment outcome (SA DEL)', alignment: 'direct' },
        { registry: 'Gold Standard', code: 'GS-SDL', label: 'Sustainable Livelihoods', alignment: 'partial' },
      ],
      livelihoods: { avgMonths: 7.4, threshold: 6, monthlyEarningsZAR: 4413, sroiLow: 2.8, sroiHigh: 4.2 },
      funders: ['pwc', 'canada', 'dbsa', 'unicef'],
    },
    {
      id: 'CSH',
      name: 'Catchment Stewardship Hectare-Month',
      partner: 'DUCT',
      domain: 'Environmental Monitoring',
      color: '#387f6a', colorLight: '#DDF2EC', colorBorder: '#BBF7D0',
      confidenceTier: 'B',
      oracle: 'DUCT Catchment Stewardship Oracle v1.0-draft',
      oracleVersion: '1.0-draft',
      scenariosPassed: 'In development',
      description: 'Verified citizen science biodiversity monitoring: miniSASS bioassessment score + geolocation + photo evidence. Youth river monitors generating ecosystem health data for catchment areas.',
      crosswalks: [
        { registry: 'SDG',   code: '15.1.2', label: 'Proportion of land under biodiversity-friendly management', alignment: 'proxy' },
        { registry: 'SDG',   code: '6.3.2',  label: 'Proportion of water bodies with good ambient water quality', alignment: 'direct' },
        { registry: 'IRIS+', code: 'PI2571', label: 'Area of Land Sustainably Managed', alignment: 'partial' },
        { registry: 'Verra', code: 'VCS+CCB','label': 'Watershed & Biodiversity Co-benefits', alignment: 'partial' },
        { registry: 'BCA',   code: 'BCA-HABITAT', label: 'Biodiversity Credit Alliance — Habitat Unit', alignment: 'emerging' },
        { registry: 'SEEA',  code: 'SEEA-EW', label: 'Ecosystem Services Accounting — Water Regulation', alignment: 'partial' },
      ],
      livelihoods: null,
      funders: ['canada', 'dbsa'],
    },
    {
      id: 'VGG',
      name: 'Verified Grade-Level Gain',
      partner: 'Greater Stellenbosch Trust / numiknow',
      domain: 'Education & Foundational Skills',
      color: '#4cade9', colorLight: '#DFF1FC', colorBorder: '#BFDBFE',
      confidenceTier: 'A',
      oracle: 'numiknow Foundational Numeracy Oracle v1.0-draft',
      oracleVersion: '1.0-draft',
      scenariosPassed: 'In development',
      description: 'Verified grade-level advancement in foundational numeracy: baseline assessment + endline assessment with verified delta ≥ 1 grade level. Tamper-proof pre/post design.',
      crosswalks: [
        { registry: 'SDG',   code: '4.1.1',  label: 'Children achieving minimum proficiency in reading/maths', alignment: 'direct' },
        { registry: 'SDG',   code: '4.6.1',  label: 'Proportion with fixed level of proficiency in literacy/numeracy', alignment: 'proxy' },
        { registry: 'IRIS+', code: 'OD7459', label: 'Students completing education programmes', alignment: 'direct' },
        { registry: 'IRIS+', code: 'OD7460', label: 'Students: Grade-level advancement', alignment: 'direct' },
        { registry: 'WB HCI', code: 'HCI-LQ', label: 'Human Capital Index — Learning-adjusted years of school', alignment: 'partial' },
        { registry: 'SIVI',  code: 'SROI-EDU-ZA', label: 'SROI proxy — foundational numeracy gain (SA)', alignment: 'partial' },
      ],
      livelihoods: null,
      funders: ['pwc', 'canada', 'unicef'],
    },
    {
      id: 'VDU',
      name: 'Verified Dignity Unit',
      partner: 'GreenPill Cape Town — Dignity Project',
      domain: 'Circular Economy & Youth Livelihoods',
      color: '#28a745', colorLight: '#ECFDF5', colorBorder: '#A7F3D0',
      confidenceTier: 'B',
      oracle: 'Dignity Project Composite Oracle v1.0-draft',
      oracleVersion: '1.0-draft',
      scenariosPassed: 'In development',
      description: 'Composite outcome unit: verified waste diversion (weight sorted, material type) + verified youth livelihood activity (prepaid card payout). Disaggregated environmental + social sub-credits.',
      crosswalks: [
        { registry: 'SDG',   code: '12.5.1', label: 'National recycling rate (material recovered)', alignment: 'proxy' },
        { registry: 'SDG',   code: '8.3.1',  label: 'Proportion of informal employment in non-agriculture', alignment: 'proxy' },
        { registry: 'Verra', code: 'VM0044', label: 'Waste diversion from landfill — GHG avoidance', alignment: 'partial' },
        { registry: 'IRIS+', code: 'OI5368', label: 'Employees: Receiving Living Wage', alignment: 'partial' },
        { registry: 'ILO',   code: 'ILO-WASTE', label: 'Decent work in waste & recycling sector', alignment: 'proxy' },
      ],
      livelihoods: null,
      funders: ['canada', 'dbsa'],
    },
    {
      id: 'VISU',
      name: 'Verified Inclusion Story Unit',
      partner: 'ShonaquipSE',
      domain: 'Disability Inclusion & Social Norm Change',
      color: '#7C3AED', colorLight: '#F5F3FF', colorBorder: '#DDD6FE',
      confidenceTier: 'C',
      oracle: 'ShonaquipSE Inclusion Story Oracle v1.0-draft (novel)',
      oracleVersion: '1.0-draft',
      scenariosPassed: 'In development',
      description: 'Novel outcome unit: verified disability inclusion story produced with informed consent, participant co-creation, and engagement evidence. First-of-kind methodology — expert evaluator panel required.',
      crosswalks: [
        { registry: 'SDG',   code: '10.2.1', label: 'People living below 50% of median income, by disability', alignment: 'proxy' },
        { registry: 'CRPD',  code: 'Art. 8', label: 'Awareness-raising obligations — disability rights', alignment: 'direct' },
        { registry: 'IRIS+', code: 'OI5597', label: 'Clients with Disabilities', alignment: 'partial' },
        { registry: 'SIVI',  code: 'SROI-SOCIAL-NORM', label: 'Social norm change — disability inclusion (novel)', alignment: 'emerging' },
      ],
      livelihoods: null,
      funders: ['canada', 'unicef'],
    },
  ];

  // Returns crosswalk tags HTML for a given funder perspective
  function methodologyCrosswalks(unit, highlightRegistries) {
    const alignColor = { direct: '#1a4d2e', proxy: '#5a8a6a', partial: '#8aaa8a', emerging: '#D97706' };
    const alignBg    = { direct: '#e8f4e8', proxy: '#f0f6f0', partial: '#f5f9f5', emerging: '#FFF7ED' };
    return unit.crosswalks
      .filter(c => !highlightRegistries || highlightRegistries.some(r => c.registry.includes(r)))
      .map(c => `<span class="meth-tag" style="background:${alignBg[c.alignment]};color:${alignColor[c.alignment]};border:1px solid ${alignColor[c.alignment]}40">
        <span class="meth-tag-reg">${c.registry}</span> ${c.code} — ${c.label}
      </span>`).join('');
  }

  function renderMethodologyCard(unit, compact) {
    const tierColor = { A: '#1a4d2e', B: '#D97706', C: '#7C3AED' };
    const tierLabel = { A: 'Established', B: 'Emerging', C: 'Novel' };
    const crosswalkHtml = unit.crosswalks.map(c => {
      const alignColor = { direct: '#1a4d2e', proxy: '#5a8a6a', partial: '#8aaa8a', emerging: '#D97706' };
      const alignBg    = { direct: '#e8f4e8', proxy: '#f0f6f0', partial: '#f5f9f5', emerging: '#FFF7ED' };
      return `<tr>
        <td style="font-size:10px;color:#888;padding:3px 8px;white-space:nowrap">${c.registry}</td>
        <td style="font-size:10px;font-family:monospace;font-weight:700;color:#333;padding:3px 8px;white-space:nowrap">${c.code}</td>
        <td style="font-size:10px;color:#444;padding:3px 8px">${c.label}</td>
        <td style="padding:3px 8px"><span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:2px;background:${alignBg[c.alignment]};color:${alignColor[c.alignment]}">${c.alignment}</span></td>
      </tr>`;
    }).join('');

    const liveSection = unit.livelihoods ? `
      <div class="meth-live-strip" style="background:#f0f6f0;border:1px solid #c5d8c5;border-radius:4px;padding:8px 12px;margin-top:10px;display:flex;gap:24px;flex-wrap:wrap">
        <div><div style="font-size:18px;font-weight:700;color:#1a4d2e">ZAR ${(unit.livelihoods.monthlyEarningsZAR * 300 * unit.livelihoods.avgMonths / 1000000).toFixed(1)}M</div><div style="font-size:10px;color:#5a8a6a;text-transform:uppercase;letter-spacing:0.5px">Est. income (300 LLPA)</div></div>
        <div><div style="font-size:18px;font-weight:700;color:#1a4d2e">${unit.livelihoods.avgMonths} mo.</div><div style="font-size:10px;color:#5a8a6a;text-transform:uppercase;letter-spacing:0.5px">Avg sustained duration</div></div>
        <div><div style="font-size:18px;font-weight:700;color:#1a4d2e">${unit.livelihoods.sroiLow}×–${unit.livelihoods.sroiHigh}×</div><div style="font-size:10px;color:#5a8a6a;text-transform:uppercase;letter-spacing:0.5px">SROI range (SA HCI basis)</div></div>
      </div>` : '';

    return `
      <div class="meth-card" style="border:1px solid ${unit.colorBorder};background:${unit.colorLight};border-radius:6px;padding:${compact ? '12px' : '16px'};margin-bottom:${compact ? '10px' : '16px'}">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:8px">
          <div style="background:${unit.color};color:white;font-size:11px;font-weight:700;padding:4px 9px;border-radius:3px;white-space:nowrap;letter-spacing:0.5px">${unit.id}</div>
          <div style="flex:1">
            <div style="font-size:${compact ? '13' : '14'}px;font-weight:700;color:#1a1a2e">${unit.name}</div>
            <div style="font-size:11px;color:#666;margin-top:1px">${unit.partner} · ${unit.domain}</div>
          </div>
          <div style="text-align:right">
            <span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:2px;background:${tierColor[unit.confidenceTier]}20;color:${tierColor[unit.confidenceTier]};border:1px solid ${tierColor[unit.confidenceTier]}40">Tier ${unit.confidenceTier} — ${tierLabel[unit.confidenceTier]}</span>
            <div style="font-size:9px;color:#888;margin-top:3px">${unit.oracle}</div>
          </div>
        </div>
        <p style="font-size:11px;color:#555;line-height:1.5;margin-bottom:10px">${unit.description}</p>
        ${compact ? '' : `
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#888;margin-bottom:4px">Methodology crosswalks</div>
        <table style="width:100%;border-collapse:collapse;background:white;border-radius:3px;overflow:hidden;border:1px solid ${unit.colorBorder}">${crosswalkHtml}</table>`}
        ${liveSection}
      </div>`;
  }

  function renderMethodologyTab() {
    const tierSummary = `
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
        <div class="kpi" style="min-width:120px"><div class="kpi-label">Tier A oracles</div><div class="kpi-value" style="color:#1a4d2e">1</div><div class="kpi-meta"><span>LLPA — established</span></div></div>
        <div class="kpi" style="min-width:120px"><div class="kpi-label">Tier B oracles</div><div class="kpi-value" style="color:#D97706">3</div><div class="kpi-meta"><span>CSH · VDU · VGG — emerging</span></div></div>
        <div class="kpi" style="min-width:120px"><div class="kpi-label">Tier C oracles</div><div class="kpi-value" style="color:#7C3AED">1</div><div class="kpi-meta"><span>VISU — novel, first-of-kind</span></div></div>
        <div class="kpi" style="min-width:120px"><div class="kpi-label">Intl. crosswalks</div><div class="kpi-value" style="color:#4cade9">25</div><div class="kpi-meta"><span>IRIS+ · SDG · ILO · SIB · Verra</span></div></div>
        <div class="kpi" style="min-width:120px"><div class="kpi-label">Issuer</div><div class="kpi-value" style="font-size:13px;color:#41204b">Co-op</div><div class="kpi-meta"><span>Yoma Venture Co-operative</span></div></div>
      </div>`;

    return `
      <div class="info-box">
        <strong>Yoma Impacts Methodology Library — Outcome Unit Registry</strong><br>
        Five deed outcome units, each mapped to established international impact accounting frameworks. Oracle confidence tiers: <strong>A</strong> = established methodology (ready for outcomes financing) · <strong>B</strong> = emerging (parameterised, assumptions explicit) · <strong>C</strong> = novel (expert evaluator panel required). All outcome assets issued by the <strong>Yoma Venture Co-operative</strong> on IXO World infrastructure.
      </div>
      ${secHead('Oracle confidence summary')}
      ${tierSummary}
      ${secHead('Outcome unit registry')}
      ${METHODOLOGY_LIBRARY.map(u => renderMethodologyCard(u, false)).join('')}`;
  }

  // ── Per-funder methodology relevance panel ────────────────────────────────

  function renderFunderMethodologyPanel(funderId, funderColor) {
    const relevance = {
      pwc: {
        headline: 'Why methodology alignment matters for PwC',
        narrative: 'PwC\'s ESG and social value reporting frameworks require standardised, auditable impact units. The IRIS+ crosswalks allow Yoma outcome data to be directly embedded in PwC sustainability reports. The SROI range (2.8×–4.2×) provides a defensible social return figure for board-level reporting and private sector partnership pitches.',
        highlight: ['LLPA', 'VGG'],
        registries: ['IRIS+', 'SROI'],
        callouts: [
          { label: 'SROI range', value: '2.8×–4.2×', sub: 'ZAR per ZAR invested (SA HCI basis)' },
          { label: 'IRIS+ codes', value: '4', sub: 'directly aligned (OI5368, OI7708, OD7459, OD7460)' },
          { label: 'SDG alignment', value: 'SDG 4 + 8', sub: 'skills & employment reporting' },
        ],
      },
      canada: {
        headline: 'Why methodology alignment matters for Canada (GAC)',
        narrative: 'GAC\'s Results-Based Management (RBM) framework and Development for Results reporting require direct SDG indicator mapping and gender-disaggregated outcome data. The Yoma methodology library provides SDG 4.1.1, 8.5.1, 8.5.2, 10.2, 12.5, 13, and 15 crosswalks — covering the full range of GAC programme streams (digital livelihoods, Green Rising, P2E).',
        highlight: ['LLPA', 'VGG', 'CSH', 'VDU', 'VISU'],
        registries: ['SDG', 'ILO'],
        callouts: [
          { label: 'SDG indicators', value: '9', sub: 'covered across 5 outcome units' },
          { label: 'Gender data', value: '54.4%', sub: 'female LLPA · target 60%' },
          { label: 'Green outcomes', value: 'CSH + VDU', sub: 'SDG 12/13/15 aligned' },
        ],
      },
      dbsa: {
        headline: 'Why methodology alignment matters for DBSA',
        narrative: 'Development finance institutions require investment-grade, bankable impact data. LLPA\'s direct alignment with SA DEL\'s sustained employment outcome metric (SIB-EMPLOY-ZA) makes it immediately compatible with Social Impact Bond structures. The confidence score (0.92), audit trail, and IXO verifiable credential infrastructure provide the due diligence trail DFIs require. SROI of 2.8×–4.2× provides a social return premium on top of financial return.',
        highlight: ['LLPA', 'VDU', 'CSH'],
        registries: ['SIB', 'IRIS+', 'Verra'],
        callouts: [
          { label: 'Confidence score', value: '0.92', sub: 'LLPA · threshold 0.85 · 12/12 scenarios' },
          { label: 'SIB-compatible', value: 'Yes', sub: 'SIB-EMPLOY-ZA direct alignment' },
          { label: 'Implied income', value: 'ZAR 9.8M', sub: '300 LLPA × 7.4 months × NMW' },
        ],
      },
      unicef: {
        headline: 'Why methodology alignment matters for UNICEF',
        narrative: 'UNICEF\'s programming accountability framework maps outcomes to CRC articles, SDG targets, and MICS indicators. The Yoma methodology library covers SDG 4 (education — VGG), SDG 8 (employment — LLPA), SDG 10 (inclusion — VISU), and SDG 12/13/15 (environment — CSH/VDU). VISU\'s CRPD Article 8 alignment is directly relevant to UNICEF\'s disability inclusion mandate. All outcome units are youth-specific (14–35 age cohort, SA).',
        highlight: ['LLPA', 'VGG', 'VISU'],
        registries: ['SDG', 'CRPD', 'IRIS+'],
        callouts: [
          { label: 'SDG targets covered', value: '9', sub: 'across SDG 4, 8, 10, 12, 13, 15' },
          { label: 'CRPD alignment', value: 'Art. 8', sub: 'VISU — disability inclusion' },
          { label: 'Youth cohort', value: '14–35', sub: 'South Africa programme focus' },
        ],
      },
    };

    const r = relevance[funderId];
    if (!r) return '';

    const relevantUnits = METHODOLOGY_LIBRARY.filter(u => r.highlight.includes(u.id));

    const calloutHtml = r.callouts.map(c => `
      <div class="kpi" style="min-width:130px">
        <div class="kpi-label">${c.label}</div>
        <div class="kpi-value" style="color:${funderColor};font-size:16px">${c.value}</div>
        <div class="kpi-meta"><span>${c.sub}</span></div>
      </div>`).join('');

    return `
      <div style="background:#f8f9fa;border:1px solid #e5e7eb;border-left:4px solid ${funderColor};border-radius:6px;padding:16px;margin-bottom:20px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:${funderColor};margin-bottom:6px">Methodology alignment</div>
        <div style="font-size:12px;font-weight:700;color:#1a1a2e;margin-bottom:6px">${r.headline}</div>
        <p style="font-size:12px;color:#555;line-height:1.6;margin-bottom:12px">${r.narrative}</p>
        <div class="kpi-grid" style="margin-bottom:12px">${calloutHtml}</div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#888;margin-bottom:8px">Relevant outcome units for this funder</div>
        ${relevantUnits.map(u => renderMethodologyCard(u, true)).join('')}
      </div>`;
  }

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

    dbsa: {
      name: 'DBSA',
      fullName: 'Development Bank of Southern Africa',
      color: '#005792',
      colorLight: '#EFF6FF',
      colorBorder: '#93C5FD',
      mandate: 'Blended finance · Social Impact Bonds · Youth employment outcomes',
      contribution: 'TBC',
      period: 'Prospective 2026–2028',
      focus: ['Investment-grade outcome units', 'SIB-compatible metrics', 'Blended finance structuring', 'SROI documentation', 'Youth employment (SA)'],
      narrative: 'DBSA\'s mandate as South Africa\'s development finance institution includes structuring blended finance instruments that mobilise private capital for social outcomes. The Yoma Impacts Exchange offers DBSA a pipeline of investment-grade, independently verified youth employment outcome units (LLPA) that are directly compatible with SA DEL\'s sustained employment outcome metric used in Social Impact Bonds. Each LLPA is backed by a two-stage verified claim chain, a confidence score of 0.92, W3C verifiable credentials, and a complete IXO blockchain audit trail — meeting DFI due diligence standards. The SROI range of 2.8×–4.2× (SA Human Capital Index basis) provides a social premium on top of financial return for blended structures.',
      allocation: [
        { label: 'SIB outcome payments — LLPA (sustained employment)', pct: 55, amount: 'TBC' },
        { label: 'Blended finance facility — DPP1+DPP2 scale',         pct: 25, amount: 'TBC' },
        { label: 'Environmental outcome units (CSH + VDU)',              pct: 12, amount: 'TBC' },
        { label: 'Technical assistance — oracle governance',             pct:  8, amount: 'TBC' },
      ],
      kpis: [
        { label: 'LLPA outcome units (verified)', value: 0,    target: 300,   color: '#41204b', sub: 'SIB-EMPLOY-ZA compatible',       status: 'AT_RISK'  },
        { label: 'SROI range (per LLPA)',          value: 0,    target: null,  color: '#005792', sub: '2.8×–4.2× ZAR/ZAR (target)',     status: null       },
        { label: 'Confidence score (oracle)',       value: 0,   target: null,  color: '#1a4d2e', sub: '0.92 threshold 0.85 (LLPA v1)',   status: null       },
        { label: 'CSH units (environmental)',       value: 0,   target: null,  color: '#387f6a', sub: 'Verra VCS+CCB compatible',        status: 'AT_RISK'  },
        { label: 'VDU units (circular economy)',    value: 0,   target: null,  color: '#28a745', sub: 'Waste + livelihoods composite',   status: 'AT_RISK'  },
        { label: 'Audit trail completeness',        value: 0,   target: null,  color: '#0891B2', sub: 'W3C VC + IXO blockchain',         status: null       },
      ],
      milestones: [
        { label: 'DBSA introductory briefing — Yoma methodology library',  due: 'Jun 2026',  status: 'in-progress' },
        { label: 'LLPA oracle v1.0 independent review (12/12 scenarios)',  due: 'Jun 2026',  status: 'complete'    },
        { label: 'DBSA due diligence package prepared',                     due: 'Jul 2026',  status: 'upcoming'    },
        { label: 'SIB structuring workshop — SA DEL / DBSA / Yoma Co-op',  due: 'Aug 2026',  status: 'upcoming'    },
        { label: 'First LLPA batch certificate issued (300 units)',         due: 'Dec 2026',  status: 'upcoming'    },
        { label: 'Environmental oracle (CSH) v1.0 — DBSA review',          due: 'Q1 2027',   status: 'upcoming'    },
        { label: 'Blended finance term sheet — pilot instrument',           due: 'Q2 2027',   status: 'upcoming'    },
      ],
    },

    unicef: {
      name: 'UNICEF',
      fullName: 'UNICEF — United Nations Children\'s Fund',
      color: '#1CABE2',
      colorLight: '#E8F7FD',
      colorBorder: '#7DD3F8',
      mandate: 'Youth outcomes · SDG 4/8/10 · Disability inclusion · Green Rising',
      contribution: 'Programme co-funding',
      period: '2025–2027',
      focus: ['SDG 4 education (VGG)', 'SDG 8 employment (LLPA)', 'SDG 10 inclusion (VISU)', 'Green Rising (CSH + VDU)', 'Country-level disaggregation'],
      narrative: 'UNICEF\'s programme accountability framework requires outcome reporting against CRC articles, SDG targets, and MICS indicators. The Yoma Methodology Library provides direct crosswalks to SDG 4.1.1 (grade-level gain — VGG), SDG 8.5.1 and 8.5.2 (youth employment — LLPA), SDG 10.2 (inclusion — VISU), and SDG 12.5/13/15 (environment — CSH/VDU). VISU\'s alignment with CRPD Article 8 is directly relevant to UNICEF\'s disability inclusion programming. All outcome units apply to the 14–35 youth cohort in South Africa, with architecture designed to scale to other UNICEF country offices. The co-operative issuer structure and IXO W3C verifiable credentials meet UNICEF\'s data sovereignty and portability requirements.',
      allocation: [
        { label: 'SDG 4 — education outcomes (VGG / numiknow)',       pct: 30, amount: 'Programme allocation' },
        { label: 'SDG 8 — employment outcomes (LLPA / Umuzi)',        pct: 30, amount: 'Programme allocation' },
        { label: 'SDG 10 — inclusion outcomes (VISU / ShonaquipSE)',  pct: 20, amount: 'Programme allocation' },
        { label: 'Green Rising — environment (CSH + VDU)',            pct: 20, amount: 'Programme allocation' },
      ],
      kpis: [
        { label: 'SDG 4.1.1 — grade-level gains (VGG)', value: 0,  target: null, color: '#4cade9', sub: 'Foundational numeracy verified',       status: 'AT_RISK'  },
        { label: 'SDG 8.5 — sustained employment (LLPA)',value: 0,  target: 300,  color: '#41204b', sub: '14–35 cohort · South Africa',          status: 'AT_RISK'  },
        { label: 'SDG 10.2 — inclusion stories (VISU)',  value: 0,  target: null, color: '#7C3AED', sub: 'CRPD Art. 8 · disability inclusion',   status: 'AT_RISK'  },
        { label: 'SDG 12/15 — environmental (CSH+VDU)',  value: 0,  target: null, color: '#387f6a', sub: 'Biodiversity + circular economy',       status: 'AT_RISK'  },
        { label: 'Yoma SA active users',                  value: 74854, target: null, color: '#1CABE2', sub: '↑ 250.67% · Jan 2025–Jun 2026',    status: 'ON_TRACK' },
        { label: 'Female beneficiaries (LLPA)',           value: 0,  target: null, color: '#D04A02', sub: 'Target 54.4%+ · gender parity focus', status: null       },
      ],
      milestones: [
        { label: 'Yoma SA platform baseline — 74,854 users',             due: 'Jun 2026',  status: 'complete'    },
        { label: 'LLPA oracle v1.0 verified (12/12 scenarios)',           due: 'Jun 2026',  status: 'complete'    },
        { label: 'VGG oracle draft — numiknow assessment framework',      due: 'Jul 2026',  status: 'in-progress' },
        { label: 'VISU oracle draft — ShonaquipSE + disability experts',  due: 'Aug 2026',  status: 'upcoming'    },
        { label: 'First SDG 4.1.1 batch credentials issued (VGG)',        due: 'Q3 2026',   status: 'upcoming'    },
        { label: 'UNICEF country office scalability assessment',           due: 'Q4 2026',   status: 'upcoming'    },
        { label: 'Multi-country pilot design — 2 UNICEF country offices', due: 'Q1 2027',   status: 'upcoming'    },
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
      ${renderFunderMethodologyPanel(funderId, f.color)}
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

  function renderOutcomes() {
    const o = MOCK.outcomes;

    const summaryCards = `
      <div class="kpi-grid">
        <div class="kpi">
          <div class="kpi-label">Total certificates issued</div>
          <div class="kpi-value" style="color:#41204b">${o.totalIssued.toLocaleString()}</div>
          <div class="kpi-meta"><span>all types · blockchain verified</span></div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Verification protocol</div>
          <div class="kpi-value" style="color:#387f6a;font-size:14px;letter-spacing:0">IXO Claims</div>
          <div class="kpi-meta"><span>anchored on IXO blockchain</span></div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Certificate types active</div>
          <div class="kpi-value" style="color:#4cade9">2 <span style="font-size:13px;color:var(--text-mut)">/ 4</span></div>
          <div class="kpi-meta"><span>carbon + biodiversity from Q3</span></div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Last updated</div>
          <div class="kpi-value" style="color:#F9AB3E;font-size:14px">${o.lastUpdated}</div>
          <div class="kpi-meta"><span>next update: Jun 2026</span></div>
        </div>
      </div>`;

    const certCards = o.certificates.map(c => {
      const p = c.target ? pct(c.issued, c.target) : null;
      const bar = p !== null ? `<div class="outcome-bar"><div class="outcome-bar-fill" style="width:${p}%;background:${c.color}"></div></div>` : '';
      const statusBadge = c.status ? `<span class="badge badge-${c.status.toLowerCase().replace('_','-')}">${c.status.replace('_',' ')}</span>` : `<span class="badge badge-at-risk">Pipeline Q3</span>`;
      const sdgTags = c.sdgs.map(s => `<span class="sdg-tag" style="background:${c.colorLight};color:${c.color};border-color:${c.colorBorder}">${s}</span>`).join('');
      const breakdownRows = c.breakdown.map(b => `
        <div class="outcome-breakdown-row">
          <span class="outcome-breakdown-label">${b.label}</span>
          <span class="outcome-breakdown-value" style="color:${b.value > 0 ? c.color : 'var(--text-mut)'}">${b.value > 0 ? b.value.toLocaleString() : '—'}</span>
        </div>`).join('');

      return `
        <div class="outcome-card" style="--oc-color:${c.color};--oc-light:${c.colorLight};--oc-border:${c.colorBorder}">
          <div class="outcome-card-header">
            <div class="outcome-icon" style="background:${c.colorLight};border-color:${c.colorBorder}">${c.icon}</div>
            <div class="outcome-card-title-block">
              <div class="outcome-type">${c.type}</div>
              <div class="outcome-sdgs">${sdgTags}</div>
            </div>
            <div class="outcome-card-count">
              <div class="outcome-issued" style="color:${c.color}">${c.issued.toLocaleString()}</div>
              <div class="outcome-unit">${c.unit}</div>
            </div>
          </div>
          ${bar}
          ${p !== null ? `<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-mut);margin-top:3px"><span>of ${c.target ? c.target.toLocaleString() : '—'} target</span><span style="color:${c.color};font-weight:700">${p}%</span></div>` : ''}
          <p class="outcome-desc">${c.description}</p>
          <div class="outcome-breakdown">${breakdownRows}</div>
          <div class="outcome-card-footer">
            <div class="outcome-meta-row">
              <span class="outcome-meta-label">Verifier</span>
              <span class="outcome-meta-value">${c.verifier}</span>
            </div>
            <div class="outcome-meta-row">
              <span class="outcome-meta-label">Protocol</span>
              <span class="outcome-meta-value" style="color:${c.color}">${c.protocol}</span>
            </div>
            <div style="margin-top:8px">${statusBadge}</div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="info-box">
        <strong>Verifiable outcome certificates — IXO Claims Protocol</strong><br>
        All certificates are anchored on the IXO blockchain as verifiable credentials, providing tamper-proof proof of impact for funders and beneficiaries. Carbon and biodiversity certificates activate with DPP2 partners in Q3 2026.
      </div>
      ${secHead('Summary')}
      ${summaryCards}
      ${secHead('Certificate tracker')}
      <div class="outcome-grid">${certCards}</div>`;
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
        { id: 'overview',    label: 'Executive overview'      },
        { id: 'trajectory',  label: 'Target trajectory'       },
        { id: 'outcomes',    label: 'Outcomes & certificates' },
        { id: 'methodology', label: 'Methodology library'     },
        { id: 'analytics',   label: 'Platform analytics'      },
      ],
      funders: [
        { id: 'pwc',       label: 'PwC'       },
        { id: 'canada',    label: 'Canada'    },
        { id: 'dbsa',      label: 'DBSA'      },
        { id: 'unicef',    label: 'UNICEF'    },
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
      if (cur === 'outcomes')    bodyHtml = renderOutcomes();
      if (cur === 'methodology') bodyHtml = renderMethodologyTab();
      if (cur === 'analytics')  { bodyHtml = renderPlatformAnalytics(); }
    } else if (_activeView === 'funders') {
      bodyHtml = renderFunder(cur);
    } else if (_activeView === 'orgs') {
      if (cur === 'dpp1') {
        bodyHtml = `
          ${secHead('DPP1 active partners — Q2 2026')}
          <table class="data-table">
            <thead><tr><th>Partner</th><th>Focus area</th><th>Province</th><th>Region / City</th><th>Range</th><th>Midpoint</th></tr></thead>
            <tbody>${MOCK.dpp1.map(p => `
              <tr>
                <td class="bold">${p.name}</td>
                <td>${p.focus}</td>
                <td><span class="geo-badge">${p.geography}</span></td>
                <td class="muted">${p.region}</td>
                <td style="font-family:monospace">${p.range}</td>
                <td style="font-family:monospace;font-weight:700">${p.mid.toLocaleString()}</td>
              </tr>`).join('')}
            </tbody>
          </table>`;
      }
      if (cur === 'dpp2') {
        const statusClass = { confirmed: 'on-track', onboarding: 'at-risk' };
        const statusLabel = { confirmed: 'Confirmed Q3', onboarding: 'Onboarding' };
        bodyHtml = `
          ${secHead('DPP2 design partners — Q3 2026 expansion')}
          <table class="data-table">
            <thead><tr><th>Partner</th><th>Focus area</th><th>Province</th><th>Region</th><th>Youth target</th><th>Quarter</th><th>Status</th></tr></thead>
            <tbody>${MOCK.dpp2.map(p => `
              <tr>
                <td class="bold">${p.name}</td>
                <td>${p.focus}</td>
                <td><span class="geo-badge">${p.geography}</span></td>
                <td class="muted">${p.region}</td>
                <td style="font-family:monospace;font-weight:700;color:${p.target ? '#41204b' : '#9B8FAA'}">${p.target ? p.target.toLocaleString() : '—'}</td>
                <td style="font-size:11px;color:var(--text-sec)">${p.quarter}</td>
                <td><span class="badge badge-${statusClass[p.status]}">${statusLabel[p.status]}</span></td>
              </tr>
              <tr><td colspan="7" style="font-size:11px;color:var(--text-sec);padding:4px 13px 10px;border-bottom:1px solid var(--border)">${p.note}</td></tr>
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
