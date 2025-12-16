document.body.classList.remove("totum");
document.body.classList.add("landing");

export default function init({ go, ensureFullscreenOnce }) {
    document.body.classList.remove("totum");
    document.body.classList.add("landing");

    const landingContainer = document.getElementById("landing-container");
    const sigillum = document.getElementById("sigillum");
    const sigillumWrapper = document.getElementById("sigillum-wrapper");
    const axiomBlock = document.getElementById("axiom-block");

    if (!landingContainer || !sigillum || !sigillumWrapper) return;

    const INTRO_ZOOM_MS = 15000;

    // 2‑Klick-Logik:
    let activated = false; // Intro läuft/gelaufen (1. Interaktion)
    let ready = false;     // Intro fertig (2. Interaktion erlaubt)

    sigillum.style.cursor = "pointer";

    /* -------------------------------------------------
       Audio setup (singleton, user-gesture safe)
       ------------------------------------------------- */
    // Persistiert über Szenenwechsel hinweg: kein Neustart bei "Zurück" + erneutem Klick.
    const introAudio =
        window.__CodexIntroAudio ??
        (window.__CodexIntroAudio = new Audio("audio/grieg_morning_mood.mp3"));

    introAudio.preload = "auto";
    introAudio.volume = 0.6;

    function playIntroAudio() {
        // Nicht neu starten, wenn es bereits läuft
        if (!introAudio.paused && !introAudio.ended) return;

        introAudio.play().catch(() => { /* ggf. geblockt */ });
    }

    /* -------------------------------------------------
       Stufenloser Zoom (15s, sehr langsamer Start)
       ------------------------------------------------- */
    function zoomSigillum({ el, startScale = 0.30, endScale = 1.00, durationMs = 15000 }) {
        const start = performance.now();

        function easeSlowStart(t) {
            t = Math.max(0, Math.min(1, t));
            const a = Math.pow(t, 4);         // extrem langsamer Anfang
            const b = 1 - Math.pow(1 - t, 2); // weicher Auslauf
            return 0.78 * a + 0.22 * b;
        }

        function frame(now) {
            const t = (now - start) / durationMs;
            const p = easeSlowStart(t);
            const s = startScale + (endScale - startScale) * p;

            el.style.transform = `translate(-50%, -50%) scale(${s})`;
            if (t < 1) requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    }

    function startIntroNow() {
        // 1) Audio
        playIntroAudio();

        // 2) Zoom
        sigillumWrapper.classList.add("zoom");
        zoomSigillum({
            el: sigillumWrapper,
            startScale: 0.30,
            endScale: 1.00,
            durationMs: INTRO_ZOOM_MS
        });

        // 3) Axiom-Block (optional)
        if (axiomBlock) {
            setTimeout(() => {
                axiomBlock.classList.add("show");
            }, 400);
        }

        // 4) Cosmos: nach 3s Canvas einblenden + Starfield starten
        setTimeout(() => {
            // Canvas-Opacity wird über body.space-active getoggelt (siehe css/landing.css)
            document.body.classList.add("space-active");

            if (window.CodexStarfield && typeof window.CodexStarfield.start === "function") {
                window.CodexStarfield.start({ maskElement: sigillum });
            }
        }, 3000);

        // 5) Ready nach Intro-Dauer
        setTimeout(() => {
            ready = true;
        }, INTRO_ZOOM_MS);
    }

    // Fullscreen wird über den ersten Pointerdown irgendwo angefordert.
    // Wichtig: NICHT den Intro-Start hier dran koppeln – Intro startet am Sigillum.
    ensureFullscreenOnce();

    // pointerdown ist für Autoplay/Fullscreen‑Policies robuster als click
    sigillumWrapper.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();

        if (ready) {
            go("totum", { outEffect: "zoom-in", originEl: sigillum });
            return;
        }

        if (!activated) {
            activated = true;
            startIntroNow();
        }
    }, { passive: false });
}
