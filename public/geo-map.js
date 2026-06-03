/**
 * geo-map.js
 * Interactive canvas world map for Yoma platform analytics.
 * CSP-safe: no external resources. Pure Web Canvas API.
 */
(function () {
  'use strict';

  // ── Country markers ──────────────────────────────────────────────────────
  const MARKERS = [
    { name: 'Nigeria',      lat:  9.08,  lng:   8.68, users: 220797, growth: 184.95,   colour: '#F97316' },
    { name: 'South Africa', lat:-30.56,  lng:  22.94, users:  74854, growth: 250.67,   colour: '#41204b', programme: true },
    { name: 'Philippines',  lat: 12.88,  lng: 121.77, users:  29803, growth: 10816.85, colour: '#38BDF8' },
    { name: 'Kenya',        lat: -0.02,  lng:  37.91, users:  21041, growth: 240.58,   colour: '#34D399' },
  ];

  // ── Simplified land outlines  [lng, lat] clockwise ───────────────────────

  // Africa — traced from key coastal cities
  const AFRICA = [
    [-17.4,14.7],[-13.7,9.5],[-10.8,6.3],[-4.0,5.3],[-0.2,5.6],
    [3.4,6.4],[9.7,4.0],[9.4,0.4],[11.9,-4.8],[13.2,-8.8],
    [12.2,-15.2],[17.0,-28.6],[18.5,-34.8],[25.6,-33.8],[31.0,-29.8],
    [35.4,-23.9],[35.3,-17.5],[39.3,-6.8],[39.7,-4.0],[45.3,2.0],
    [51.4,11.8],[43.1,11.5],[37.2,19.6],[32.5,29.9],[25.0,32.0],
    [10.2,37.0],[3.1,36.8],[-0.6,35.7],[-7.6,33.6],[-9.6,30.4],
    [-13.2,27.0],[-17.4,14.7],
  ];

  // Europe (simplified)
  const EUROPE = [
    [-9.5,36.5],[-6.3,35.0],[-5.4,36.0],[0.0,39.5],[3.2,41.5],
    [7.5,43.7],[12.5,44.0],[13.8,45.8],[18.5,40.5],[22.0,37.3],
    [26.2,37.5],[28.2,38.5],[35.4,36.9],[36.2,40.6],[41.3,41.5],
    [44.8,41.0],[50.5,42.0],[60.0,47.0],[55.5,54.6],[57.0,58.0],
    [40.0,65.0],[15.0,69.0],[4.5,58.0],[3.5,51.3],[2.5,49.5],
    [-1.0,46.0],[-2.0,43.3],[-9.0,39.0],[-9.5,36.5],
  ];

  // Asia + Middle East (rough)
  const ASIA = [
    [35.4,36.9],[41.3,41.5],[60.0,47.0],[80.0,50.0],[100.0,55.0],
    [120.0,55.0],[130.0,50.0],[141.0,38.0],[135.0,32.0],[125.0,22.0],
    [110.0,18.0],[100.0,3.0],[92.0,8.0],[80.0,8.0],[77.0,35.0],
    [60.0,22.0],[51.0,11.5],[43.1,11.8],[37.2,19.6],[32.5,29.9],
    [35.4,36.9],
  ];

  // Southeast Asia
  const SE_ASIA = [
    [95.0,18.0],[100.0,3.0],[104.0,1.3],[108.0,-7.0],[115.0,-8.0],
    [120.0,1.0],[125.0,2.0],[130.0,1.0],[125.0,12.0],[120.0,22.0],
    [100.0,18.0],[95.0,18.0],
  ];

  // Philippines
  const PHILIPPINES = [
    [118.5,9.5],[122.0,11.8],[124.0,11.2],[126.1,8.3],
    [125.0,6.0],[122.0,7.3],[118.5,9.5],
  ];

  // Australia
  const AUSTRALIA = [
    [114.0,-22.0],[115.0,-34.0],[119.0,-34.0],[130.0,-33.0],
    [136.0,-35.0],[140.0,-38.0],[148.0,-38.0],[153.0,-28.0],
    [153.0,-22.0],[145.0,-15.0],[137.0,-14.0],[130.0,-12.0],
    [122.0,-14.0],[114.0,-22.0],
  ];

  // North America
  const N_AMERICA = [
    [-168.0,62.0],[-138.0,58.0],[-125.0,49.0],[-117.0,32.0],
    [-97.0,26.0],[-88.0,16.0],[-83.0,10.0],[-78.0,8.0],
    [-83.0,10.0],[-90.0,16.0],[-97.0,26.0],[-110.0,24.0],
    [-125.0,34.0],[-138.0,58.0],[-152.0,58.0],[-168.0,62.0],
  ];

  // South America
  const S_AMERICA = [
    [-78.0,8.0],[-50.0,5.0],[-35.0,-5.0],[-35.0,-10.0],
    [-38.0,-13.0],[-40.0,-20.0],[-48.0,-28.0],[-53.0,-34.0],
    [-62.0,-42.0],[-66.0,-55.0],[-75.0,-52.0],[-72.0,-30.0],
    [-70.0,-18.0],[-80.0,-2.0],[-78.0,8.0],
  ];

  // Greenland
  const GREENLAND = [
    [-72.0,76.0],[-50.0,83.0],[-18.0,77.0],[-16.0,70.0],
    [-24.0,65.0],[-44.0,60.0],[-52.0,62.0],[-60.0,68.0],[-72.0,76.0],
  ];

  const LAND = [AFRICA, EUROPE, ASIA, SE_ASIA, PHILIPPINES, AUSTRALIA, N_AMERICA, S_AMERICA, GREENLAND];

  // ── Mercator projection (lat clamped to [-60, 75]) ──────────────────────
  const _LMIN = Math.log(Math.tan(Math.PI / 4 + (-60 * Math.PI / 180) / 2));
  const _LMAX = Math.log(Math.tan(Math.PI / 4 + ( 75 * Math.PI / 180) / 2));

  let W = 600, H = 300;

  function project(lng, lat) {
    const x = ((lng + 180) / 360) * W;
    const latC = Math.max(-59.9, Math.min(74.9, lat));
    const latR = latC * Math.PI / 180;
    const mN   = Math.log(Math.tan(Math.PI / 4 + latR / 2));
    const y    = H - ((mN - _LMIN) / (_LMAX - _LMIN)) * H;
    return [x, y];
  }

  // ── State ────────────────────────────────────────────────────────────────
  let canvas = null, ctx = null, animId = null, frame = 0, hovered = -1;

  const MAX_U = Math.max(...MARKERS.map(m => m.users));
  function markerR(u) { return 7 + (u / MAX_U) * 18; }

  // ── Rounded rect helper (avoids ctx.roundRect compat issues) ────────────
  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function fmtU(n) { return n >= 1000 ? (n / 1000).toFixed(0) + 'K' : String(n); }

  // ── Render ───────────────────────────────────────────────────────────────
  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0c1322');
    g.addColorStop(1, '#0f172a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 0.6;
    // Meridians
    for (let lng = -180; lng <= 180; lng += 30) {
      ctx.beginPath();
      let first = true;
      for (let lat = -60; lat <= 75; lat += 5) {
        const [x, y] = project(lng, lat);
        first ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        first = false;
      }
      ctx.stroke();
    }
    // Parallels
    for (let lat = -60; lat <= 75; lat += 30) {
      ctx.beginPath();
      let first = true;
      for (let lng = -180; lng <= 180; lng += 5) {
        const [x, y] = project(lng, lat);
        first ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        first = false;
      }
      ctx.stroke();
    }
    // Equator
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    let eq = true;
    for (let lng = -180; lng <= 180; lng += 4) {
      const [x, y] = project(lng, 0);
      eq ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      eq = false;
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawLand() {
    LAND.forEach(shape => {
      if (shape.length < 2) return;
      ctx.beginPath();
      shape.forEach(([lng, lat], i) => {
        const [x, y] = project(lng, lat);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#2d3f55';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    });
  }

  function drawMarkers() {
    MARKERS.forEach((m, i) => {
      const [cx, cy] = project(m.lng, m.lat);
      const r = markerR(m.users);
      const t = (frame / 80 + i * 0.25) % 1;

      // Outer pulse ring
      const pr = r + t * 26;
      const pa = (1 - t) * (hovered === i ? 0.55 : 0.3);
      ctx.beginPath();
      ctx.arc(cx, cy, pr, 0, Math.PI * 2);
      ctx.strokeStyle = m.colour + Math.round(pa * 255).toString(16).padStart(2, '0');
      ctx.lineWidth = hovered === i ? 2 : 1.5;
      ctx.stroke();

      // Second ring when hovered
      if (hovered === i) {
        const t2 = (t + 0.5) % 1;
        const pr2 = r + t2 * 26;
        const pa2 = (1 - t2) * 0.35;
        ctx.beginPath();
        ctx.arc(cx, cy, pr2, 0, Math.PI * 2);
        ctx.strokeStyle = m.colour + Math.round(pa2 * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Filled circle with radial gradient
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
      g.addColorStop(0, m.colour);
      g.addColorStop(1, m.colour + '99');
      ctx.fillStyle = g;
      ctx.fill();
      if (m.programme) {
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // User count label above circle
      ctx.textAlign = 'center';
      ctx.font = '9px "DM Mono", monospace';
      ctx.fillStyle = m.colour;
      ctx.fillText(fmtU(m.users), cx, cy - r - 15);

      // Country name
      ctx.font = 'bold 10px "DM Sans", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(15,23,42,0.6)';
      ctx.fillText(m.name, cx + 0.5, cy - r - 5.5);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(m.name, cx, cy - r - 6);
    });

    // Tooltip drawn last (on top of everything)
    if (hovered >= 0) drawTooltip(MARKERS[hovered]);
  }

  function drawTooltip(m) {
    const [cx, cy] = project(m.lng, m.lat);
    const r = markerR(m.users);
    const pad = 10, lh = 15;
    const lines = [
      { text: m.name,                                     bold: true,  colour: '#f1f5f9' },
      { text: m.users.toLocaleString() + ' active users', bold: false, colour: '#94a3b8' },
      { text: '↑ ' + m.growth.toFixed(2) + '% vs prev period', bold: false, colour: '#4ade80' },
    ];
    if (m.programme) lines.push({ text: '★  Programme focus market', bold: false, colour: '#fbbf24' });

    ctx.font = '10px "DM Sans", system-ui, sans-serif';
    const maxTW = Math.max(...lines.map(l => {
      ctx.font = (l.bold ? 'bold 11px' : '10px') + ' "DM Sans", system-ui, sans-serif';
      return ctx.measureText(l.text).width;
    }));
    const tw = maxTW + pad * 2.5;
    const th = lines.length * lh + pad * 1.5;

    let tx = cx + r + 14;
    let ty = cy - th / 2;
    if (tx + tw > W - 8) tx = cx - r - 14 - tw;
    if (ty < 5) ty = 5;
    if (ty + th > H - 5) ty = H - th - 5;

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    rrect(tx, ty, tw, th, 8);
    ctx.fillStyle = 'rgba(13,20,40,0.96)';
    ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // Border
    rrect(tx, ty, tw, th, 8);
    ctx.strokeStyle = m.colour + '44';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Left accent bar
    ctx.fillStyle = m.colour;
    rrect(tx, ty, 3, th, 2);
    ctx.fill();

    // Text
    lines.forEach((l, i) => {
      ctx.font = (l.bold ? 'bold 11px' : '10px') + ' "DM Sans", system-ui, sans-serif';
      ctx.fillStyle = l.colour;
      ctx.textAlign = 'left';
      ctx.fillText(l.text, tx + pad + 3, ty + pad + (i + 0.85) * lh);
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawGrid();
    drawLand();
    drawMarkers();
    frame++;
  }

  function loop() { draw(); animId = requestAnimationFrame(loop); }

  // ── Interaction ──────────────────────────────────────────────────────────
  function getHit(mx, my) {
    for (let i = 0; i < MARKERS.length; i++) {
      const [cx, cy] = project(MARKERS[i].lng, MARKERS[i].lat);
      const r = markerR(MARKERS[i].users) + 8;
      if ((mx - cx) ** 2 + (my - cy) ** 2 <= r * r) return i;
    }
    return -1;
  }

  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = W / rect.width, sy = H / rect.height;
    const h = getHit((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
    if (h !== hovered) { hovered = h; canvas.style.cursor = h >= 0 ? 'pointer' : 'default'; }
  }

  function onLeave() { hovered = -1; canvas.style.cursor = 'default'; }

  // ── Public API ───────────────────────────────────────────────────────────
  window.GeoMap = {
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      this.destroy();

      canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:100%;display:block;';
      el.innerHTML = '';
      el.appendChild(canvas);

      const dpr  = window.devicePixelRatio || 1;
      const rect = el.getBoundingClientRect();
      W = Math.max(rect.width,  300);
      H = Math.max(rect.height, 200);
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      canvas.addEventListener('mousemove', onMove);
      canvas.addEventListener('mouseleave', onLeave);
      frame = 0; hovered = -1;
      loop();
    },
    destroy() {
      if (animId) { cancelAnimationFrame(animId); animId = null; }
      if (canvas) {
        canvas.removeEventListener('mousemove', onMove);
        canvas.removeEventListener('mouseleave', onLeave);
        canvas = null; ctx = null;
      }
    },
  };
})();
