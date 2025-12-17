// docs/js/bg/delta_min_bg.js
// Δm-field background: stationary glyph events (spawn → linger → fade out)
// No movement (no space yet). Excludes #satzblock and relata regions.

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(a, b) { return a + Math.random() * (b - a); }
function nowMs() { return performance.now(); }

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

function pointInRects(x, y, rects) {
    for (const r of rects) {
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
    }
    return false;
}

function alphaFor(t, life, fadeInFrac = 0.18, fadeOutFrac = 0.22) {
    const fi = life * fadeInFrac;
    const fo = life * fadeOutFrac;
    if (t < 0) return 0;
    if (t < fi) return t / fi;
    if (t > life - fo) return (life - t) / fo;
    return 1;
}

function drawGlyph(ctx, g) {
    // g.kind: 0..2 — open primitives (no closed symmetry)
    // g.size: pixels
    // g.rot: radians
    // g.a: alpha
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.rot);
    ctx.globalAlpha = g.a;

    ctx.lineWidth = g.stroke;
    ctx.strokeStyle = g.color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const s = g.size;

    if (g.kind === 0) {
        // open "delta fragment" (not a closed triangle)
        ctx.beginPath();
        ctx.moveTo(-0.55 * s, 0.45 * s);
        ctx.lineTo(0, -0.55 * s);
        ctx.lineTo(0.55 * s, 0.45 * s);
        // no closing line
        ctx.stroke();
    } else if (g.kind === 1) {
        // open angle / corner
        ctx.beginPath();
        ctx.moveTo(-0.5 * s, -0.15 * s);
        ctx.lineTo(0, 0);
        ctx.lineTo(-0.5 * s, 0.15 * s);
        ctx.stroke();
    } else {
        // short arc (partial curve)
        ctx.beginPath();
        ctx.arc(0, 0, 0.55 * s, -0.65 * Math.PI, -0.15 * Math.PI);
        ctx.stroke();
    }

    // Optional tiny "m" marker (very subtle) if enabled
    if (g.showDeltaM) {
        ctx.globalAlpha = g.a * 0.7;
        ctx.fillStyle = g.color;
        ctx.font = `${Math.max(10, Math.round(s * 0.55))}px Cinzel, serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Δm", 0, 0.10 * s);
    }

    ctx.restore();
}

export function start({ params = {} } = {}) {
    const cfg = {
        maxGlyphs: Number(params.maxGlyphs ?? 55),
        spawnPerSec: Number(params.spawnPerSec ?? 6),
        minLifeMs: Number(params.minLifeMs ?? 250),
        maxLifeMs: Number(params.maxLifeMs ?? 6500),
        paddingPx: Number(params.paddingPx ?? 26),
        useDeltaM: Boolean(params.useDeltaM ?? true),

        // visual
        minSize: Number(params.minSize ?? 10),
        maxSize: Number(params.maxSize ?? 34),
        minStroke: Number(params.minStroke ?? 1),
        maxStroke: Number(params.maxStroke ?? 2.2),

        // color: subtle gold nebula
        color: String(params.color ?? "rgba(212, 180, 120, 0.32)"),
        bgZ: Number(params.bgZ ?? 5)
    };

    // Canvas layer
    const canvas = document.createElement("canvas");
    canvas.className = "bg-layer bg-delta-min";
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = String(cfg.bgZ);

    const ctx = canvas.getContext("2d", { alpha: true });
    document.body.appendChild(canvas);

    let w = 0, h = 0;
    let glyphs = [];
    let running = true;

    let lastT = nowMs();
    let spawnAcc = 0;
    let exclusionRects = [];

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
    }

    function refreshRects() {
        exclusionRects = getRects(cfg.paddingPx);
    }

    function trySpawnOne() {
        // Try a handful of times to avoid excluded zones.
        for (let i = 0; i < 12; i++) {
            const x = rand(0, w);
            const y = rand(0, h);
            if (pointInRects(x, y, exclusionRects)) continue;

            const life = rand(cfg.minLifeMs, cfg.maxLifeMs);
            const size = rand(cfg.minSize, cfg.maxSize);
            const stroke = rand(cfg.minStroke, cfg.maxStroke);
            const kind = Math.floor(rand(0, 3));
            const rot = rand(0, Math.PI * 2);

            glyphs.push({
                x, y,
                born: nowMs(),
                life,
                size,
                stroke,
                kind,
                rot,
                a: 0,
                color: cfg.color,
                showDeltaM: cfg.useDeltaM && (Math.random() < 0.22)
            });
            return;
        }
    }

    function render() {
        ctx.clearRect(0, 0, w, h);

        // Draw glyphs (and keep excluded zones clean)
        // 1) draw all glyphs
        for (const g of glyphs) drawGlyph(ctx, g);

        // 2) "punch out" excluded zones (guaranteed no overlay)
        for (const r of exclusionRects) {
            ctx.clearRect(r.x, r.y, r.w, r.h);
        }
    }

    function tick() {
        if (!running) return;

        const t = nowMs();
        const dt = Math.min(0.05, (t - lastT) / 1000);
        lastT = t;

        // update rects occasionally (layout may shift)
        if (Math.random() < 0.03) refreshRects();

        // spawn accumulator
        spawnAcc += dt * cfg.spawnPerSec;

        // spawn while we have credit
        while (spawnAcc >= 1) {
            spawnAcc -= 1;
            if (glyphs.length < cfg.maxGlyphs) trySpawnOne();
        }

        // update alphas and cull dead
        const alive = [];
        for (const g of glyphs) {
            const age = t - g.born;
            if (age >= g.life) continue;
            g.a = alphaFor(age, g.life);
            alive.push(g);
        }
        glyphs = alive;

        render();
        requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });

    // start loop
    requestAnimationFrame(tick);

    return {
        stop() {
            running = false;
            window.removeEventListener("resize", resize);
            canvas.remove();
            glyphs = [];
        }
    };
}
