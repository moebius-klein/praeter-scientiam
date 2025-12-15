async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
}

function getLangOverrideFromQuery() {
    const p = new URLSearchParams(window.location.search);
    const lang = p.get("lang");
    if (!lang) return null;
    const cleaned = lang.trim();
    if (!/^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4})?$/.test(cleaned)) return null;
    return cleaned.toLowerCase();
}

function getBrowserLangCandidates() {
    const langs = Array.isArray(navigator.languages) && navigator.languages.length
        ? navigator.languages
        : [navigator.language].filter(Boolean);

    const out = [];
    for (const l of langs) {
        const s = String(l).toLowerCase();
        if (!s) continue;
        out.push(s);
        const base = s.split("-")[0];
        if (base && base !== s) out.push(base);
    }
    return [...new Set(out)];
}

(async () => {
    const cfg = await fetchJson("i18n/config.json");
    if (!cfg || !cfg.enable_mouse_over) return; // harter Kill-Switch

    const trigger = document.getElementById("possibilitas");
    const tooltip = document.getElementById("gloss-possibilitas");
    if (!trigger || !tooltip) return;

    const queryLang = getLangOverrideFromQuery();
    const candidates = queryLang ? [queryLang, queryLang.split("-")[0]] : getBrowserLangCandidates();

    let dict = null;
    let usedLang = null;

    for (const lang of candidates) {
        const d = await fetchJson(`i18n/${lang}.mouse_over.json`);
        if (d && typeof d === "object") { dict = d; usedLang = lang; break; }
    }

    if (!dict) return; // Sprache nicht gefunden => keine Übersetzung

    const text = dict.possibilitas_est;
    if (!text) return;

    tooltip.textContent = text;
    document.body.classList.add("gloss-enabled");
    if (usedLang) document.documentElement.lang = usedLang;
})();
