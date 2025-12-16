// js/scenes/landing_scene.js

export default function init({ go, ensureFullscreenOnce }) {
  const landingContainer = document.getElementById("landing-container");
  const sigillum = document.getElementById("sigillum");
  const sigillumWrapper = document.getElementById("sigillum-wrapper");
  const axiomBlock = document.getElementById("axiom-block");

  if (!landingContainer || !sigillum || !sigillumWrapper || !axiomBlock) return;

  const INTRO_ZOOM_MS = 15000;

  // 2-Klick-Logik:
  let activated = false; // Intro läuft/gelaufen (1. Klick)
  let ready = false;     // Intro fertig (2. Klick erlaubt)

  sigillum.style.cursor = "pointer";

  /* -------------------------------------------------
     Audio setup (user-gesture safe)
     ------------------------------------------------- */
  const introAudio = new Audio("audio/grieg_morning_mood.mp3");
  introAudio.preload = "auto";
  introAudio.volume = 0.6;

  function playIntroAudio() {
    // Muss im User-Gesture Callstack passieren
    introAudio.play().catch(() => { });
  }

  /* -------------------------------------------------
     Stufenloser Zoom (15s, sehr langsamer Start)
     ------------------------------------------------- */
  function zoomSigillum({ el, startScale = 0.30, endScale = 1.00, durationMs = 15000 }) {
    const start = performance.now();

    function easeSlowStart(t) {
      t = Math.max(0, Math.min(1, t));
      const a = Math.pow(t, 4);            // extrem langsamer Anfang
      const b = 1 - Math.pow(1 - t, 2);    // weicher Auslauf
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
    // Audio + Zoom + UI + Stars
    playIntroAudio();

    sigillumWrapper.classList.add("zoom");
    zoomSigillum({
      el: sigillumWrapper,
      startScale: 0.30,
      endScale: 1.00,
      durationMs: INTRO_ZOOM_MS
    });

    setTimeout(() => {
      axiomBlock.classList.add("show");
    }, 400);

    setTimeout(() => {
      landingContainer.classList.add("space-active");

      if (window.CodexStarfield && typeof window.CodexStarfield.start === "function") {
        window.CodexStarfield.start({ maskElement: sigillum });
      }
    }, 3000);

    setTimeout(() => {
      ready = true;
    }, INTRO_ZOOM_MS);
  }

  // Fullscreen: beim ersten Gesture „scharf schalten“,
  // aber Intro NICHT automatisch starten – Intro startet nur auf Sigillum-Geste.
  ensureFullscreenOnce();

  // WICHTIG: pointerdown ist für Audio/Policies robuster als click
  sigillumWrapper.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();

    // 2. Klick -> Szene wechseln
    if (ready) {
      go("totum", { outEffect: "zoom-in", originEl: sigillum });
      return;
    }

    // 1. Klick -> Intro starten
    if (!activated) {
      activated = true;
      startIntroNow();
    }
  }, { passive: false });
}
