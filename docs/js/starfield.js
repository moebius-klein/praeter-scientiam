(() => {
  "use strict";

  const VIEWBOX_SIZE = 610;        // sigillum viewBox width/height
  const MASK_R_SVG = 212.5;        // outer edge of Dante/Wittgenstein band (r=188.75, stroke=47.5 => 212.5)
  const DPR_CAP = 2;               // avoid excessive GPU load on very high DPI screens

  const state = {
    running: false,
    started: false,
    canvStars: null,
    canvNebula: null,
    ctxStars: null,
    ctxNebula: null,
    w: 0,
    h: 0,
    dpr: 1,
    maskEl: null,
    mouseX: 0,
    mouseY: 0,
    mouseNX: 0,
    mouseNY: 0,
    mouseNXSm: 0,
    mouseNYSm: 0,
    lastT: 0,
    stars: [],
    driftStars: [],
    blobs: [],
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function now() { return performance.now(); }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    state.dpr = dpr;
    state.w = Math.floor(window.innerWidth);
    state.h = Math.floor(window.innerHeight);

    for (const c of [state.canvNebula, state.canvStars]) {
      if (!c) continue;
      c.width = Math.floor(state.w * dpr);
      c.height = Math.floor(state.h * dpr);
      c.style.width = state.w + "px";
      c.style.height = state.h + "px";
    }
    if (state.ctxNebula) state.ctxNebula.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state.ctxStars) state.ctxStars.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function getMaskCircle() {
    const el = state.maskEl;
    if (!el) {
      return { cx: state.w / 2, cy: state.h / 2, r: 0 };
    }
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = Math.min(rect.width, rect.height) * (MASK_R_SVG / VIEWBOX_SIZE);
    return { cx, cy, r };
  }

  function clipOutsideCircle(ctx, cx, cy, r) {
    // Even-odd clip: keep everything except the inner circle.
    ctx.beginPath();
    ctx.rect(0, 0, state.w, state.h);
    ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
    ctx.clip("evenodd");
  }

  function initStars() {
    const area = state.w * state.h;
    // density tuned for "quiet" look; scales with area
    const baseCount = clamp(Math.floor(area / 9000), 180, 520);

    state.stars = [];
    for (let i = 0; i < baseCount; i++) {
      const depth = Math.random() ** 0.7; // more far stars than near
      state.stars.push({
        x: Math.random() * state.w,
        y: Math.random() * state.h,
        r: rand(0.6, 1.6) * (0.55 + (1 - depth) * 0.75),
        a: rand(0.25, 0.85),
        depth,
        tw: Math.random() < 0.22,   // twinkle stars subset
        twSpd: rand(0.2, 1.2),
        twPh: rand(0, Math.PI * 2),
        life: Math.random() < 0.10 ? rand(4, 18) : Infinity, // some will fade out
        born: now(),
        bornDur: rand(2.0, 6.0),
        dieDur: rand(2.0, 7.0),
      });
    }
  }

  function initNebula() {
    state.blobs = [];
    const blobCount = clamp(Math.floor((state.w * state.h) / 140000), 6, 14);

    for (let i = 0; i < blobCount; i++) {
      state.blobs.push({
        x: rand(-state.w * 0.2, state.w * 1.2),
        y: rand(-state.h * 0.2, state.h * 1.2),
        r: rand(Math.min(state.w, state.h) * 0.18, Math.min(state.w, state.h) * 0.42),
        a: rand(0.04, 0.10),
        depth: rand(0.15, 0.75),
        vx: rand(-3, 3) * 0.08,
        vy: rand(-3, 3) * 0.08,
        drift: rand(0.002, 0.010),
        ph: rand(0, Math.PI * 2),
      });
    }
  }

  function spawnDriftStar(mask, t) {
    // Stars that "emerge" near the masked boundary and drift outward.
    const angle = rand(0, Math.PI * 2);
    const startR = mask.r + rand(6, 26);
    const x = mask.cx + Math.cos(angle) * startR;
    const y = mask.cy + Math.sin(angle) * startR;

    const speed = rand(12, 48); // px/sec
    const depth = rand(0.15, 0.85);

    state.driftStars.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: rand(0.7, 1.8) * (0.6 + (1 - depth) * 0.8),
      a: rand(0.25, 0.75),
      depth,
      born: t,
      ttl: rand(5.0, 14.0),
    });
  }

  function updateMouse(e) {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
    const nx = (state.mouseX / Math.max(1, state.w)) * 2 - 1;
    const ny = (state.mouseY / Math.max(1, state.h)) * 2 - 1;
    state.mouseNX = clamp(nx, -1, 1);
    state.mouseNY = clamp(ny, -1, 1);
  }

  function step(t) {
    if (!state.running) return;
    const dt = state.lastT ? (t - state.lastT) / 1000 : 0;
    state.lastT = t;

    // Smooth mouse for gentle parallax
    const smooth = 1 - Math.pow(0.001, dt); // ~ exponential smoothing
    state.mouseNXSm += (state.mouseNX - state.mouseNXSm) * smooth;
    state.mouseNYSm += (state.mouseNY - state.mouseNYSm) * smooth;

    const mask = getMaskCircle();

    // spawn drift stars at a low irregular rate
    if (Math.random() < dt * 0.55) {
      spawnDriftStar(mask, t / 1000);
    }

    renderNebula(mask, t / 1000);
    renderStars(mask, t / 1000, dt);

    requestAnimationFrame(step);
  }

  function renderNebula(mask, t) {
    const ctx = state.ctxNebula;
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, state.w, state.h);
    clipOutsideCircle(ctx, mask.cx, mask.cy, mask.r);

    // Subtle blend that lifts gold out of purple without looking like a spotlight
    ctx.globalCompositeOperation = "screen";

    for (const b of state.blobs) {
      // slow drift + gentle breathing
      b.ph += b.drift;
      b.x += b.vx;
      b.y += b.vy;

      // wrap softly
      if (b.x < -state.w * 0.35) b.x = state.w * 1.35;
      if (b.x > state.w * 1.35) b.x = -state.w * 0.35;
      if (b.y < -state.h * 0.35) b.y = state.h * 1.35;
      if (b.y > state.h * 1.35) b.y = -state.h * 0.35;

      const par = (1 - b.depth) * 18; // px
      const px = b.x + state.mouseNXSm * par;
      const py = b.y + state.mouseNYSm * par;

      const rr = b.r * (0.92 + 0.10 * Math.sin(b.ph));
      const g = ctx.createRadialGradient(px, py, 0, px, py, rr);

      // Dark-gold, not bright; let background carry most of the darkness.
      g.addColorStop(0.0, `rgba(184, 155, 60, ${b.a})`);
      g.addColorStop(0.55, `rgba(184, 155, 60, ${b.a * 0.35})`);
      g.addColorStop(1.0, "rgba(184, 155, 60, 0)");

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, rr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
  }

  function starAlpha(st, t) {
    // born fade-in
    const age = (t - (st.born / 1000));
    let a = st.a;

    if (age < st.bornDur) a *= clamp(age / st.bornDur, 0, 1);

    // finite-life stars fade out near end
    if (st.life !== Infinity) {
      const lifeAge = t - (st.born / 1000);
      const remain = st.life - lifeAge;
      if (remain < st.dieDur) {
        a *= clamp(remain / st.dieDur, 0, 1);
      }
    }

    // irregular twinkle
    if (st.tw) {
      const tw = 0.55 + 0.45 * Math.sin(st.twPh + t * st.twSpd * (1.2 + st.depth));
      a *= tw;
    }

    return clamp(a, 0, 1);
  }

  function renderStars(mask, t, dt) {
    const ctx = state.ctxStars;
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, state.w, state.h);
    clipOutsideCircle(ctx, mask.cx, mask.cy, mask.r);

    // fixed stars
    for (const st of state.stars) {
      // Some stars die and get replaced (fade-out/in cycles)
      if (st.life !== Infinity) {
        const lifeAge = t - (st.born / 1000);
        if (lifeAge > st.life) {
          // respawn
          st.x = Math.random() * state.w;
          st.y = Math.random() * state.h;
          st.born = now();
          st.life = rand(5, 20);
          st.bornDur = rand(1.5, 5.0);
          st.dieDur = rand(2.0, 7.0);
          st.tw = Math.random() < 0.25;
          st.twSpd = rand(0.2, 1.2);
          st.twPh = rand(0, Math.PI * 2);
          st.depth = Math.random() ** 0.7;
        }
      }

      const par = (1 - st.depth) * 26; // px
      const x = st.x + state.mouseNXSm * par;
      const y = st.y + state.mouseNYSm * par;

      const a = starAlpha(st, t);
      if (a <= 0.005) continue;

      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(x, y, st.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(216, 192, 136, 1)"; // codex gold, actual opacity via globalAlpha
      ctx.fill();
    }

    // drift stars
    // update + draw, remove expired/outside
    for (let i = state.driftStars.length - 1; i >= 0; i--) {
      const ds = state.driftStars[i];
      const age = t - ds.born;
      if (age > ds.ttl) {
        state.driftStars.splice(i, 1);
        continue;
      }
      ds.x += ds.vx * dt;
      ds.y += ds.vy * dt;

      // remove if offscreen with some margin
      if (ds.x < -50 || ds.x > state.w + 50 || ds.y < -50 || ds.y > state.h + 50) {
        state.driftStars.splice(i, 1);
        continue;
      }

      const par = (1 - ds.depth) * 22;
      const x = ds.x + state.mouseNXSm * par;
      const y = ds.y + state.mouseNYSm * par;

      // gentle fade-out over life
      const a = ds.a * (1 - (age / ds.ttl));
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.beginPath();
      ctx.arc(x, y, ds.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(216, 192, 136, 1)";
      ctx.fill();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function start({ maskElement } = {}) {
    if (state.started) {
      // update mask element if needed
      if (maskElement) state.maskEl = maskElement;
      state.running = true;
      return;
    }

    state.started = true;
    state.running = true;

    state.canvStars = document.getElementById("starfield-canvas");
    state.canvNebula = document.getElementById("nebula-canvas");
    state.ctxStars = state.canvStars ? state.canvStars.getContext("2d", { alpha: true }) : null;
    state.ctxNebula = state.canvNebula ? state.canvNebula.getContext("2d", { alpha: true }) : null;

    state.maskEl = maskElement || document.getElementById("sigillum");

    resize();
    initStars();
    initNebula();

    window.addEventListener("resize", () => {
      resize();
      initStars();
      initNebula();
    });

    window.addEventListener("mousemove", updateMouse, { passive: true });

    // Initialize mouse center (so no sudden parallax jump)
    state.mouseX = state.w / 2;
    state.mouseY = state.h / 2;
    state.mouseNX = 0;
    state.mouseNY = 0;
    state.mouseNXSm = 0;
    state.mouseNYSm = 0;

    state.lastT = 0;
    requestAnimationFrame(step);
  }

  function stop() {
    state.running = false;
  }

  window.CodexStarfield = { start, stop };
})();
