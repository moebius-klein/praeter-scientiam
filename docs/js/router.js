import { playOut, playIn } from "./page_transition.js";
import { ensureFullscreenOnce } from "./fullscreen.js";
import { renderGeneratedScene, getGeneratedSceneDef } from "./scene_renderer.js";
import { APP_CONFIG, applyAppConfig } from "./config.js";

const SCENES = {
    landing: { url: "js/scenes/landing.html", module: "./scenes/landing_scene.js", bg: "stars" },
    totum: { generated: true, module: "./scenes/totum_scene.js", bg: "none" },

    // generativ gerenderte, hochgradig deckungsgleiche Scenes
    "delta-min": { generated: true, module: "./scenes/delta-min_scene.js", bg: "none" },
    "delta-s": { generated: true, module: "./scenes/delta-s_scene.js", bg: "none" }
};

function setBackground(mode) {
    const star = document.getElementById("starfield-canvas");
    const neb = document.getElementById("nebula-canvas");
    const show = (mode === "stars");
    if (star) star.style.display = show ? "block" : "none";
    if (neb) neb.style.display = show ? "block" : "none";
}

// ===== Generic background plugin loader (driven by scenes.generated.json) =====
let bgController = null;

async function applySceneBackground(sceneDef) {
    // stop previous background
    if (bgController?.stop) {
        try { bgController.stop(); } catch (_) { }
    }
    bgController = null;

    const bg = sceneDef?.bg;
    if (!bg || !bg.module) return;

    // bg.module is given as "js/bg/xxx.js" → import path must be relative to /js/
    const mod = await import(`./${bg.module}`);
    if (typeof mod.start !== "function") return;

    bgController = mod.start({ params: bg.params ?? {} });
}

async function loadScene(name) {
    const def = SCENES[name];
    if (!def) throw new Error(`Unknown scene: ${name}`);

    setBackground(def.bg);

    let html;
    if (def.generated) {
        html = await renderGeneratedScene(name);
    } else {
        html = await fetch(def.url, { cache: "no-store" }).then(r => r.text());
    }
    document.getElementById("app").innerHTML = html;

    // Apply generative background (must run after HTML is in DOM)
    if (def.generated) {
        const genDef = await getGeneratedSceneDef(name);
        await applySceneBackground(genDef);
    } else {
        await applySceneBackground(null);
    }

    // Importpfad relativ zu router.js (liegt in /js/)
    const mod = await import(def.module);
    if (typeof mod.default === "function") {
        mod.default({ go, ensureFullscreenOnce });
    }

    playIn();
}

export async function go(name, { outEffect = "zoom-in", originEl = null } = {}) {
    await playOut(outEffect, originEl);
    history.pushState({ scene: name }, "", `#${name}`);
    await loadScene(name);
}

function sceneFromHash() {
    const h = (location.hash || "#landing").slice(1);
    return SCENES[h] ? h : "landing";
}

window.addEventListener("popstate", () => {
    loadScene(sceneFromHash()).catch(() => { });
});

document.addEventListener("DOMContentLoaded", () => {
    applyAppConfig(APP_CONFIG);

    loadScene(sceneFromHash()).catch(() => { });
});
