import { transitionTo } from "./page_transition.js";
import { INTRO_ZOOM_MS } from "./landing.js"; // falls landing.js als module läuft

document.addEventListener("DOMContentLoaded", () => {
  const sigillum = document.getElementById("sigillum");
  const wrapper  = document.getElementById("sigillum-wrapper");

  if (!sigillum || !wrapper) return;

  let armed = false; // erster Klick erfolgt
  let ready = false; // Intro ist fertig, zweiter Klick darf navigieren
  let timer = null;

  sigillum.style.cursor = "pointer";

  sigillum.addEventListener("click", () => {
    // Klick 2: nur wenn Intro fertig ist -> navigieren
    if (ready) {
      transitionTo("totum.html", "zoom-in", sigillum, { targetEl: wrapper });
      return;
    }

    // Klick 1: Intro starten (oder "armen")
    if (!armed) {
      armed = true;

      // landing.js startet den Intro-Zoom bereits durch seinen eigenen Click-Handler.
      // Wir koppeln hier nur "ready" an die Dauer.
      timer = window.setTimeout(() => {
        ready = true;

        // Optional: visuelles Signal, dass ein zweiter Klick erwartet wird.
        // wrapper.classList.add("is-ready"); // falls du so etwas möchtest
      }, INTRO_ZOOM_MS);

      return;
    }

    // Falls der User während des laufenden Intros nochmal klickt:
    // Ignorieren (oder optional "skip" implementieren).
  });
});
