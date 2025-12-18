import { playOut, playIn } from "./page_transition.js";
import { ensureFullscreenOnce } from "./fullscreen.js";
import {
  renderGeneratedScene,
  getGeneratedSceneDef,
  listGeneratedSceneIds
} from "./scene_renderer.js";
import { APP_CONFIG, applyAppConfig } from "./config.js";

// Router is now data-driven.
// - All scenes (incl. landing) are rendered via scenes.generated.json
// - Optional scene-specific behavior is provided via sceneDef.module (hooks)
// - Navigation is wired generically via [data-go]

let bgController = null;

// Navigation serialization (prevents flooding / re-entrancy)
let isNavigating = false;
let currentScene = null;

function setStarfieldVisible(visible) {
  const star = document.getElementById("starfield-canvas");
  const neb = document.getElementById("nebula-canvas");
  if (star) star.style.display = visible ? "block" : "none";
  if (neb) neb.style.display = visible ? "block" : "none";
}

async function applySceneBackground(sceneDef) {
  // 1) stop previous custom background
  if (bgController?.stop) {
    try { bgController.stop(); } catch (_) { }
  }
  bgController = null;

  // 2) failsafe: remove any leftover bg layers (custom canvases etc.)
  document.querySelectorAll(".bg-layer").forEach(el => el.remove());

  // 3) normalize bg definition:
  //    - allow legacy string ("stars"/"none")
  //    - allow object { module, params }
  const bg = sceneDef?.bg ?? "none";

  // 4) starfield handling
  const bgKey = (typeof bg === "string") ? bg : (bg?.key ?? "none");

  if (bgKey === "stars") {
    setStarfieldVisible(true);
    return;
  }
  setStarfieldVisible(false);

  // 5) custom background module handling
  if (typeof bg === "object" && bg?.module) {
    const mod = await import("./" + bg.module);
    if (typeof mod.start === "function") {
      bgController = mod.start({ params: bg.params ?? {} });
    }
  }
}

function applyBodyClass(sceneDef) {
  // Normalize: use explicit bodyClass if present, else def.class.
  const cls = sceneDef?.bodyClass ?? sceneDef?.class ?? "";
  document.body.classList.remove("landing", "totum", "delta-min", "delta-s");
  if (cls) document.body.classList.add(cls);
}

function wireGenericNav(rootEl) {
  // IMPORTANT: rootEl is stable (#app). We must NOT add listeners on every scene load.
  if (!rootEl || rootEl.dataset.navWired === "1") return;
  rootEl.dataset.navWired = "1";

  // Optional: prevent pointerdown + click double-fire by suppressing click shortly after pointerdown.
  let lastPointerNavAt = 0;

  const runNav = (ev) => {
    const el = ev.target.closest?.("[data-go]");
    if (!el) return;

    // Let explicit handlers (e.g., landing hook) take precedence.
    if (el.hasAttribute("data-go-external")) return;

    ev.preventDefault();

    const target = el.getAttribute("data-go");
    if (!target) return;

    const outEffect = el.getAttribute("data-out-effect") || "zoom-in";
    go(target, { outEffect, originEl: el }).catch(() => { });
  };

  rootEl.addEventListener("pointerdown", (ev) => {
    // Some mobile browsers are more reliable with pointerdown for user-gesture policies.
    lastPointerNavAt = Date.now();
    runNav(ev);
  }, { passive: false });

  rootEl.addEventListener("click", (ev) => {
    // Suppress click if pointerdown already initiated navigation very recently.
    if (Date.now() - lastPointerNavAt < 600) return;
    runNav(ev);
  });
}

async function loadScene(sceneId) {
  const sceneDef = await getGeneratedSceneDef(sceneId);
  if (!sceneDef) throw new Error(`Unknown scene: ${sceneId}`);

  // Background (starfield canvases) is a layout-level choice.
  // We keep the existing starfield system for landing.
  setStarfieldVisible(sceneDef.bgMode === "stars");

  // Render
  const html = await renderGeneratedScene(sceneId);
  const app = document.getElementById("app");
  app.innerHTML = html;

  applyBodyClass(sceneDef);

  // Scene-specific background plugin (glyphs etc.)
  await applySceneBackground(sceneDef);

  // Generic nav wiring (idempotent; binds only once)
  wireGenericNav(app);

  // Optional scene hooks
  if (sceneDef.module) {
    const mod = await import(sceneDef.module);
    if (typeof mod.default === "function") {
      mod.default({ go, ensureFullscreenOnce });
    }
  }

  // playIn might be sync or async; keep as-is unless your implementation returns a Promise.
  playIn();
}

export async function go(
  sceneId,
  { outEffect = "zoom-in", originEl = null, fromPopState = false } = {}
) {
  if (!sceneId) return;

  // Prevent re-entrancy / flooding
  if (isNavigating) {
    console.warn("Navigation suppressed (busy):", sceneId);
    return;
  }

  // Prevent no-op reload loops
  if (sceneId === currentScene) {
    if (!fromPopState && location.hash !== `#${sceneId}`) {
      history.replaceState({ scene: sceneId }, "", `#${sceneId}`);
    }
    return;
  }

  isNavigating = true;
  document.body.classList.add("is-transitioning");

  try {
    await playOut(outEffect, originEl);

    // Only pushState on user-initiated navigation (not on popstate)
    if (!fromPopState) {
      history.pushState({ scene: sceneId }, "", `#${sceneId}`);
    } else {
      // Keep history.state coherent (some browsers may provide null state)
      if (!history.state || history.state.scene !== sceneId) {
        history.replaceState({ scene: sceneId }, "", `#${sceneId}`);
      }
    }

    await loadScene(sceneId);
    currentScene = sceneId;
  } catch (e) {
    console.error("Navigation failed:", e);
  } finally {
    document.body.classList.remove("is-transitioning");
    isNavigating = false;
  }
}

function sceneFromHash(validIds) {
  const h = (location.hash || "#landing").slice(1);
  return validIds.has(h) ? h : "landing";
}

document.addEventListener("DOMContentLoaded", async () => {
  applyAppConfig(APP_CONFIG);

  // Install fullscreen gesture handler once (safe to call multiple times, but we call once here).
  ensureFullscreenOnce();

  const ids = await listGeneratedSceneIds();
  const valid = new Set(ids);

  window.addEventListener("popstate", () => {
    const target = sceneFromHash(valid);
    go(target, { outEffect: "zoom-in", originEl: null, fromPopState: true }).catch(() => { });
  });

  const initial = sceneFromHash(valid);
  history.replaceState({ scene: initial }, "", `#${initial}`);
  go(initial, { outEffect: "zoom-in", originEl: null, fromPopState: true }).catch(() => { });
});
