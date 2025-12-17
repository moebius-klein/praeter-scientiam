export default function init({ go, ensureFullscreenOnce }) {
  // Scene-State: Δmin
  document.body.classList.remove("landing", "totum");
  document.body.classList.add("delta-min");

  ensureFullscreenOnce();

  const left = document.getElementById("relatum-left");
  const right = document.getElementById("relatum-right");

  // Links: zurück zu TOTUM
  if (left) {
    left.style.cursor = "pointer";
    left.addEventListener("click", () => {
      go("totum", { outEffect: "collapse-out", originEl: left });
    });
  }

  // Rechts: weiter zur Landing (Physik tritt ein)
  if (right) {
    right.style.cursor = "pointer";
    right.addEventListener("click", () => {
      go("delta-s", { outEffect: "zoom-in", originEl: right });
    });
  }
}
