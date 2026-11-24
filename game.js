'use strict';
(() => {
const $ = s => document.querySelector(s), cv = $('#c'), ctx = cv.getContext('2d');
const X0 = -1000, X1 = 1000, WW = 2000, DEP = 1300, CS = 25, GC = 80, GR = 52, SEG = 9, MAXN = 15000, MAXM = 150;
const TAU = Math.PI * 2, KEY = 'zombie_fungus_v1', SOY = -30;
const rnd = Math.random, clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, hyp = Math.hypot;
const sy = x => 6 * Math.sin(x * .01) + 3 * Math.sin(x * .037 + 1) + 1.5 * Math.sin(x * .11);
const angD = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; };
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const mix = (a, b, t) => `rgb(${a[0] + (b[0] - a[0]) * t | 0},${a[1] + (b[1] - a[1]) * t | 0},${a[2] + (b[2] - a[2]) * t | 0})`;
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : Math.floor(n) + '';
  const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx']; let i = -1;
  while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + u[i];
}

// ---------- screen / camera ----------
let DPR = 1, SW = 1, SH = 1, cam = null;
function resize() {
  DPR = Math.min(2, devicePixelRatio || 1); SW = innerWidth; SH = innerHeight;
  cv.width = Math.round(SW * DPR); cv.height = Math.round(SH * DPR);
  if (cam) clampCam();
}
addEventListener('resize', resize); resize();
const zMin = () => Math.max(SW / (WW + 300), SH / (DEP + 450), .2);
function clampCam() { cam.z = clamp(cam.z, zMin(), 4); cam.x = clamp(cam.x, X0, X1); cam.y = clamp(cam.y, -200, DEP); }
const toWorld = (sx, sy_) => ({ x: (sx - SW / 2) / cam.z + cam.x, y: (sy_ - SH / 2) / cam.z + cam.y });
const toScreen = (x, y) => ({ x: (x - cam.x) * cam.z + SW / 2, y: (y - cam.y) * cam.z + SH / 2 });

// ---------- glow sprites ----------
const GS = {};
function gsprite(col) {
  if (GS[col]) return GS[col];
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return GS[col] = c;
}
function glow(x, y, r, col, a = 1) { ctx.globalAlpha = a; ctx.drawImage(gsprite(col), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }

// ---------- world generation ----------
let W;
function genWorld(seed) {
  const R = mulberry(seed), rr = (a, b) => a + R() * (b - a);
  const w = { stones: [], res: [], plants: [], grass: [], leaves: [], trees: [], stars: [] };
  const ok = (x, y, r) => hyp(x, y) > r + 70 && w.stones.every(s => hyp(s.x - x, s.y - y) > s.r + r + 12) && w.res.every(s => hyp(s.x - x, s.y - y) > s.r * 1.5 + r + 22);
  const addR = (t, x, y, r, cap) => w.res.push({ t, x, y, r, cap, amt: cap, tap: 0, node: -1, ph: R() * TAU, acc: 0, ft: R() });
  addR('w', 82, 118, 22, 70); addR('n', -92, 150, 10, 30);
  for (let i = 0; i < 36; i++) { const y = rr(90, DEP - 50), x = rr(X0 + 60, X1 - 60), r = rr(15, 30) * (1 + y / DEP * .8); if (ok(x, y, r * 1.5)) addR('w', x, y, r, Math.round(r * 2.6 + y * .2)); }
  for (let i = 0; i < 64; i++) { const y = rr(70, DEP - 40), x = rr(X0 + 40, X1 - 40), r = rr(8, 13); if (ok(x, y, r)) addR('n', x, y, r, Math.round((25 + y * .14) * rr(.8, 1.5))); }
  for (let i = 0; i < 16; i++) { const y = rr(320, DEP - 40), x = rr(X0 + 40, X1 - 40); if (ok(x, y, 14)) addR('f', x, y, 14, Math.round(40 + y * .1)); }
  for (let i = 0; i < 75; i++) {
    const y = rr(60, DEP - 20), x = rr(X0 + 20, X1 - 20), r = rr(16, 48) * (.7 + y / DEP * .9);
    if (!ok(x, y, r)) continue;
    const pts = []; for (let k = 0; k < 11; k++) { const a = k / 11 * TAU, q = r * rr(.82, 1.14); pts.push([x + Math.cos(a) * q, y + Math.sin(a) * q * .8]); }
    const p = new Path2D(), m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], s0 = m(pts[10], pts[0]);
    p.moveTo(s0[0], s0[1]); for (let k = 0; k < 11; k++) { const n = m(pts[k], pts[(k + 1) % 11]); p.quadraticCurveTo(pts[k][0], pts[k][1], n[0], n[1]); }
    const d = y / DEP, g = ctx.createLinearGradient(x - r, y - r, x + r * .6, y + r);
    g.addColorStop(0, mix([120, 108, 100], [80, 84, 100], d)); g.addColorStop(1, mix([38, 32, 30], [22, 22, 34], d));
    w.stones.push({ x, y, r: r * .92, path: p, g });
  }
  for (let x = X0 + 20; x < X1 - 20; x += rr(28, 70)) if (Math.abs(x) > 70) w.plants.push({ x, t: R() * 5 | 0, s: rr(.7, 1.4), h: rr(0, 360), inf: 0, ph: R() * TAU, c: (x - X0) / CS | 0 });
  for (let x = X0; x < X1; x += rr(1.6, 3.2)) w.grass.push({ x, h: rr(5, 14) * (R() < .12 ? 1.8 : 1), l: rr(-.35, .35), c: (x - X0) / CS | 0, ph: R() * TAU });
  for (let i = 0; i < 70; i++) { const x = rr(X0, X1); if (Math.abs(x) > 55) w.leaves.push({ x, a: rr(-.5, .5), s: rr(4, 8), h: rr(10, 40), c: (x - X0) / CS | 0 }); }
  for (let i = 0; i < 16; i++) {
    const h = rr(240, 520), b = [new Path2D(), new Path2D(), new Path2D()];
    (function br(x, y, a, len, wd, d) {
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len, p = b[Math.min(2, d >> 1)];
      p.moveTo(x, y); p.lineTo(x2, y2);
      if (d >= 5) return;
      const n = d < 1 ? 2 : R() < .6 ? 2 : 3;
      for (let k = 0; k < n; k++) br(x2, y2, a + (R() - .5) * 1.4, len * rr(.55, .78), wd * .6, d + 1);
    })(0, 0, -Math.PI / 2 + rr(-.15, .15), h * .36, 1, 0);
    w.trees.push({ x: rr(X0 - 300, X1 + 300), h, b, p: rr(.55, .75) });
  }
  w.trees.sort((a, b) => a.p - b.p);
  for (let i = 0; i < 110; i++) w.stars.push({ x: R(), y: R(), s: rr(.4, 1.5), p: R() * TAU });
  return w;
}

let soil;
function renderSoil() {
  const R = mulberry(S.seed + 7), rr = (a, b) => a + R() * (b - a);
  soil = document.createElement('canvas'); soil.width = WW; soil.height = DEP - SOY;
  const g = soil.getContext('2d'), H = soil.height;
  const gr = g.createLinearGradient(0, 0, 0, H);
  [[0, '#3b2717'], [.06, '#2c1c11'], [.25, '#24170f'], [.5, '#1c1513'], [.75, '#141119'], [1, '#09080e']].forEach(s => gr.addColorStop(s[0], s[1]));
  g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= WW; x += 5) g.lineTo(x, sy(x + X0) - SOY); g.lineTo(WW, H); g.closePath();
  g.fillStyle = gr; g.fill(); g.save(); g.clip();
  [[140, 30, 'rgba(110,64,32,.22)'], [330, 55, 'rgba(70,40,40,.25)'], [560, 40, 'rgba(90,80,70,.15)'], [800, 70, 'rgba(40,40,60,.3)'], [1080, 60, 'rgba(30,20,50,.35)']].forEach(([y, th, c]) => {
    const f = rr(.004, .01), ph = rr(0, 9); g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= WW; x += 20) g.lineTo(x, y + Math.sin(x * f + ph) * 18 + Math.sin(x * f * 3.1) * 6);
    for (let x = WW; x >= 0; x -= 20) g.lineTo(x, y + th + Math.sin(x * f + ph + 1) * 18);
    g.fillStyle = c; g.fill();
  });
  for (let i = 0; i < 14000; i++) {
    const y = R() * H, l = 18 + R() * 40 * (1 - y / H * .6);
    g.fillStyle = `hsla(${20 + R() * 25},${20 + R() * 25}%,${l * (R() < .5 ? .5 : 1)}%,${.15 + R() * .35})`;
    const s = R() < .9 ? 1 + R() * 2 : 2 + R() * 4; g.fillRect(R() * WW, y, s, s * rr(.6, 1));
  }
  for (let i = 0; i < 500; i++) {
    const y = rr(10, H), x = R() * WW, r = rr(1.5, 5); g.fillStyle = `hsl(${20 + R() * 30},${10 + R() * 15}%,${15 + R() * 20}%)`;
    g.beginPath(); g.ellipse(x, y, r, r * rr(.5, .9), R() * 3, 0, TAU); g.fill();
  }
  g.strokeStyle = 'rgba(15,8,4,.5)'; g.lineCap = 'round';
  for (let i = 0; i < 90; i++) { let x = R() * WW, y = sy(x + X0) - SOY + 2, a = Math.PI / 2; g.lineWidth = rr(.6, 2); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 10; k++) { a += rr(-.5, .5); x += Math.cos(a) * 6; y += Math.sin(a) * 6; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 14; i++) { let x = R() * WW, y = rr(60, H - 60), a = R() * TAU; g.strokeStyle = 'rgba(10,6,4,.5)'; g.lineWidth = rr(3, 6); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 30; k++) { a += rr(-.35, .35); x += Math.cos(a) * 5; y += Math.sin(a) * 5; g.lineTo(x, y); } g.stroke(); }
  const tg = g.createLinearGradient(0, 0, 0, 60); tg.addColorStop(0, 'rgba(10,6,3,.0)'); tg.addColorStop(.5, 'rgba(10,6,3,.35)'); tg.addColorStop(1, 'rgba(10,6,3,0)');
  g.fillStyle = tg; g.fillRect(0, 0, WW, 60);
  g.restore();
}

