// docs/js/bg/delta_s_bg.js
// Δs-field background: irregular closed / near-closed differentia contours (no triangle assumption)
// with clearer, calmer self-relation arcs (Relatio cum se ipsa) that start (preferably) at "corners" (kinks).
// Minimal time: aperiodic micro-drift of exactly one corner per artifact (no periodic motion).
// Contract: export function start({params}) => { stop() }

function rand(a, b) { return a + Math.random() * (b - a); }
function randi(a, b) { return Math.floor(rand(a, b + 1)); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getRects(paddingPx) {
  const ids = ["satzblock", "relatum-left", "relatum-right"];
  const rects = [];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    rects.push({
      x: r.left - paddingPx,
      y: r.top - paddingPx,
      w: r.width + paddingPx * 2,
      h: r.height + paddingPx * 2
    });
  }
  return rects;
}

function centroid(points) {
  let x = 0, y = 0;
  for (const p of points) { x += p.x; y += p.y; }
  return { x: x / points.length, y: y / points.length };
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// --- Rendering helpers -------------------------------------------------------

function drawArrowhead(ctx, from, to, size) {
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(ang - 0.55), to.y - size * Math.sin(ang - 0.55));
  ctx.lineTo(to.x - size * Math.cos(ang + 0.55), to.y - size * Math.sin(ang + 0.55));
  ctx.closePath();
  ctx.fill();
}

function drawCalmArrow(ctx, start, target, size) {
  // straight, calm shaft with clear head (no wobble)
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();
  drawArrowhead(ctx, start, target, size);
}

// Smooth-ish path through points with slight draw-time jitter
function drawWobblyClosedLoop(ctx, pts, { wobble = 1.2, steps = 8, closed = true, gap = null } = {}) {
  // gap: { startIndex, endIndexExclusive } in circular index space; if present, skip those segments
  const n = pts.length;
  const inGap = (i) => {
    if (!gap) return false;
    const a = gap.startIndex, b = gap.endIndexExclusive;
    if (a < b) return i >= a && i < b;
    return i >= a || i < b; // wrap
  };

  const jitter = (p, amp) => ({ x: p.x + rand(-amp, amp), y: p.y + rand(-amp, amp) });

  // find first point not in gap
  let start = 0;
  while (start < n && inGap(start)) start++;
  if (start >= n) return;

  ctx.beginPath();
  const p0 = jitter(pts[start], wobble);
  ctx.moveTo(p0.x, p0.y);

  // Use quadratic segments: for each point, curve to midpoint of next point.
  for (let k = 1; k <= n; k++) {
    const i = (start + k) % n;
    if (!closed && k === n) break;
    if (inGap(i)) continue;

    const p = jitter(pts[i], wobble);
    const prevIdx = (i - 1 + n) % n;
    const prev = jitter(pts[prevIdx], wobble);

    // midpoint as end of quadratic segment
    const mx = (prev.x + p.x) / 2;
    const my = (prev.y + p.y) / 2;

    // additional micro-wobble along the curve by subdividing with line segments
    // (kept light to avoid heavy CPU)
    // We'll approximate: quadratic control at prev, end at midpoint.
    // Subdivide into a few steps.
    let last = { x: ctx.__lastX ?? p0.x, y: ctx.__lastY ?? p0.y }; // fallback
    const segs = steps;
    for (let s = 1; s <= segs; s++) {
      const t = s / segs;
      const x =
        (1 - t) * (1 - t) * last.x +
        2 * (1 - t) * t * prev.x +
        t * t * mx;
      const y =
        (1 - t) * (1 - t) * last.y +
        2 * (1 - t) * t * prev.y +
        t * t * my;

      // perpendicular micro jitter
      const dx = mx - last.x;
      const dy = my - last.y;
      const L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L;
      const ny = dx / L;
      const j = rand(-0.35, 0.35) * wobble;

      ctx.lineTo(x + nx * j, y + ny * j);
    }

    ctx.__lastX = mx;
    ctx.__lastY = my;
  }

  if (closed && !gap) ctx.closePath();
  ctx.stroke();

  // cleanup internal scratch
  delete ctx.__lastX;
  delete ctx.__lastY;
}

// --- Shape construction ------------------------------------------------------

