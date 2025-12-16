import { playOut, playIn } from "./page_transition.js";
import { ensureFullscreenOnce } from "./fullscreen.js";

const SCENES = {
    landing: { url: "js/scenes/landing.html", module: "./scenes/landing_scene.js", bg: "stars" },
    totum: { url: "js/scenes/totum.html", module: "./scenes/totum_scene.js", bg: "none" },
    "delta-min": { url: "js/scenes/delta-min.html", module: "./scenes/delta-min_scene.js", bg: "none" }
};

function setBackground(mode) {
    const star = document.getElementById("starfield-canvas");
    const neb = document.getElementById("nebula-canvas");
    const show = (mode === "stars");
    if (star) star.style.display = show ? "block" : "none";
    if (neb) neb.style.display = show ? "block" : "none";
}

async function loadScene(name) {
    const def = SCENES[name];
    if (!def) throw new Error(`Unknown scene: ${name}`);

    setBackground(def.bg);

    const html = await fetch(def.url, { cache: "no-store" }).then(r => r.text());
    document.getElementById("app").innerHTML = html;

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
    loadScene(sceneFromHash()).catch(() => { });
});
