import { playOut, playIn } from "./page_transition.js";
import { ensureFullscreenOnce } from "./fullscreen.js";
import {
  renderGeneratedScene,
  getGeneratedSceneDef,
  listGeneratedSceneIds
} from "./scene_renderer.js";
import { APP_CONFIG, applyAppConfig } from "./config.js";

// Only truly "static" scene left is landing.
// All other scenes are driven by js/scenes/scenes.generated.json.
const STATIC_SCENES = {
  landing: {
    kind: "html",
    url: "js/scenes/landing.html",
    module: "./scenes/landing_scene.js",
    bgMode: "stars"
  }
};

function setLegacyBackground(mode) {
  // Legacy starfield canvas toggles (landing)
  const star = document.getElementById("starfield-canvas");
  const neb = document.getElementById("nebula-canvas");
  const show = mode === "stars";
  if (star) star.style.display = show ? "block" : "none";
  if (neb) neb.style.display = show ? "block" : "none";
}

// ===== Background plugin loader (driven by scenes.generated.json) =====
let bgController = null;

async function applySceneBackground(sceneDef) {
  if (bgController?.stop) {
    try {
      bgController.stop();
    } catch (_) {
      // ignore
    }
  }
  bgController = null;

  const bg = sceneDef?.bg;
  if (!bg || !bg.module) return;

  // bg.module is given as "bg/xxx.js"; router.js is in /js/
  const mod = await import(`./${bg.module}`);
  if (typeof mod.start !== "function") return;
  bgController = mod.start({ params: bg.params ?? {} });
}

function normalizeBodyClass(nextClass) {
  // Conservative: remove known scene body classes, then apply the new one.
  document.body.classList.remove(
    "landing",
    "totum",
    "delta-min",
    "delta-s",
    "space-active"
  );
  if (nextClass) document.body.classList.add(nextClass);
}

function wireGeneratedNavigation() {
  // Renderer emits these attrs; router binds them.
  document.querySelectorAll("[data-go]").forEach((el) => {
    el.style.cursor = "pointer";
    el.addEventListener(
      "click",
      () => {
        const target = el.getAttribute("data-go");
        if (!target) return;
        const outEffect = el.getAttribute("data-out-effect") || "zoom-in";
        go(target, { outEffect, originEl: el });
      },
      { passive: true }
    );
  });
}

async function resolveScene(name) {
  if (STATIC_SCENES[name]) return { id: name, ...STATIC_SCENES[name] };

  const def = await getGeneratedSceneDef(name);
  if (!def) return null;

  return {
    id: name,
    kind: "generated",
    def
  };
}

async function loadScene(name) {
  const resolved = await resolveScene(name);
  if (!resolved) throw new Error(`Unknown scene: ${name}`);

  if (resolved.kind === "html") {
    setLegacyBackground(resolved.bgMode);
  } else {
    setLegacyBackground("none");
  }

  let html;
  if (resolved.kind === "generated") {
    html = await renderGeneratedScene(resolved.id);
  } else {
    html = await fetch(resolved.url, { cache: "no-store" }).then((r) => r.text());
  }
  document.getElementById("app").innerHTML = html;

  if (resolved.kind === "generated") {
    const def = resolved.def;
    normalizeBodyClass(def.bodyClass ?? def.class ?? resolved.id);
    await applySceneBackground(def);
    wireGeneratedNavigation();

    // Optional per-scene hooks module
    if (def.module) {
      const mod = await import(`./${def.module}`);
      if (typeof mod.default === "function") {
        mod.default({ go, ensureFullscreenOnce });
      }
    } else {
      ensureFullscreenOnce();
    }
  } else {
    normalizeBodyClass("landing");
    await applySceneBackground(null);

    const mod = await import(resolved.module);
    if (typeof mod.default === "function") {
      mod.default({ go, ensureFullscreenOnce });
    }
  }

  playIn();
}

export async function go(name, { outEffect = "zoom-in", originEl = null } = {}) {
  await playOut(outEffect, originEl);
  history.pushState({ scene: name }, "", `#${name}`);
  await loadScene(name);
}

async function initialSceneFromHash() {
  const h = (location.hash || "#landing").slice(1);
  if (STATIC_SCENES[h]) return h;
  const ids = await listGeneratedSceneIds();
  return ids.includes(h) ? h : "landing";
}

window.addEventListener("popstate", () => {
  initialSceneFromHash()
    .then((scene) => loadScene(scene))
    .catch(() => {});
});

document.addEventListener("DOMContentLoaded", () => {
  applyAppConfig(APP_CONFIG);
  initialSceneFromHash()
    .then((scene) => loadScene(scene))
    .catch(() => {});
});