// Build an irregular contour from polar samples + kink emphasis.
// Returns points plus list of "corner indices" (kink points).
function makeDifferentiaContour(cx, cy, size, cfg) {
  const seg = randi(cfg.minSegments, cfg.maxSegments);

  // angles with slight irregularity
  const angles = [];
  for (let i = 0; i < seg; i++) {
    angles.push((i / seg) * Math.PI * 2 + rand(-0.18, 0.18));
  }

  // choose corner indices
  const cornerCount = randi(cfg.cornersMin, cfg.cornersMax);
  const cornerIdx = new Set();
  while (cornerIdx.size < cornerCount) cornerIdx.add(randi(0, seg - 1));

  const pts = angles.map((a, i) => {
    let r = size * rand(0.65, 1.15);
    if (cornerIdx.has(i)) r *= rand(1.05, 1.32);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, isCorner: cornerIdx.has(i) };
  });

  // open vs closed (small gap, not a big missing wedge)
  const closed = Math.random() < cfg.closedProbability;
  let gap = null;
  if (!closed) {
    const gapLen = Math.max(1, Math.floor(seg * rand(cfg.gapFracMin, cfg.gapFracMax)));
    const startIndex = randi(0, seg - 1);
    const endIndexExclusive = (startIndex + gapLen) % seg;
    gap = { startIndex, endIndexExclusive };
  }

  const corners = pts
    .map((p, i) => ({ p, i }))
    .filter(x => x.p.isCorner)
    .map(x => x.i);

  return { pts, corners, closed, gap };
}

// pick a "preferred corner" index; fallback random point if none.
function pickCornerIndex(shape) {
  if (shape.corners && shape.corners.length) return pick(shape.corners);
  return randi(0, shape.pts.length - 1);
}

// --- Self relation construction ---------------------------------------------

function weightedPick(weights) {
  // weights: [{key, w}, ...]
  const sum = weights.reduce((s, it) => s + it.w, 0);
  let t = Math.random() * sum;
  for (const it of weights) {
    t -= it.w;
    if (t <= 0) return it.key;
  }
  return weights[weights.length - 1].key;
}

// Build a calm arc/circle outside the differentia, starting at a corner point.
// status: inside/touch/outside determines arrow target relative to the contour.
function makeSelfRelation(shape, cfg) {
  if (Math.random() > cfg.selfRelationProbability) return null;

  const status = weightedPick([
    { key: "inside", w: cfg.wInside },
    { key: "touch", w: cfg.wTouch },
    { key: "outside", w: cfg.wOutside }
  ]);

  // anchor at (preferably) a corner
  const startIdx = pickCornerIndex(shape);
  const start = shape.pts[startIdx];

  // approximate shape center
  const c = centroid(shape.pts);

  // outward direction from center to start
  const vx = start.x - c.x;
  const vy = start.y - c.y;
  const vlen = Math.hypot(vx, vy) || 1;
  const ux = vx / vlen;
  const uy = vy / vlen;

  // approximate radius: mean distance of points to center
  let meanR = 0;
  for (const p of shape.pts) meanR += dist(p, c);
  meanR /= shape.pts.length;

  const R = meanR * rand(cfg.selfRadiusMinMul, cfg.selfRadiusMaxMul);

  // arc fraction, open allowed (calm and readable)
  const arcFrac = rand(cfg.selfArcMin, cfg.selfArcMax);
  const arcSpan = arcFrac * Math.PI * 2;

  // place arc center outside along outward direction, so arc "floats" beside Δs
  const arcCenter = {
    x: start.x + ux * (R * 0.55),
    y: start.y + uy * (R * 0.55)
  };

  // choose arc angles so that start point lies on arc approximately
  const baseAng = Math.atan2(start.y - arcCenter.y, start.x - arcCenter.x);
  const a0 = baseAng - arcSpan * 0.15;
  const a1 = a0 + arcSpan;

  // arrow target depends on status
  let target;
  if (status === "inside") {
    target = { x: start.x + (c.x - start.x) * 0.35, y: start.y + (c.y - start.y) * 0.35 };
  } else if (status === "touch") {
    target = { x: start.x + (c.x - start.x) * 0.06, y: start.y + (c.y - start.y) * 0.06 };
  } else {
    // outside: keep arrow outside (open relation)
    target = { x: start.x + ux * (meanR * 0.35), y: start.y + uy * (meanR * 0.35) };
  }

  return { status, startIdx, start, c, meanR, arcCenter, R, a0, a1, target };
}