// ---------- state ----------
let S, nodes = [], tips = [], res = [], mush = [], inf, rev, infList = [], surf = new Float32Array(GC);
let paths = [], hairPath, hairN = 0, IC, ICg, RC, RCg, FP = [], P = [], FT = [], MK = [];
const NB = 5, genW = g => Math.max(.8, 3.8 * Math.pow(.72, g));
const L = id => S.up[id] || 0;
const F = {
  speed: (l = L('speed')) => 12 * Math.pow(1.3, l),
  tips: (l = L('tips')) => 1 + l,
  range: (l = L('range')) => 90 + 55 * l,
  absorb: (l = L('absorb')) => 1 + .4 * l,
  eff: (l = L('eff')) => .12 * Math.pow(.88, l),
  drill: (l = L('drill')) => [0, .3, .6, 1][l],
  spore: (l = L('spore')) => 1 + .5 * l,
  click: (l = L('click')) => Math.pow(2, l),
  area: (l = L('area')) => 26 + 8 * l,
  decomp: (l = L('decomp')) => 1 + .6 * l,
  auto: (l = L('auto')) => l ? 30 * Math.pow(.78, l - 1) : 0,
  explo: (l = L('explo')) => .1 * l,
  parasite: (l = L('parasite')) => 1 + l,
  giant: (l = L('giant')) => Math.pow(2, l),
  accel: (l = L('accel')) => Math.pow(1.5, l),
  chain: (l = L('chain')) => l,
};
const absorbAll = () => F.absorb() * F.accel();
const sporeRate = () => (.3 + mush.reduce((a, m) => a + m.sz * .4, 0)) * F.spore() * F.giant();
const baseWater = () => .4 + surf.reduce((a, v) => a + v, 0) * .02;
const passiveBio = () => (W.plants.reduce((a, p) => a + p.inf * .15 * p.s, 0) + infList.length * .003) * F.decomp();
const clickPow = () => (1 + .15 * (S.lvl - 1) + mush.length * .05) * F.click();
const need = () => Math.floor(30 * Math.pow(1.5, S.lvl - 1));
const sproutCost = () => Math.ceil(10 * Math.pow(1.27, S.st.bought));
const XPW = { spores: .3, water: .3, biomass: 1, dna: 20 };
const RES = ['spores', 'water', 'biomass', 'dna'], RCOL = { spores: '#b6ff3c', water: '#5fe0ff', biomass: '#ffa64d', dna: '#e86bff' };
let gain = { spores: 0, water: 0, biomass: 0, dna: 0 }, rate = { spores: 0, water: 0, biomass: 0, dna: 0 };

function setupRuntime() {
  nodes = []; tips = []; mush = []; infList = []; FP = []; P = []; FT = []; MK = [];
  inf = new Uint8Array(GC * GR); rev = new Uint8Array(GC * GR); surf = new Float32Array(GC);
  res = W.res;
  paths = []; for (let i = 0; i < NB; i++) paths.push(new Path2D()); hairPath = new Path2D(); hairN = 0;
  IC = document.createElement('canvas'); IC.width = GC * 4; IC.height = GR * 4; ICg = IC.getContext('2d');
  RC = document.createElement('canvas'); RC.width = GC * 4; RC.height = GR * 4; RCg = RC.getContext('2d');
  RCg.fillStyle = 'rgba(3,1,7,.9)'; RCg.fillRect(0, 0, RC.width, RC.height);
  renderSoil();
}
function newGame() {
  S = { seed: rnd() * 1e9 | 0, r: { spores: 0, water: 25, biomass: 0, dna: 0 }, lvl: 1, xp: 0, score: 0, up: {}, ach: {}, st: { taps: 0, fos: 0, depth: 0, clicks: 0, bought: 0, muts: 0 }, t: Date.now() };
  W = genWorld(S.seed); setupRuntime();
  nodes.push({ x: 0, y: sy(0) + 5, p: -1, g: 0, d: 0 });
  tips.push(mkTip(0, Math.PI / 2 + .35, 0));
  infectCircle(0, 8, 80, true); revealCircle(0, 10, 170);
  setTimeout(() => toast('Seu fungo despertou sobre a folha. <b>Toque nele</b> para liberar esporos.'), 600);
  setTimeout(() => toast('<b>Toque no subsolo</b> para guiar as raízes até a água 💧'), 4200);
}
const mkTip = (n, a, g, tg = null) => ({ x: nodes[n].x, y: nodes[n].y, n, a, wa: a, g, acc: 0, tg, scan: 0, blk: 0 });

