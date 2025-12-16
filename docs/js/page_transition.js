// js/page_transition.js

function pickTarget() {
  // Prefer <main> on content pages
  const main = document.querySelector("main");
  if (main) return main;

  // Landing page wrapper
  const landing = document.getElementById("landing-container");
  if (landing) return landing;

  return document.body;
}

function setOriginFromElement(target, originEl) {
  if (!originEl) return;

  const rect = originEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const xPct = (cx / window.innerWidth) * 100;
  const yPct = (cy / window.innerHeight) * 100;

  target.style.transformOrigin = `${xPct}% ${yPct}%`;
}

export function transitionTo(url, effect, originEl = null, options = {}) {
  const target = options.targetEl ?? pickTarget();
  if (!target) {
    window.location.href = url;
    return;
  }

  target.classList.add("transition-target");
  document.body.classList.add("is-transitioning");

  setOriginFromElement(target, originEl);

  const cls =
    effect === "zoom-in" ? "is-zooming-in" :
    effect === "collapse-out" ? "is-collapsing-out" :
    null;

  if (!cls) {
    window.location.href = url;
    return;
  }

  // Force style flush so the transition reliably starts
  void target.offsetWidth;

  target.classList.add(cls);

  const timeoutMs = effect === "zoom-in" ? 900 : 850;
  const fallback = window.setTimeout(() => {
    window.location.href = url;
  }, timeoutMs);

  target.addEventListener("transitionend", () => {
    window.clearTimeout(fallback);
    window.location.href = url;
  }, { once: true });
}
