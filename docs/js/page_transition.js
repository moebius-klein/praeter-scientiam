function sceneEl() {
  return document.getElementById("scene");
}

function setOriginFromElement(target, originEl) {
  if (!originEl) return;
  const r = originEl.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const x = (cx / window.innerWidth) * 100;
  const y = (cy / window.innerHeight) * 100;
  target.style.transformOrigin = `${x}% ${y}%`;
}

export async function playOut(effect, originEl = null) {
  const el = sceneEl();
  if (!el) return;

  el.classList.add("transition-target");
  document.body.classList.add("is-transitioning");
  setOriginFromElement(el, originEl);

  const cls =
    effect === "zoom-in" ? "is-zooming-in" :
      effect === "collapse-out" ? "is-collapsing-out" :
        null;

  if (!cls) return;

  // Reflow
  void el.offsetWidth;

  el.classList.add(cls);

  await new Promise((resolve) => {
    const t = setTimeout(resolve, 900);
    el.addEventListener("transitionend", () => {
      clearTimeout(t);
      resolve();
    }, { once: true });
  });
}

export function playIn() {
  const el = sceneEl();
  if (!el) return;
  el.classList.add("is-fading-in");
  // Interactions wieder an
  document.body.classList.remove("is-transitioning");
}
