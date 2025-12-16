// js/nav_totum.js
import { transitionTo } from "./page_transition.js";

document.addEventListener("DOMContentLoaded", () => {
  const left = document.getElementById("relatum-left");   // TOTUM
  const right = document.getElementById("relatum-right"); // ohne TOTUM
  const main = document.querySelector("main");

  if (left) {
    left.style.cursor = "pointer";
    left.addEventListener("click", () => {
      transitionTo("index.html", "collapse-out", left, { targetEl: main });
    });
  }

  if (right) {
    right.style.cursor = "pointer";
    right.addEventListener("click", () => {
      transitionTo("delta-min.html", "zoom-in", right, { targetEl: main });
    });
  }
});
