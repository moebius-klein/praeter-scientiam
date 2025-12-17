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
  document.body.classList.remove(
    "landing",
    "totum",
    "delta-min",
    "delta-s"
  );
  if (cls) document.body.classList.add(cls);
}

function wireGenericNav(rootEl) {
  // Generic click routing for elements that declare data-go.
  // Example: <div id="relatum-left" data-go="totum" data-out-effect="collapse-out"></div>
  const handler = (ev) => {
    const el = ev.target.closest?.("[data-go]");
    if (!el) return;

    ev.preventDefault();
    const target = el.getAttribute("data-go");
    if (!target) return;
    const outEffect = el.getAttribute("data-out-effect") || "zoom-in";
    go(target, { outEffect, originEl: el });
  };

  rootEl.addEventListener("click", handler);
  rootEl.addEventListener("pointerdown", (ev) => {
    // Some mobile browsers are more reliable with pointerdown for user-gesture policies.
    const el = ev.target.closest?.("[data-go]");
    if (!el) return;
    // Let explicit handlers (e.g., landing hook) take precedence.
    if (el.hasAttribute("data-go-external")) return;
    ev.preventDefault();
    const target = el.getAttribute("data-go");
    if (!target) return;
    const outEffect = el.getAttribute("data-out-effect") || "zoom-in";
    go(target, { outEffect, originEl: el });
  }, { passive: false });
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

  // Generic nav wiring
  wireGenericNav(app);

  // Optional scene hooks
  if (sceneDef.module) {
    const mod = await import(sceneDef.module);
    if (typeof mod.default === "function") {
      mod.default({ go, ensureFullscreenOnce });
    }
  }

  playIn();
}

export async function go(sceneId, { outEffect = "zoom-in", originEl = null } = {}) {
  await playOut(outEffect, originEl);
  history.pushState({ scene: sceneId }, "", `#${sceneId}`);
  await loadScene(sceneId);
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
    loadScene(sceneFromHash(valid)).catch(() => { });
  });

  loadScene(sceneFromHash(valid)).catch(() => { });
});
