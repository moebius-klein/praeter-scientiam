export default function init({ go, ensureFullscreenOnce }) {
  // Scene-State
  document.body.classList.add("totum");

  ensureFullscreenOnce();

  const left = document.getElementById("relatum-left");
  const right = document.getElementById("relatum-right");

  if (left) {
    left.style.cursor = "pointer";
    left.addEventListener("click", () => {
      go("landing", { outEffect: "collapse-out", originEl: left });
    });
  }

  if (right) {
    right.style.cursor = "pointer";
    right.addEventListener("click", () => {
      go("delta-min", { outEffect: "zoom-in", originEl: right });
    });
  }
}
