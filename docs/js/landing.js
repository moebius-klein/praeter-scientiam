document.addEventListener("DOMContentLoaded", () => {
  const landingContainer = document.getElementById("landing-container");

  const sigillum = document.getElementById("sigillum");
  const sigillumWrapper = document.getElementById("sigillum-wrapper");
  const axiomBlock = document.getElementById("axiom-block");

  let activated = false;

  /* -------------------------------------------------
     Fullscreen helper
     ------------------------------------------------- */
  function requestFullscreen(targetEl) {
    const el = targetEl || document.documentElement;

    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    if (el.msRequestFullscreen) return el.msRequestFullscreen();

    return Promise.resolve();
  }

  /* -------------------------------------------------
     Audio setup (user-gesture safe)
     ------------------------------------------------- */
  const introAudio = new Audio("audio/grieg_morning_mood.mp3");
  introAudio.preload = "auto";
  introAudio.volume = 0.6;

  function playIntroAudio() {
    // play() MUST be inside the click handler call stack
    introAudio.play().catch(() => {
      // silently ignore (browser may block if gesture lost)
    });
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

  /* -------------------------------------------------
     Click handler (zentraler Eintrittspunkt)
     ------------------------------------------------- */
  sigillumWrapper.addEventListener("click", () => {
    if (activated) return;
    activated = true;

    // 1) Fullscreen (sofort)
    requestFullscreen(document.documentElement).catch(() => {
      requestFullscreen(sigillumWrapper).catch(() => {});
    });

    // 2) Audio starten (synchron mit Zoom)
    playIntroAudio();

    // 3) Zoom starten (stufenlos)
    sigillumWrapper.classList.add("zoom"); // Marker
    zoomSigillum({
      el: sigillumWrapper,
      startScale: 0.30,
      endScale: 1.00,
      durationMs: 15000
    });

    // 4) Satz −1 / Possibilitas est!
    setTimeout(() => {
      axiomBlock.classList.add("show");
    }, 400);

    // 5) Cosmos erst nach 3 Sekunden
    setTimeout(() => {
      landingContainer.classList.add("space-active");

      if (window.CodexStarfield && typeof window.CodexStarfield.start === "function") {
        window.CodexStarfield.start({ maskElement: sigillum });
      }
    }, 3000);
  });
});