// --- Main -------------------------------------------------------------------

export function start({ params = {} } = {}) {
  const cfg = {
    // population
    count: Number(params.count ?? 44),

    // exclusions
    paddingPx: Number(params.paddingPx ?? 30),

    // differentia contour
    minSize: Number(params.minSize ?? 22),
    maxSize: Number(params.maxSize ?? 70),
    minSegments: Number(params.minSegments ?? 6),
    maxSegments: Number(params.maxSegments ?? 14),
    closedProbability: Number(params.closedProbability ?? 0.85),
    gapFracMin: Number(params.gapFracMin ?? 0.02),
    gapFracMax: Number(params.gapFracMax ?? 0.08),
    cornersMin: Number(params.cornersMin ?? 2),
    cornersMax: Number(params.cornersMax ?? 5),

    // line style (Δs)
    wobbleMin: Number(params.wobbleMin ?? 0.9),
    wobbleMax: Number(params.wobbleMax ?? 2.1),
    wobbleSteps: Number(params.wobbleSteps ?? 7),
    minStroke: Number(params.minStroke ?? 0.75),
    maxStroke: Number(params.maxStroke ?? 1.35),

    // colors
    colorPrimary: String(params.colorPrimary ?? "rgba(184,155,60,0.24)"),
    colorSecondary: String(params.colorSecondary ?? "rgba(160,120,210,0.16)"),
    veilAlpha: Number(params.veilAlpha ?? 0.10),

    // self relation
    selfRelationProbability: Number(params.selfRelationProbability ?? 0.70),
    selfRadiusMinMul: Number(params.selfRadiusMinMul ?? 1.3),
    selfRadiusMaxMul: Number(params.selfRadiusMaxMul ?? 2.2),
    selfArcMin: Number(params.selfArcMin ?? 0.75),
    selfArcMax: Number(params.selfArcMax ?? 0.95),
    selfStrokeMul: Number(params.selfStrokeMul ?? 1.15),
    selfOpacityMul: Number(params.selfOpacityMul ?? 1.18),
    selfJitter: Number(params.selfJitter ?? 0.15),

    // self relation status weights
    wInside: Number(params.wInside ?? 0.40),
    wTouch: Number(params.wTouch ?? 0.35),
    wOutside: Number(params.wOutside ?? 0.25),

    // time minimalism (aperiodic)
    enableTime: Boolean(params.enableTime ?? true),
    cornerDriftPxPerSecMin: Number(params.cornerDriftPxPerSecMin ?? 0.08),
    cornerDriftPxPerSecMax: Number(params.cornerDriftPxPerSecMax ?? 0.22),

    // render
    bgZ: Number(params.bgZ ?? 5),
  };

  const canvas = document.createElement("canvas");
  canvas.className = "bg-layer bg-delta-s";
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = String(cfg.bgZ);
  canvas.style.filter = "blur(0.35px)";

  const ctx = canvas.getContext("2d", { alpha: true });
  document.body.appendChild(canvas);

  let w = 0, h = 0;
  let running = true;
  let exclusionRects = [];

  const artifacts = [];

  function randomPointAvoidingRects() {
    // best-effort: try a few times to avoid exclusions; fallback anywhere
    for (let t = 0; t < 40; t++) {
      const x = rand(0, w);
      const y = rand(0, h);
      const inside = exclusionRects.some(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
      if (!inside) return { x, y };
    }
    return { x: rand(0, w), y: rand(0, h) };
  }

  function spawnAll() {
    artifacts.length = 0;

    for (let i = 0; i < cfg.count; i++) {
      const center = randomPointAvoidingRects();
      const size = rand(cfg.minSize, cfg.maxSize);

      const shape = makeDifferentiaContour(center.x, center.y, size, cfg);

      const strokeColor = Math.random() < 0.68 ? cfg.colorPrimary : cfg.colorSecondary;
      const strokeW = rand(cfg.minStroke, cfg.maxStroke);
      const opacity = rand(0.18, 0.28);
      const wobble = rand(cfg.wobbleMin, cfg.wobbleMax);

      const self = makeSelfRelation(shape, cfg);

      // choose drift corner index (prefer actual corner)
      const driftCornerIndex = cfg.enableTime ? pickCornerIndex(shape) : null;

      // store drift vector (aperiodic, constant direction, slow)
      const drift = cfg.enableTime ? {
        v: rand(cfg.cornerDriftPxPerSecMin, cfg.cornerDriftPxPerSecMax),
        ang: rand(0, Math.PI * 2)
      } : null;

      artifacts.push({
        shape,
        styleDelta: {
          color: strokeColor,
          lineWidth: strokeW,
          opacity,
          wobble
        },
        self,
        styleSelf: self ? {
          color: strokeColor,
          lineWidth: strokeW * cfg.selfStrokeMul,
          opacity: clamp(opacity * cfg.selfOpacityMul, 0, 1)
        } : null,
        driftCornerIndex,
        drift
      });
    }
  }

  function drawSelf(ctx, a) {
    const self = a.self;
    const style = a.styleSelf;
    if (!self || !style) return;

    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.fillStyle = style.color;
    ctx.lineWidth = style.lineWidth;
    ctx.globalAlpha = style.opacity;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // calm arc: very small jitter, almost stable
    const j = cfg.selfJitter;
    const cx = self.arcCenter.x + rand(-j, j);
    const cy = self.arcCenter.y + rand(-j, j);
    const R = self.R * (1 + rand(-0.01, 0.01));

    ctx.beginPath();
    ctx.arc(cx, cy, R, self.a0, self.a1, false);
    ctx.stroke();

    // arrow from start corner towards target (calm, clear)
    const start = a.shape.pts[self.startIdx];
    const target = self.target;

    // shorten target a bit so arrowhead doesn't look like "piercing"
    const dx = target.x - start.x;
    const dy = target.y - start.y;
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L;
    const uy = dy / L;
    const tip = { x: start.x + ux * Math.min(L, 22), y: start.y + uy * Math.min(L, 22) };

    drawCalmArrow(ctx, start, tip, rand(6, 9));

    ctx.restore();
  }

  function renderFrame() {
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const a of artifacts) {
      ctx.save();
      ctx.strokeStyle = a.styleDelta.color;
      ctx.lineWidth = a.styleDelta.lineWidth;
      ctx.globalAlpha = a.styleDelta.opacity;

      drawWobblyClosedLoop(ctx, a.shape.pts, {
        wobble: a.styleDelta.wobble,
        steps: cfg.wobbleSteps,
        closed: a.shape.closed,
        gap: a.shape.gap
      });

      ctx.restore();

      // self relation overlays (clearer, calmer)
      drawSelf(ctx, a);
    }

    // punch out excluded zones
    for (const r of exclusionRects) ctx.clearRect(r.x, r.y, r.w, r.h);

    // subtle veil
    ctx.globalAlpha = cfg.veilAlpha;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  function resize() {
    w = Math.max(1, window.innerWidth);
    h = Math.max(1, window.innerHeight);
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    exclusionRects = getRects(cfg.paddingPx);
    spawnAll();
    renderFrame();
  }

  // time minimalism: drift exactly one corner per artifact, no periodic motion
  let lastT = performance.now();

  function tick(now) {
    if (!running) return;

    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    // update exclusion rects occasionally in case layout changes
    if (Math.random() < 0.02) {
      exclusionRects = getRects(cfg.paddingPx);
    }

    if (cfg.enableTime) {
      for (const a of artifacts) {
        if (a.driftCornerIndex == null || !a.drift) continue;

        const p = a.shape.pts[a.driftCornerIndex];

        p.x += Math.cos(a.drift.ang) * a.drift.v * dt;
        p.y += Math.sin(a.drift.ang) * a.drift.v * dt;

        // gentle reflect at viewport boundaries
        if (p.x < cfg.paddingPx || p.x > w - cfg.paddingPx) a.drift.ang = Math.PI - a.drift.ang;
        if (p.y < cfg.paddingPx || p.y > h - cfg.paddingPx) a.drift.ang = -a.drift.ang;

        // keep self relation anchored to the drifting corner (if present)
        if (a.self) {
          a.self.startIdx = a.driftCornerIndex; // ensures arrow origin stays at the drifting "corner"
          // update the cached start point fields (not strictly required, but keeps semantics coherent)
          a.self.start = a.shape.pts[a.self.startIdx];
        }
      }
    }

    renderFrame();
    requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(tick);

  return {
    stop() {
      running = false;
      window.removeEventListener("resize", resize);
      canvas.remove();
    }
  };
}