// ---------- infection & reveal ----------
const blobI = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(150,50,240,.4)'); gr.addColorStop(.5, 'rgba(110,35,200,.18)'); gr.addColorStop(1, 'rgba(80,20,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return c; })();
const blobR = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.55, 'rgba(0,0,0,.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return c; })();
function infectCell(i, j, silent) {
  if (i < 0 || j < 0 || i >= GC || j >= GR) return;
  const k = j * GC + i; if (inf[k]) return;
  inf[k] = 1; infList.push(k); ICg.drawImage(blobI, i * 4 + 2 - 9, j * 4 + 2 - 9, 18, 18);
  if (!silent) addXP(1);
}
function infectCircle(x, y, r, silent) {
  const i0 = Math.floor((x - r - X0) / CS), i1 = Math.floor((x + r - X0) / CS), j0 = Math.floor((y - r) / CS), j1 = Math.floor((y + r) / CS);
  for (let j = Math.max(0, j0); j <= Math.min(GR - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(GC - 1, i1); i++)
    if (!inf[j * GC + i] && hyp(X0 + i * CS + 12.5 - x, j * CS + 12.5 - y) < r) infectCell(i, j, silent);
}
function revealCell(i, j) { const k = j * GC + i; if (rev[k]) return; rev[k] = 1; RCg.globalCompositeOperation = 'destination-out'; RCg.drawImage(blobR, i * 4 + 2 - 10, j * 4 + 2 - 10, 20, 20); RCg.globalCompositeOperation = 'source-over'; }
function revealCircle(x, y, r) {
  const i0 = Math.floor((x - r - X0) / CS), i1 = Math.floor((x + r - X0) / CS), j0 = Math.floor((y - r) / CS), j1 = Math.floor((y + r) / CS);
  for (let j = Math.max(0, j0); j <= Math.min(GR - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(GC - 1, i1); i++)
    if (!rev[j * GC + i] && hyp(X0 + i * CS + 12.5 - x, j * CS + 12.5 - y) < r) revealCell(i, j);
}

// ---------- roots ----------
function addSegPath(n) { const p = nodes[n.p]; const b = paths[Math.min(NB - 1, n.g)]; b.moveTo(p.x, p.y); b.lineTo(n.x, n.y); }
function addHair(n) {
  if (hairN > 9000 || rnd() > .35) return; hairN++;
  let a = rnd() * TAU, x = n.x, y = n.y; hairPath.moveTo(x, y);
  for (let k = 0; k < 3; k++) { a += rnd() - .5; x += Math.cos(a) * 4; y += Math.sin(a) * 4; hairPath.lineTo(x, y); }
}
function addNode(t) {
  if (nodes.length >= MAXN) return false;
  const p = nodes[t.n], n = { x: t.x, y: t.y, p: t.n, g: t.g, d: p.d + SEG };
  nodes.push(n); t.n = nodes.length - 1; addSegPath(n); addHair(n);
  infectCircle(n.x, n.y, F.area()); revealCircle(n.x, n.y, F.range() * .6 + 30);
  if (n.y > S.st.depth) S.st.depth = n.y;
  if (tips.length < F.tips() && rnd() < .06) tips.push(mkTip(t.n, t.a + (rnd() < .5 ? -1 : 1) * (.6 + rnd() * .6), t.g + 1));
  for (const r of res) if (!r.tap && hyp(r.x - n.x, r.y - n.y) < r.r * (r.t === 'w' ? 1.4 : 1.1) + 7) tapRes(r, t);
  return true;
}
function tapRes(r, t) {
  r.tap = 1; r.node = t.n; S.st.taps++;
  if (t.tg && t.tg.res === r) t.tg = null;
  t.wa = t.a + Math.PI * (rnd() - .5) * 1.5;
  const lbl = { w: ['Água encontrada!', '#5fe0ff'], n: ['Nutrientes!', '#ffa64d'], f: ['Fóssil ancestral!', '#e86bff'] }[r.t];
  floatT(r.x, r.y - r.r - 10, lbl[0], lbl[1], 1.3); burst(r.x, r.y, 26, lbl[1], 90); shake(3);
  addXP(5 + r.y * .03);
  if (r.t === 'f') { const d = 1 + Math.floor(r.y / 400); addRes('dna', d); S.st.fos++; floatT(r.x, r.y - r.r - 26, '+' + d + ' DNA', '#e86bff', 1.2); }
}
function findTarget(t) {
  let best = null, bd = F.range();
  for (const r of res) {
    if (r.tap || (r.t !== 'w' && r.amt <= 0)) continue;
    const d = hyp(r.x - t.x, r.y - t.y); if (d >= bd) continue;
    if (tips.some(o => o !== t && o.tg && o.tg.res === r)) continue;
    bd = d; best = { x: r.x, y: r.y, res: r };
  }
  return best;
}
function growTips(dt) {
  const sp = F.speed() * dt, wc = F.eff(), dr = F.drill();
  for (let i = tips.length - 1; i >= 0; i--) {
    const t = tips[i];
    if (S.r.water <= 0 || nodes.length >= MAXN) { t.stall = 1; continue; }
    t.stall = 0;
    if (!t.tg) { t.scan -= dt; if (t.scan <= 0) { t.scan = .5; t.tg = findTarget(t); } }
    let da;
    if (t.tg) { da = Math.atan2(t.tg.y - t.y, t.tg.x - t.x); if (hyp(t.tg.x - t.x, t.tg.y - t.y) < 8) { t.tg = null; t.wa = t.a; } }
    else { t.wa += (rnd() - .5) * 3 * dt; da = t.wa; }
    t.a += angD(da, t.a) * Math.min(1, dt * 3.2) + (rnd() - .5) * 5 * dt;
    let step = sp, nx = t.x + Math.cos(t.a) * step, ny = t.y + Math.sin(t.a) * step;
    let blocked = false;
    for (const s of W.stones) {
      const dx = nx - s.x, dy = (ny - s.y) / .8;
      if (dx * dx + dy * dy < s.r * s.r) {
        if (!dr) {
          const out = Math.atan2(t.y - s.y, t.x - s.x), tan = out + Math.PI / 2 * (angD(t.a, out) > 0 ? 1 : -1);
          t.a = tan; if (!t.tg || !t.tg.man) t.wa = tan; blocked = true; t.blk += dt;
          if (t.blk > 2.5) { t.tg = null; t.blk = 0; t.wa = out; }
        } else { step *= dr; nx = t.x + Math.cos(t.a) * step; ny = t.y + Math.sin(t.a) * step; }
        break;
      }
    }
    if (blocked) continue;
    const top = sy(nx) + 10;
    if (ny < top) { ny = top; t.a = Math.PI / 2; t.wa = Math.PI / 2 + (rnd() - .5); }
    if (nx < X0 + 8 || nx > X1 - 8 || ny > DEP - 8) { const back = Math.atan2(DEP * .4 - t.y, -t.x * .5); t.a = back; t.wa = back; if (t.tg && t.tg.man) t.tg = null; continue; }
    t.x = nx; t.y = ny; t.acc += step;
    S.r.water = Math.max(0, S.r.water - step * wc);
    if (t.acc >= SEG) { t.acc = 0; if (!addNode(t)) t.stall = 1; }
  }
}
function directRoot(x, y) {
  let bi = 0, bd = 1e9;
  for (let i = 0; i < nodes.length; i++) { const d = hyp(nodes[i].x - x, nodes[i].y - y); if (d < bd) { bd = d; bi = i; } }
  const tg = { x, y, man: true };
  if (tips.length < F.tips()) tips.push(mkTip(bi, Math.atan2(y - nodes[bi].y, x - nodes[bi].x), nodes[bi].g + 1, tg));
  else {
    let bt = tips[0], btd = 1e9; for (const t of tips) { const d = hyp(t.x - x, t.y - y); if (d < btd) { btd = d; bt = t; } }
    bt.tg = tg; bt.blk = 0;
  }
  MK.push({ x, y, life: 1.2 });
}

// ---------- fungi ----------
function sprout(free) {
  if (mush.length >= MAXM) return false;
  const cols = []; for (let i = 0; i < GC; i++) if (inf[i] && Math.abs(X0 + i * CS + 12.5) > 30) cols.push(i);
  if (!cols.length) return false;
  if (!free) { const c = sproutCost(); if (S.r.spores < c) return false; S.r.spores -= c; S.st.bought++; }
  const c = cols[rnd() * cols.length | 0], x = X0 + c * CS + rnd() * CS;
  mush.push({ x, sz: .75 + rnd() * .5, hue: [280, 175, 95, 315][rnd() * 4 | 0], ph: rnd() * TAU, born: T, sp: 1 + rnd() * 2 });
  infectCircle(x, 8, F.area() + 6); burst(x, sy(x) - 10, 18, '#c58bff', 60); floatT(x, sy(x) - 30, 'Novo fungo!', '#d9a6ff');
  return true;
}
let sq = 1, sqv = 0, blink = 3, blinkT = 0;
function clickFungus(x, y) {
  S.st.clicks++; let v = clickPow(); sqv -= 9;
  let boom = rnd() < F.explo();
  if (boom) { v *= 8; shake(7); burst(x, y, 50, '#e8ff7a', 220); for (let k = 0; k < 3; k++) infectCell((x - X0) / CS + (rnd() * 12 - 6) | 0, rnd() * 2 | 0); floatT(x, y - 42, 'EXPLOSÃO!', '#fff27a', 1.4); }
  addRes('spores', v); floatT(x + (rnd() - .5) * 20, y - 24, '+' + fmt(v), '#c9ff6a', boom ? 1.5 : 1);
  burst(x, y, boom ? 0 : 10, '#b6ff3c', 70); pop('spores');
}

// ---------- resources / xp ----------
function addRes(k, v) { if (v <= 0) return; S.r[k] += v; gain[k] += v; addXP(v * XPW[k]); }
function addXP(x) {
  S.xp += x; S.score += x;
  while (S.xp >= need()) {
    S.xp -= need(); S.lvl++;
    const d = 1 + (S.lvl % 5 === 0 ? 2 : 0); S.r.dna += d;
    toast(`<b>NÍVEL ${S.lvl}!</b> A colônia evolui. +${d} DNA` + (UNLOCK[S.lvl] ? '<br>' + UNLOCK[S.lvl] : ''), 'big');
    shake(6); burst(0, sy(0) - 40, 60, '#e070ff', 200);
  }
}
const UNLOCK = { 2: '🔓 Brotamento Automático disponível', 3: '🔓 Aba de <b>Mutações</b> liberada!', 4: '🔓 Raízes Perfurantes e Absorção Acelerada', 5: '🔓 Fungos Gigantes', 6: '🔓 Infecção em Cadeia' };

// ---------- particles ----------
function part(x, y, vx, vy, life, sz, col, g = 0) { if (P.length > 700) P.splice(0, 50); P.push({ x, y, vx, vy, life, max: life, sz, col, g }); }
function burst(x, y, n, col, spd) { for (let i = 0; i < n; i++) { const a = rnd() * TAU, s = spd * (.3 + rnd() * .7); part(x, y, Math.cos(a) * s, Math.sin(a) * s, .6 + rnd() * .8, 2 + rnd() * 3, col, 40); } }
function floatT(x, y, s, col, sc = 1) { FT.push({ x, y, s, col, sc, life: 1.6 }); if (FT.length > 60) FT.shift(); }
let shk = { x: 0, y: 0, a: 0 };
function shake(a) { shk.a = Math.max(shk.a, a); }

// ---------- update ----------
let T = 0, sec = 0, saveT = 0, tipT = 0, autoT = 0, chainAcc = 0, pasT = 0, pasAcc = 0, sporeT = 0;
function update(dt) {
  T += dt;
  const sr = sporeRate() * dt; addRes('spores', sr); pasAcc += sr;
  addRes('water', baseWater() * dt); addRes('biomass', passiveBio() * dt);
  const ab = absorbAll(), par = F.parasite();
  for (const r of res) {
    if (!r.tap) continue;
    let a = 0;
    if (r.t === 'w') { r.amt = Math.min(r.cap, r.amt + r.cap * .005 * ab * dt); a = Math.min(r.amt, 2.5 * ab * (1 + (par - 1) * .5) * dt); r.amt -= a; addRes('water', a); }
    else if (r.amt > 0) { a = Math.min(r.amt, 1.2 * ab * dt); r.amt -= a; addRes('biomass', a * par); addRes('spores', a * .5 * par); a *= par; }
    r.acc += a; r.ft -= dt;
    if (r.ft <= 0) { r.ft = 1.5; if (r.acc > .05) floatT(r.x, r.y - r.r, '+' + fmt(r.acc), r.t === 'w' ? '#5fe0ff' : '#ffa64d', .8); r.acc = 0; }
    if (a > 0 && rnd() < dt * 8) { const n = nodes[r.node]; if (n) part(r.x + (rnd() - .5) * r.r, r.y + (rnd() - .5) * r.r * .6, (n.x - r.x) * 1.5, (n.y - r.y) * 1.5, .6, 2, r.t === 'w' ? '#7fe8ff' : '#ffc070'); }
  }
  growTips(dt);
  if (tips.length < F.tips() && nodes.length < MAXN) { tipT -= dt; if (tipT <= 0) { tipT = 3; const n = Math.floor(nodes.length * (1 - rnd() * rnd())) % nodes.length; tips.push(mkTip(n, Math.PI * (.15 + rnd() * .7), nodes[n].g + 1)); } }
  for (let i = 0; i < GC; i++) { const tgt = inf[i] ? 1 : 0; surf[i] += (tgt - surf[i]) * Math.min(1, dt * .5); }
  for (const p of W.plants) p.inf += ((surf[p.c] > .5 ? 1 : 0) - p.inf) * Math.min(1, dt * .25);
  const ar = L('area');
  for (const m of mush) {
    m.sp -= dt;
    if (m.sp <= 0) { m.sp = (3 + rnd() * 4) / (1 + ar * .35); const c = (m.x - X0) / CS | 0, o = Math.round((rnd() - .5) * 2 * (1.5 + ar * .4)); infectCell(c + o, 0); if (rnd() < .4) infectCell(c + o, 1); }
  }
  const ch = F.chain();
  if (ch && infList.length) { chainAcc += dt * ch * (2 + infList.length * .006); let g = 0; while (chainAcc >= 1 && g++ < 60) { chainAcc--; const k = infList[rnd() * infList.length | 0], d = [[1, 0], [-1, 0], [0, 1], [0, -1]][rnd() * 4 | 0]; infectCell(k % GC + d[0], (k / GC | 0) + d[1]); } }
  const au = F.auto(); if (au) { autoT += dt; if (autoT >= au) { autoT = 0; sprout(true); } }
  // spore ambience
  sporeT += dt * (3 + mush.length * .4);
  while (sporeT > 1) {
    sporeT--; const m = mush.length && rnd() < .7 ? mush[rnd() * mush.length | 0] : null, x = m ? m.x : (rnd() - .5) * 20, y = sy(x) - (m ? 22 * m.sz : 50);
    part(x, y, (rnd() - .5) * 14, -8 - rnd() * 14, 4 + rnd() * 4, 1.5 + rnd() * 2.5, rnd() < .5 ? '#b6ff3c' : '#c58bff', -2);
  }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.life -= dt; if (p.life <= 0) { P.splice(i, 1); continue; } p.vy += p.g * dt; p.vx *= .985; p.x += (p.vx + (p.g < 0 ? Math.sin(T * 2 + i) * 6 : 0)) * dt; p.y += p.vy * dt; }
  for (let i = FT.length - 1; i >= 0; i--) { FT[i].life -= dt; FT[i].y -= 22 * dt; if (FT[i].life <= 0) FT.splice(i, 1); }
  for (let i = MK.length - 1; i >= 0; i--) if ((MK[i].life -= dt) <= 0) MK.splice(i, 1);
  // flow particles along network
  const want = Math.min(160, 15 + res.filter(r => r.tap).length * 8 + nodes.length / 60 | 0);
  while (FP.length < want) FP.push(spawnFP());
  for (const f of FP) { f.f += dt * 70 / SEG; while (f.f >= 1) { f.f--; const n = nodes[f.n]; if (!n || n.p < 0) { Object.assign(f, spawnFP()); break; } f.n = n.p; } }
  sqv += (1 - sq) * 140 * dt; sqv *= Math.pow(.02, dt); sq += sqv * dt;
  blink -= dt; if (blink <= 0) { blinkT = .18; blink = 2 + rnd() * 5; } blinkT -= dt;
  shk.a *= Math.pow(.02, dt); shk.x = (rnd() - .5) * shk.a; shk.y = (rnd() - .5) * shk.a;
  pasT += dt; if (pasT > 2) { pasT = 0; if (pasAcc > .1) floatT((rnd() - .5) * 30, sy(0) - 70 * mainScale(), '+' + fmt(pasAcc), '#b6ff3c', .8); pasAcc = 0; }
  sec += dt; if (sec >= 1) { for (const k of RES) { rate[k] = lerp(rate[k], gain[k] / sec, .5); gain[k] = 0; } sec = 0; checkAch(); }
  saveT += dt; if (saveT > 10) { saveT = 0; save(); }
}
function spawnFP() {
  const tr = res.filter(r => r.tap && r.node >= 0 && (r.t === 'w' || r.amt > 0));
  if (tr.length && rnd() < .75) { const r = tr[rnd() * tr.length | 0]; return { n: r.node, f: 0, c: r.t === 'w' ? '#7fe8ff' : r.t === 'f' ? '#f08cff' : '#ffc070' }; }
  return { n: rnd() * nodes.length | 0, f: rnd(), c: '#d9a6ff' };
}

// ---------- rendering ----------
let vb = {};
const mainScale = () => (1.3 + Math.min(2.2, (S.lvl - 1) * .08)) * Math.pow(1.2, L('giant'));
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const z = cam.z, infP = infList.length / (GC * GR);
  drawSky(infP);
  ctx.setTransform(DPR * z, 0, 0, DPR * z, DPR * (SW / 2 - cam.x * z + shk.x), DPR * (SH / 2 - cam.y * z + shk.y));
  vb = { x0: cam.x - SW / 2 / z - 60, x1: cam.x + SW / 2 / z + 60, y0: cam.y - SH / 2 / z - 60, y1: cam.y + SH / 2 / z + 60 };
  drawBackdrop(infP);
  ctx.drawImage(soil, X0, SOY);
  drawRes(); drawStones();
  ctx.drawImage(RC, X0, 0, WW, GR * CS);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .55 + .2 * Math.sin(T * 1.6);
  ctx.drawImage(IC, X0, 0, WW, GR * CS);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  drawRoots(); drawSurface(); drawFungi(); drawParticles();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawTexts(); drawVignette();
}
function drawSky(infP) {
  const hy = SH / 2 - cam.y * cam.z;
  const g = ctx.createLinearGradient(0, hy - SH, 0, hy);
  g.addColorStop(0, '#04020a'); g.addColorStop(.65, '#130926'); g.addColorStop(1, `rgb(${50 + infP * 70 | 0},24,${62 + infP * 30 | 0})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, SW, Math.max(0, Math.min(SH, hy + 20)));
  if (hy <= 0) return;
  for (const s of W.stars) { const y = s.y * hy * .85; ctx.globalAlpha = .35 + .35 * Math.sin(T * 1.5 + s.p); ctx.fillStyle = '#e8dcff'; ctx.fillRect(s.x * SW, y, s.s, s.s); }
  ctx.globalAlpha = 1;
  const mx = SW * .8 - cam.x * cam.z * .03, my = hy - Math.min(260, hy * .6) - 40;
  glow(mx, my, 90, 'rgba(190,255,170,.25)'); ctx.fillStyle = '#e4f7d2'; ctx.beginPath(); ctx.arc(mx, my, 22, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(150,170,140,.35)'; ctx.beginPath(); ctx.arc(mx - 7, my - 4, 5, 0, TAU); ctx.arc(mx + 6, my + 7, 3.5, 0, TAU); ctx.fill();
}
function drawBackdrop(infP) {
  const hill = (p, base, amp, f, col) => {
    const off = cam.x * (1 - p); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(vb.x0, 30);
    for (let x = vb.x0; x <= vb.x1 + 12; x += 12) { const hx = x - off; ctx.lineTo(x, base - amp * (.55 + .45 * Math.sin(hx * f) * Math.sin(hx * f * .37 + 1.3))); }
    ctx.lineTo(vb.x1 + 12, 30); ctx.fill();
  };
  if (vb.y0 > 40) return;
  hill(.25, -40, 120, .004, mix([26, 14, 44], [40, 14, 52], infP));
  ctx.lineCap = 'round';
  for (const t of W.trees) {
    const x = t.x + cam.x * (1 - t.p); if (x < vb.x0 - 300 || x > vb.x1 + 300) continue;
    ctx.save(); ctx.translate(x, 25); ctx.strokeStyle = mix([18, 10, 28], [30, 12, 40], infP);
    [t.h * .05, t.h * .018, t.h * .007].forEach((w, i) => { ctx.lineWidth = w; ctx.stroke(t.b[i]); });
    ctx.restore();
  }
  hill(.5, -10, 50, .009, mix([16, 9, 24], [26, 10, 34], infP));
  const fg = ctx.createLinearGradient(0, -120, 0, 20); fg.addColorStop(0, 'rgba(120,60,160,0)'); fg.addColorStop(1, `rgba(${120 + infP * 60 | 0},60,170,${.12 + infP * .2})`);
  ctx.fillStyle = fg; ctx.fillRect(vb.x0, -120, vb.x1 - vb.x0, 140);
}
const inV = (x, y, m = 0) => x > vb.x0 - m && x < vb.x1 + m && y > vb.y0 - m && y < vb.y1 + m;
function drawRes() {
  for (const r of res) {
    if (!inV(r.x, r.y, 60)) continue;
    const k = r.amt / r.cap;
    if (r.t === 'w') {
      const s = .35 + .65 * Math.sqrt(k), rx = r.r * 1.5 * s, ry = r.r * .8 * s;
      ctx.globalCompositeOperation = 'lighter'; glow(r.x, r.y, rx * 2.2, 'rgba(40,170,255,.35)', r.tap ? .8 + .2 * Math.sin(T * 3) : .6); ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createRadialGradient(r.x - rx * .3, r.y - ry * .4, 1, r.x, r.y, rx);
      g.addColorStop(0, '#b8ffff'); g.addColorStop(.4, '#2aa8e8'); g.addColorStop(1, 'rgba(8,40,100,.95)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(r.x, r.y, rx, ry, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(210,255,255,.35)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); for (let x = -rx; x <= rx; x += 4) ctx.lineTo(r.x + x, r.y - ry * .5 + i * ry * .45 + Math.sin(x * .2 + T * 2.2 + i * 2 + r.ph) * 2.2); ctx.stroke(); }
      ctx.fillStyle = 'rgba(220,255,255,.6)';
      for (let i = 0; i < 4; i++) { const ph = (T * .4 + i * .25 + r.ph) % 1; ctx.beginPath(); ctx.arc(r.x + Math.sin(i * 7 + r.ph) * rx * .6, r.y + ry - ph * ry * 2, 1.2, 0, TAU); ctx.fill(); }
      ctx.restore();
    } else {
      const dep = r.amt <= 0, a = dep ? .25 : 1, f = r.t === 'f';
      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = 'lighter'; glow(r.x, r.y, r.r * 3.2, f ? 'rgba(230,100,255,.5)' : 'rgba(255,160,60,.45)', dep ? .2 : .7 + .3 * Math.sin(T * 2.5 + r.ph)); ctx.globalCompositeOperation = 'source-over';
      if (f) {
        ctx.strokeStyle = '#efe3c8'; ctx.lineWidth = 2.2; ctx.beginPath();
        for (let q = 0; q < 26; q++) { const an = q * .5 + r.ph, rr = r.r * (q / 26); ctx.lineTo(r.x + Math.cos(an) * rr, r.y + Math.sin(an) * rr * .85); }
        ctx.stroke(); ctx.strokeStyle = 'rgba(232,107,255,.8)'; ctx.lineWidth = .8; ctx.stroke();
      } else {
        const sz = .45 + .55 * Math.pow(Math.max(0, k), .4);
        for (let q = 0; q < 5; q++) {
          const an = r.ph + q * 1.26, ox = Math.cos(an) * r.r * .55, oy = Math.sin(an) * r.r * .45, rad = r.r * (.28 + (q % 3) * .1) * sz;
          const g = ctx.createRadialGradient(r.x + ox - rad * .3, r.y + oy - rad * .3, 0, r.x + ox, r.y + oy, rad);
          g.addColorStop(0, '#fff3c0'); g.addColorStop(.5, q % 2 ? '#ffa13c' : '#d8ff5a'); g.addColorStop(1, '#5a2a08');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(r.x + ox, r.y + oy, rad, 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  }
}
function drawStones() {
  for (const s of W.stones) {
    if (!inV(s.x, s.y, s.r + 10)) continue;
    ctx.fillStyle = s.g; ctx.fill(s.path);
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.5; ctx.stroke(s.path);
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.ellipse(s.x - s.r * .25, s.y - s.r * .35, s.r * .45, s.r * .18, -.3, 0, TAU); ctx.fill();
  }
}
function drawRoots() {
  const z = cam.z, pulse = .5 + .5 * Math.sin(T * 2.2);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(200,160,255,.22)'; ctx.lineWidth = Math.max(.4, .7 / z); ctx.stroke(hairPath);
  ctx.globalCompositeOperation = 'lighter';
  for (let b = 0; b < NB; b++) { ctx.strokeStyle = `rgba(150,60,255,${.1 + .07 * pulse})`; ctx.lineWidth = Math.max(genW(b) * 3.4, 3 / z); ctx.stroke(paths[b]); }
  ctx.globalCompositeOperation = 'source-over';
  for (let b = 0; b < NB; b++) {
    ctx.strokeStyle = '#3a1a55'; ctx.lineWidth = Math.max(genW(b) * 1.35, 1.4 / z); ctx.stroke(paths[b]);
    ctx.strokeStyle = b < 2 ? '#d9b8ff' : '#b88ae8'; ctx.lineWidth = Math.max(genW(b) * .75, .9 / z); ctx.stroke(paths[b]);
  }
  for (const t of tips) {
    const n = nodes[t.n]; ctx.strokeStyle = '#d9b8ff'; ctx.lineWidth = Math.max(genW(t.g) * .75, .9 / z);
    ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(t.x, t.y); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const t of tips) glow(t.x, t.y, 9 + 3 * Math.sin(T * 6 + t.n), t.stall ? 'rgba(255,80,80,.7)' : 'rgba(210,140,255,.9)');
  for (const f of FP) {
    const n = nodes[f.n], p = n && nodes[n.p]; if (!p) continue;
    const x = lerp(n.x, p.x, f.f), y = lerp(n.y, p.y, f.f); if (!inV(x, y)) continue;
    glow(x, y, 4.5, f.c, .9);
  }
  for (const m of MK) { const k = 1 - m.life / 1.2; ctx.strokeStyle = `rgba(200,255,120,${1 - k})`; ctx.lineWidth = 1.5 / z; ctx.beginPath(); ctx.arc(m.x, m.y, 6 + k * 22, 0, TAU); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';
}
const GH = [79, 125, 54], GI = [150, 66, 210], GCOL = [0, 1, 2, 3, 4].map(q => mix(GH, GI, q / 4));
function drawSurface() {
  if (vb.y0 > 40) return;
  for (const l of W.leaves) {
    if (l.x < vb.x0 || l.x > vb.x1) continue; const q = surf[l.c];
    ctx.fillStyle = mix([[150, 80, 30], [120, 60, 20], [170, 110, 40]][l.h * 3 / 40 | 0] || [150, 80, 30], [70, 30, 90], q);
    ctx.beginPath(); ctx.ellipse(l.x, sy(l.x) + 1, l.s, l.s * .3, l.a, 0, TAU); ctx.fill();
  }
  const bk = [[], [], [], [], []];
  for (const g of W.grass) if (g.x > vb.x0 && g.x < vb.x1) bk[Math.round(surf[g.c] * 4)].push(g);
  ctx.lineCap = 'round';
  bk.forEach((arr, q) => {
    if (!arr.length) return;
    ctx.strokeStyle = GCOL[q]; ctx.lineWidth = 1.3; ctx.beginPath();
    const droop = q * .12;
    for (const g of arr) {
      const by = sy(g.x) + 2, sw = Math.sin(T * 1.6 + g.x * .02 + g.ph * .3) * 2.2 * (g.h / 12);
      const tx = g.x + g.l * g.h + sw + droop * g.h * (g.l > 0 ? 1 : -1), ty = by - g.h * (1 - droop);
      ctx.moveTo(g.x, by); ctx.quadraticCurveTo(g.x + g.l * g.h * .3, by - g.h * .6, tx, ty);
    }
    ctx.stroke();
  });
  for (const p of W.plants) if (p.x > vb.x0 - 40 && p.x < vb.x1 + 40) drawPlant(p);
}
function drawPlant(p) {
  const x = p.x, y = sy(x) + 1, s = p.s, q = p.inf, sw = Math.sin(T * 1.3 + p.ph) * .06 * (1 - q * .5);
  const green = mix([72, 130, 52], [118, 50, 160], q), dark = mix([40, 80, 34], [60, 24, 80], q);
  ctx.save(); ctx.translate(x, y); ctx.rotate(sw); ctx.lineCap = 'round';
  if (p.t === 0) { // fern
    ctx.strokeStyle = green; ctx.lineWidth = 1.2;
    for (let f = -2; f <= 2; f++) {
      const a = -Math.PI / 2 + f * .38, len = (26 - Math.abs(f) * 4) * s * (1 - q * .2);
      ctx.beginPath(); ctx.moveTo(0, 0); const ex = Math.cos(a) * len, ey = Math.sin(a) * len + q * len * .4; ctx.quadraticCurveTo(ex * .5, ey * .7 - 4, ex, ey); ctx.stroke();
      for (let k = 1; k < 6; k++) { const t = k / 6, px = ex * t, py = ey * t - 4 * t * (1 - t) * 4; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 4 * s * (1 - t), py - 2); ctx.moveTo(px, py); ctx.lineTo(px + 4 * s * (1 - t), py - 2); ctx.stroke(); }
    }
  } else if (p.t === 1) { // flower
    const h = 22 * s * (1 - q * .3); ctx.strokeStyle = green; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(4, -h * .5, q * 6, -h); ctx.stroke();
    ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(3, -h * .4, 5 * s, 2 * s, -.5, 0, TAU); ctx.fill();
    ctx.fillStyle = q > .5 ? mix([90, 30, 120], [40, 10, 60], q) : `hsl(${p.h},70%,${62 - q * 30}%)`;
    for (let k = 0; k < 5; k++) { const a = k * TAU / 5 + T * .1; ctx.beginPath(); ctx.ellipse(q * 6 + Math.cos(a) * 4 * s, -h + Math.sin(a) * 4 * s + q * 3, 3.2 * s, 2 * s, a, 0, TAU); ctx.fill(); }
    ctx.fillStyle = q > .3 ? '#c9ff6a' : '#ffe27a'; ctx.beginPath(); ctx.arc(q * 6, -h, 2 * s, 0, TAU); ctx.fill();
  } else if (p.t === 2) { // bush
    for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? green : dark; ctx.beginPath(); ctx.arc((k - 2.5) * 5 * s, -6 * s - Math.sin(k * 1.7) * 5 * s, 7 * s * (1 - q * .15), 0, TAU); ctx.fill(); }
  } else if (p.t === 3) { // tall tuft
    ctx.strokeStyle = green; ctx.lineWidth = 1.6;
    for (let k = -3; k <= 3; k++) { const h = (30 - Math.abs(k) * 4) * s; ctx.beginPath(); ctx.moveTo(k, 0); ctx.quadraticCurveTo(k * 2, -h * .6, k * 4 + q * k * 3, -h * (1 - q * .35)); ctx.stroke(); }
  } else { // log
    ctx.fillStyle = mix([92, 60, 36], [70, 34, 80], q); ctx.beginPath(); ctx.ellipse(0, -4 * s, 18 * s, 5 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = mix([150, 110, 70], [120, 70, 150], q); ctx.beginPath(); ctx.ellipse(17 * s, -4 * s, 2.5 * s, 4.5 * s, 0, 0, TAU); ctx.fill();
  }
  if (q > .3) { ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 4; k++) glow(Math.sin(p.ph + k * 2) * 9 * s, -4 - (k * 5 + 3) * s, (2.5 + Math.sin(T * 3 + k) * .8) * s * 1.6, 'rgba(190,255,90,.9)', q); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
}
function shroom(x, y, sc, hue, ph, sqz, main) {
  const h = 30 * sc * sqz, cr = 14 * sc * (2 - sqz), sway = Math.sin(T * 1.2 + ph) * .07;
  const tx = x + sway * h, ty = y - h;
  ctx.globalCompositeOperation = 'lighter'; glow(tx, ty - cr * .3, cr * (main ? 4 : 2.8), `hsla(${hue},90%,55%,${main ? .35 : .22})`, .8 + .2 * Math.sin(T * 2 + ph)); ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.strokeStyle = `hsl(${hue},18%,${main ? 70 : 62}%)`; ctx.lineWidth = cr * .42;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - sway * h * .4 + cr * .15, y - h * .5, tx, ty); ctx.stroke();
  ctx.strokeStyle = `hsla(${hue},40%,30%,.6)`; ctx.lineWidth = cr * .07;
  ctx.beginPath(); ctx.moveTo(x - cr * .08, y); ctx.quadraticCurveTo(x - sway * h * .4 + cr * .05, y - h * .5, tx - cr * .05, ty); ctx.stroke();
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(sway * .8);
  ctx.fillStyle = `hsl(${hue},25%,55%)`; ctx.beginPath(); ctx.ellipse(0, h * .35, cr * .32, cr * .09, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = `hsl(${hue},45%,9%)`; ctx.beginPath(); ctx.ellipse(0, 0, cr * .95, cr * .2, 0, 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(-cr * .2, -cr * .7, cr * .05, 0, -cr * .2, cr * 1.2);
  g.addColorStop(0, `hsl(${hue},85%,66%)`); g.addColorStop(.5, `hsl(${hue},70%,34%)`); g.addColorStop(1, `hsl(${hue + 25},60%,12%)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-cr, 0); ctx.bezierCurveTo(-cr * 1.05, -cr * 1.3, cr * 1.05, -cr * 1.3, cr, 0);
  for (let k = 5; k >= 0; k--) ctx.quadraticCurveTo(-cr + (k + .5) * cr / 3, cr * .16, -cr + k * cr / 3, 0);
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  const n = main ? 7 : 4;
  for (let k = 0; k < n; k++) {
    const u = -.75 + 1.5 * k / (n - 1) + Math.sin(ph + k * 3) * .08, px = u * cr * .8, py = -cr * (.18 + .62 * (1 - u * u)) * (.7 + .3 * Math.abs(Math.sin(ph * 3 + k)));
    glow(px, py, cr * (main ? .2 : .26), 'rgba(190,255,90,.95)', .6 + .4 * Math.sin(T * 3 + k + ph));
  }
  if (main) {
    const op = blinkT > 0 ? .1 : 1, ex = 0, ey = -cr * .5;
    glow(ex, ey, cr * .7, 'rgba(255,230,80,.6)', .7);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffe75a'; ctx.beginPath(); ctx.ellipse(ex, ey, cr * .26, cr * .14 * op, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#120318'; ctx.beginPath(); ctx.ellipse(ex + Math.sin(T * .7) * cr * .06, ey, cr * .04, cr * .12 * op, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `hsla(${hue},80%,65%,.55)`; ctx.lineWidth = cr * .05;
    for (let k = 0; k < 7; k++) {
      const bx = -cr * .85 + k * cr * .28, len = cr * (.45 + .4 * Math.abs(Math.sin(k * 2.3 + ph)));
      ctx.beginPath(); ctx.moveTo(bx, cr * .1);
      ctx.quadraticCurveTo(bx + Math.sin(T * 2 + k) * cr * .15, cr * .1 + len * .5, bx + Math.sin(T * 1.6 + k) * cr * .1, cr * .1 + len); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter'; glow(bx + Math.sin(T * 1.6 + k) * cr * .1, cr * .1 + len, cr * .1, 'rgba(210,140,255,.9)'); ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}
function drawFungi() {
  if (vb.y0 > 60) return;
  const y0 = sy(0) + 1;
  // fallen leaf
  ctx.save(); ctx.translate(0, y0); ctx.rotate(-.04);
  const lg = ctx.createLinearGradient(-50, 0, 50, 0); lg.addColorStop(0, '#5a3214'); lg.addColorStop(.5, '#8a5222'); lg.addColorStop(1, '#4a2810');
  ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(-52, 0); ctx.quadraticCurveTo(-10, -16, 50, -2); ctx.quadraticCurveTo(10, 8, -52, 0); ctx.fill();
  ctx.strokeStyle = `rgba(${200 - S.lvl * 3},${120},${255},${Math.min(.9, .3 + S.lvl * .04)})`; ctx.lineWidth = .8;
  ctx.beginPath(); ctx.moveTo(-50, 0); ctx.quadraticCurveTo(0, -6, 50, -2); for (let k = -4; k <= 4; k++) { ctx.moveTo(k * 10, -4 + Math.abs(k) * .3); ctx.lineTo(k * 10 + 8, -10 + Math.abs(k)); ctx.moveTo(k * 10, -3); ctx.lineTo(k * 10 + 7, 3); } ctx.stroke();
  ctx.restore();
  for (const m of mush) {
    if (m.x < vb.x0 - 40 || m.x > vb.x1 + 40) continue;
    let g = clamp((T - m.born) / 2.5, 0, 1); g = 1 + 2.7 * Math.pow(g - 1, 3) + 1.7 * Math.pow(g - 1, 2);
    shroom(m.x, sy(m.x) + 1, m.sz * Math.pow(1.25, L('giant')) * g * .7, m.hue, m.ph, 1, false);
  }
  shroom(0, y0 - 5, mainScale(), 285, 0, clamp(sq, .6, 1.4), true);
}
function drawParticles() {
  ctx.globalCompositeOperation = 'lighter';
  for (const p of P) { if (!inV(p.x, p.y)) continue; glow(p.x, p.y, p.sz * 2, p.col, Math.min(1, p.life / p.max * 2)); }
  ctx.globalCompositeOperation = 'source-over';
}
function drawTexts() {
  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  for (const f of FT) {
    const s = toScreen(f.x, f.y); ctx.globalAlpha = Math.min(1, f.life * 1.5);
    ctx.font = `800 ${14 * f.sc | 0}px system-ui,sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,0,20,.85)';
    ctx.strokeText(f.s, s.x, s.y); ctx.fillStyle = f.col; ctx.fillText(f.s, s.x, s.y);
  }
  ctx.globalAlpha = 1;
}
function drawVignette() {
  const g = ctx.createRadialGradient(SW / 2, SH / 2, Math.min(SW, SH) * .35, SW / 2, SH / 2, Math.max(SW, SH) * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(4,0,10,.6)'); ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
}

// ---------- input ----------
const ptrs = new Map(); let drag = null, pinch = null;
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
  else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: hyp(a.x - b.x, a.y - b.y), z: cam.z }; drag = null; }
});
cv.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.z * hyp(a.x - b.x, a.y - b.y) / pinch.d / cam.z); }
  else if (drag) {
    if (hyp(e.clientX - drag.sx, e.clientY - drag.sy) > 7) drag.moved = true;
    if (drag.moved) { cam.x -= (e.clientX - drag.x) / cam.z; cam.y -= (e.clientY - drag.y) / cam.z; clampCam(); }
    drag.x = e.clientX; drag.y = e.clientY;
  }
});
const up = e => { ptrs.delete(e.pointerId); if (drag && !drag.moved && e.type === 'pointerup') tap(e.clientX, e.clientY); drag = null; if (ptrs.size < 2) pinch = null; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * .0015)); }, { passive: false });
function zoomAt(sx, sy_, f) { const a = toWorld(sx, sy_); cam.z = clamp(cam.z * f, zMin(), 4); const b = toWorld(sx, sy_); cam.x += a.x - b.x; cam.y += a.y - b.y; clampCam(); }
function tap(sx, sy_) {
  const w = toWorld(sx, sy_), ms = mainScale(), fy = sy(0) - 30 * ms;
  if (hyp(w.x, w.y - fy) < Math.max(22 * ms, 34 / cam.z)) return clickFungus(0, fy);
  for (const m of mush) { const my = sy(m.x) - 20 * m.sz; if (hyp(w.x - m.x, w.y - my) < Math.max(12 * m.sz, 16 / cam.z)) { S.st.clicks++; const v = clickPow() * .4; addRes('spores', v); floatT(m.x, my - 14, '+' + fmt(v), '#c9ff6a', .8); burst(m.x, my, 6, '#b6ff3c', 50); return; } }
  if (w.y > sy(w.x) + 6 && w.y < DEP && w.x > X0 && w.x < X1) directRoot(w.x, w.y);
}

// ---------- upgrades ----------
const UP = [
  { id: 'speed', tab: 0, n: 'Crescimento Acelerado', d: 'Raízes crescem mais rápido.', c: 'biomass', b: 6, m: 1.6, max: 25, fx: l => fmt(F.speed(l)) + ' u/s' },
  { id: 'tips', tab: 0, n: 'Ramificação', d: 'Mais pontas de raiz crescendo ao mesmo tempo.', c: 'biomass', b: 15, m: 2.1, max: 12, fx: l => F.tips(l) + ' pontas' },
  { id: 'range', tab: 0, n: 'Quimiotropismo', d: 'Detecta água e nutrientes mais distantes e revela mais solo.', c: 'water', b: 20, m: 1.75, max: 12, fx: l => F.range(l) + ' de alcance' },
  { id: 'absorb', tab: 0, n: 'Absorção Capilar', d: 'Suga recursos conectados mais rápido.', c: 'water', b: 30, m: 1.7, max: 25, fx: l => 'x' + F.absorb(l).toFixed(1) },
  { id: 'eff', tab: 0, n: 'Hifas Eficientes', d: 'Crescer consome menos água.', c: 'biomass', b: 35, m: 1.85, max: 10, fx: l => F.eff(l).toFixed(3) + ' água/u' },
  { id: 'drill', tab: 0, n: 'Raízes Perfurantes', d: 'Atravessa pedras em vez de contorná-las.', c: 'biomass', b: 150, m: 4, max: 3, req: 4, fx: l => l ? Math.round(F.drill(l) * 100) + '% de velocidade' : 'bloqueado' },
  { id: 'spore', tab: 1, n: 'Esporulação', d: 'Todos os fungos produzem mais esporos.', c: 'spores', b: 20, m: 1.75, max: 30, fx: l => 'x' + F.spore(l).toFixed(1) },
  { id: 'click', tab: 1, n: 'Pulso Virulento', d: 'Cada toque nos fungos rende mais esporos.', c: 'spores', b: 12, m: 2.4, max: 15, fx: l => 'x' + F.click(l) },
  { id: 'area', tab: 1, n: 'Nuvem de Contágio', d: 'Aumenta o raio e a velocidade da contaminação.', c: 'spores', b: 50, m: 2, max: 12, fx: l => 'raio ' + F.area(l) },
  { id: 'decomp', tab: 1, n: 'Decomposição', d: 'Matéria orgânica infectada gera mais biomassa.', c: 'spores', b: 35, m: 1.9, max: 25, fx: l => 'x' + F.decomp(l).toFixed(1) },
  { id: 'auto', tab: 1, n: 'Brotamento Automático', d: 'Novos fungos brotam sozinhos no solo infectado.', c: 'spores', b: 120, m: 2.3, max: 10, req: 2, fx: l => l ? 'a cada ' + F.auto(l).toFixed(0) + 's' : 'desligado' },
  { id: 'explo', tab: 2, n: 'Esporos Explosivos', d: 'Toques podem explodir: x8 esporos e infectam a superfície.', c: 'dna', b: 1, m: 2, max: 6, req: 3, fx: l => Math.round(F.explo(l) * 100) + '% de chance' },
  { id: 'parasite', tab: 2, n: 'Raízes Parasitas', d: 'Nutrientes rendem muito mais e a água flui melhor.', c: 'dna', b: 2, m: 2.4, max: 5, req: 3, fx: l => 'x' + F.parasite(l) },
  { id: 'giant', tab: 2, n: 'Fungos Gigantes', d: 'Fungos maiores com o dobro de produção de esporos.', c: 'dna', b: 3, m: 2.8, max: 5, req: 5, fx: l => 'x' + F.giant(l) },
  { id: 'accel', tab: 2, n: 'Absorção Acelerada', d: 'Multiplica toda absorção subterrânea.', c: 'dna', b: 2, m: 2.2, max: 6, req: 4, fx: l => 'x' + F.accel(l).toFixed(2) },
  { id: 'chain', tab: 2, n: 'Infecção em Cadeia', d: 'O território infectado contamina as áreas vizinhas sozinho.', c: 'dna', b: 4, m: 2.5, max: 6, req: 6, fx: l => l ? 'nível ' + l : 'inativo' },
];
const cost = u => Math.ceil(u.b * Math.pow(u.m, L(u.id)));
const locked = u => S.lvl < (u.req || 0);
function buy(u) {
  const c = cost(u); if (locked(u) || L(u.id) >= u.max || S.r[u.c] < c) return;
  S.r[u.c] -= c; S.up[u.id] = L(u.id) + 1; if (u.tab === 2) S.st.muts++;
  if (u.id === 'tips') tipT = 0;
  toast(`<b>${u.n}</b> → nível ${L(u.id)}`); burst(0, sy(0) - 40, 30, u.tab === 2 ? '#e86bff' : '#b6ff3c', 150); shake(2);
  updShop();
}
const ACH = [
  ['tap1', 'Primeiro Gole', 'Conecte uma raiz a um recurso', () => [S.st.taps, 1], 0, 15],
  ['mush1', 'Brotamento', 'Brote seu primeiro fungo', () => [mush.length, 1], 0, 20],
  ['lv3', 'Mutante em Potencial', 'Alcance o nível 3', () => [S.lvl, 3], 1, 0],
  ['inf5', 'Contágio', 'Infecte 5% do território', () => [infP() * 100, 5], 1, 0],
  ['tap5', 'Rede Nutritiva', 'Conecte 5 recursos', () => [S.st.taps, 5], 1, 0],
  ['mush10', 'Colônia', 'Tenha 10 fungos', () => [mush.length, 10], 1, 0],
  ['depth', 'Rede Profunda', 'Alcance 500 de profundidade', () => [S.st.depth, 500], 2, 0],
  ['mut', 'Primeira Mutação', 'Compre uma mutação', () => [S.st.muts, 1], 1, 0],
  ['inf20', 'Epidemia', 'Infecte 20% do território', () => [infP() * 100, 20], 2, 0],
  ['fos', 'Arqueólogo', 'Encontre um fóssil ancestral', () => [S.st.fos, 1], 2, 0],
  ['lv10', 'Evoluído', 'Alcance o nível 10', () => [S.lvl, 10], 3, 0],
  ['mush40', 'Enxame', 'Tenha 40 fungos', () => [mush.length, 40], 3, 0],
  ['tap20', 'Sistema Vascular', 'Conecte 20 recursos', () => [S.st.taps, 20], 3, 0],
  ['deep', 'Abismo', 'Alcance 1200 de profundidade', () => [S.st.depth, 1200], 4, 0],
  ['inf50', 'Pandemia', 'Infecte 50% do território', () => [infP() * 100, 50], 5, 0],
  ['mush100', 'Praga Ancestral', 'Tenha 100 fungos', () => [mush.length, 100], 5, 0],
  ['lv20', 'Ser Ancestral', 'Alcance o nível 20', () => [S.lvl, 20], 6, 0],
  ['inf95', 'Domínio Total', 'Infecte 95% do território', () => [infP() * 100, 95], 10, 0],
];
const infP = () => infList.length / (GC * GR);
function checkAch() {
  for (const [id, n, , p, dna, sp] of ACH) {
    if (S.ach[id]) continue; const [c, g] = p(); if (c < g) continue;
    S.ach[id] = 1; if (dna) S.r.dna += dna; if (sp) S.r.spores += sp;
    toast(`🏆 Conquista: <b>${n}</b>` + (dna ? ` +${dna} DNA` : '') + (sp ? ` +${sp} esporos` : ''), 'big');
  }
}

// ---------- UI ----------
const ui = {}; RES.forEach(k => { const el = $('#r-' + k); ui[k] = { el, v: el.querySelector('b'), r: el.querySelector('small') }; });
const ICN = k => `<i class="ic ${k}"></i>`;
let tab = 0, shopOpen = false, cards = [];
function toast(h, cls = '') { const d = document.createElement('div'); d.className = 'toast ' + cls; d.innerHTML = h; $('#toasts').appendChild(d); setTimeout(() => d.remove(), 3400); const all = $('#toasts').children; if (all.length > 5) all[0].remove(); }
function pop(k) { const e = ui[k].el; e.classList.add('pop'); setTimeout(() => e.classList.remove('pop'), 120); }
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { tab = +b.dataset.t; document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b)); buildShop(); });
$('#shopBtn').onclick = () => { shopOpen = !shopOpen; $('#shop').classList.toggle('hidden', !shopOpen); if (shopOpen) buildShop(); };
$('#closeShop').onclick = () => { shopOpen = false; $('#shop').classList.add('hidden'); };
$('#sprout').onclick = () => { if (!sprout(false)) toast(mush.length >= MAXM ? 'Limite de fungos atingido.' : 'Esporos insuficientes ou sem solo infectado na superfície.'); };
function buildShop() {
  const list = $('#list'); list.innerHTML = ''; cards = [];
  if (tab < 3) {
    if (tab === 2 && S.lvl < 3) { list.innerHTML = '<div class="opt">🔒 Mutações são liberadas no <b>nível 3</b>. Use DNA (ganho ao subir de nível, fósseis e conquistas).</div>'; return; }
    for (const u of UP.filter(u => u.tab === tab)) {
      const c = document.createElement('div'); c.className = 'card';
      c.innerHTML = `<h4>${u.n}<span></span></h4><p>${u.d}</p><p class="fx"></p><button></button>`;
      c.querySelector('button').onclick = () => buy(u); list.appendChild(c);
      cards.push({ u, c, lv: c.querySelector('h4 span'), fx: c.querySelector('.fx'), b: c.querySelector('button') });
    }
  } else if (tab === 3) {
    for (const [id, n, d, p, dna, sp] of ACH) {
      const [cu, g] = p(), done = S.ach[id];
      const c = document.createElement('div'); c.className = 'card ach' + (done ? ' done' : '');
      c.innerHTML = `<div class="m">${done ? '🏆' : '🔒'}</div><h4>${n}</h4><p>${d} — ${done ? 'concluída' : fmt(Math.min(cu, g)) + '/' + g} · recompensa: ${dna ? dna + ' DNA' : sp + ' esporos'}</p>`;
      list.appendChild(c);
    }
  } else {
    list.innerHTML = `<div class="opt"><p>O jogo salva automaticamente a cada 10s e ao sair. Produção continua offline (até 8h).</p>
      <p>🖱️ Arraste para mover · Roda/pinça para zoom · Toque no fungo para esporos · Toque no subsolo para guiar raízes.</p>
      <button id="saveNow">💾 Salvar agora</button><button id="resetG" class="danger">☠ Reiniciar infecção</button></div>`;
    $('#saveNow').onclick = () => { save(); toast('Jogo salvo.'); };
    $('#resetG').onclick = () => { if (confirm('Apagar todo o progresso?')) { localStorage.removeItem(KEY); location.reload(); } };
  }
  updShop();
}
function updShop() {
  for (const k of cards) {
    const u = k.u, l = L(u.id), mx = l >= u.max, lk = locked(u), c = cost(u);
    k.lv.textContent = `Nv ${l}/${u.max}`; k.fx.textContent = mx ? u.fx(l) : u.fx(l) + ' → ' + u.fx(l + 1);
    k.b.innerHTML = lk ? `🔒 Nível ${u.req}` : mx ? 'MÁX' : fmt(c) + ' ' + ICN(u.c);
    k.b.disabled = lk || mx || S.r[u.c] < c; k.c.classList.toggle('locked', lk);
  }
}
const affordable = t => UP.some(u => u.tab === t && !locked(u) && L(u.id) < u.max && S.r[u.c] >= cost(u) && (t < 2 || S.lvl >= 3));
let hudT = 0;
function hud(dt) {
  hudT += dt; if (hudT < .1) return; hudT = 0;
  for (const k of RES) { ui[k].v.textContent = fmt(S.r[k]); if (k !== 'dna') ui[k].r.textContent = '+' + fmt(rate[k]) + '/s'; }
  $('#lv').textContent = S.lvl; const nd = need();
  $('#xpf').style.width = (S.xp / nd * 100).toFixed(1) + '%'; $('#xpt').textContent = `${fmt(S.xp)} / ${fmt(nd)} XP`;
  const ip = infP() * 100; $('#infp').textContent = ip.toFixed(ip < 10 ? 1 : 0) + '%'; $('#inff').style.width = ip + '%';
  $('#score').textContent = fmt(S.score);
  const sc = sproutCost(), sb = $('#sprout');
  $('#sproutCost').innerHTML = mush.length >= MAXM ? 'Máximo' : fmt(sc) + ' ' + ICN('spores') + ` · ${mush.length} fungos`;
  sb.disabled = mush.length >= MAXM || S.r.spores < sc;
  let any = false; document.querySelectorAll('.tabs em').forEach((e, i) => { const a = affordable(i); e.classList.toggle('on', a); any = any || a; });
  $('#shopBtn').classList.toggle('glow', any && !shopOpen);
  const g = ACH.find(a => !S.ach[a[0]]);
  if (g) { const [c, t] = g[3](); $('#goal').innerHTML = `🎯 <b>${g[1]}</b> — ${g[2]} <small>(${fmt(Math.min(c, t))}/${t})</small><div class="bar"><div style="width:${Math.min(100, c / t * 100)}%"></div></div>`; }
  else $('#goal').innerHTML = '👑 <b>A infecção é absoluta.</b> Continue evoluindo!';
  const h = $('#hint'), stall = tips.length && tips.every(t => t.stall);
  if (nodes.length >= MAXN) { h.className = ''; h.textContent = 'A rede de micélio atingiu seu tamanho máximo.'; }
  else if (stall) { h.className = 'warn'; h.textContent = '💧 Sem água! As raízes pararam — conecte-as a reservas de água.'; }
  else if (T < 40 && S.st.taps < 2) { h.className = ''; h.textContent = 'Toque no subsolo para guiar raízes · Toque no fungo para esporos · Arraste/zoom para explorar'; }
  else h.textContent = '';
  if (shopOpen) updShop();
}

// ---------- save / load / offline ----------
const bits = a => { let s = ''; for (let i = 0; i < a.length; i += 6) { let v = 0; for (let k = 0; k < 6; k++) v |= (a[i + k] || 0) << k; s += String.fromCharCode(48 + v); } return s; };
const unbits = (s, a) => { for (let i = 0; i < s.length; i++) { const v = s.charCodeAt(i) - 48; for (let k = 0; k < 6; k++) if (i * 6 + k < a.length) a[i * 6 + k] = (v >> k) & 1; } };
function save() {
  S.t = Date.now();
  const n = []; for (const o of nodes) n.push(Math.round(o.x), Math.round(o.y), o.p, o.g);
  try {
    localStorage.setItem(KEY, JSON.stringify({
      S, n, tips: tips.map(t => [t.n, +t.a.toFixed(2), t.g]), inf: bits(inf), rev: bits(rev),
      res: res.map(r => [+r.amt.toFixed(1), r.tap, r.node]), mush: mush.map(m => [Math.round(m.x), +m.sz.toFixed(2), m.hue]),
      surf: Array.from(surf, v => +v.toFixed(2)), pl: W.plants.map(p => +p.inf.toFixed(2)),
    }));
  } catch (e) { }
}
function load() {
  let o; try { o = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  if (!o || !o.S) return false;
  S = o.S; W = genWorld(S.seed); setupRuntime();
  for (let i = 0; i < o.n.length; i += 4) {
    const p = o.n[i + 2], nd = { x: o.n[i], y: o.n[i + 1], p, g: o.n[i + 3], d: 0 };
    if (p >= 0) nd.d = nodes[p].d + SEG; nodes.push(nd); if (p >= 0) { addSegPath(nd); addHair(nd); }
  }
  if (!nodes.length) nodes.push({ x: 0, y: sy(0) + 5, p: -1, g: 0, d: 0 });
  const ti = new Uint8Array(GC * GR); unbits(o.inf, ti); ti.forEach((v, k) => v && infectCell(k % GC, k / GC | 0, true));
  const tr = new Uint8Array(GC * GR); unbits(o.rev, tr); tr.forEach((v, k) => v && revealCell(k % GC, k / GC | 0));
  o.res.forEach((a, i) => { if (res[i]) { res[i].amt = a[0]; res[i].tap = a[1]; res[i].node = a[2]; } });
  mush = o.mush.map(a => ({ x: a[0], sz: a[1], hue: a[2], ph: rnd() * TAU, born: -10, sp: rnd() * 3 }));
  o.surf.forEach((v, i) => surf[i] = v); o.pl.forEach((v, i) => W.plants[i] && (W.plants[i].inf = v));
  tips = o.tips.filter(t => nodes[t[0]]).map(t => mkTip(t[0], t[1], t[2]));
  offline((Date.now() - S.t) / 1000);
  return true;
}
function offline(s) {
  if (s < 20) return; s = Math.min(s, 8 * 3600);
  const g = { spores: sporeRate() * s, water: baseWater() * s, biomass: passiveBio() * s, dna: 0 }, ab = absorbAll(), par = F.parasite();
  for (const r of res) {
    if (!r.tap) continue;
    if (r.t === 'w') { const reg = r.cap * .005 * ab * s, dr = 2.5 * ab * s; g.water += Math.min(dr, r.amt + reg); r.amt = Math.max(0, r.amt + reg - dr); }
    else if (r.amt > 0) { const a = Math.min(r.amt, 1.2 * ab * s); r.amt -= a; g.biomass += a * par; g.spores += a * .5 * par; }
  }
  let ns = 0; const au = F.auto(); if (au) for (let i = Math.min(40, s / au | 0); i > 0; i--) if (sprout(true)) ns++;
  const lv = S.lvl; for (const k of RES) addRes(k, g[k]);
  FT = []; P = [];
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
  $('#modalBox').innerHTML = `<h3>A infecção continuou…</h3><p>Você ficou fora por <b>${h ? h + 'h ' : ''}${m}min</b>.</p>
    ${RES.filter(k => g[k] > 0).map(k => `<p>${ICN(k)} +${fmt(g[k])}</p>`).join('')}${ns ? `<p>🍄 +${ns} fungos brotaram</p>` : ''}${S.lvl > lv ? `<p>⬆ Nível ${S.lvl}!</p>` : ''}
    <button class="btn main" id="okM">Continuar a infecção</button>`;
  $('#modal').classList.remove('hidden'); $('#okM').onclick = () => $('#modal').classList.add('hidden');
}
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); save(); }
  else if (hiddenAt) { offline((Date.now() - hiddenAt) / 1000); hiddenAt = 0; last = performance.now(); }
});
addEventListener('pagehide', save);

// ---------- boot ----------
if (!load()) newGame();
cam = { x: 0, y: 50, z: clamp(Math.min(SW / 420, SH / 460), .6, 2.4) }; clampCam();
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  update(dt); render(); hud(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__zf = { get S() { return S; }, nodes: () => nodes, tips: () => tips, mush: () => mush, infP, sprout, save, update, F, UP, buy };
})();
