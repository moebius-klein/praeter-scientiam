// Zentrale, manuell editierbare App-Konfiguration (ohne Async-Load).
// Hinweis: Werte sind bewusst simpel gehalten, um sie ohne Tooling pflegen zu können.

export const APP_CONFIG = {
  // φ-Minor Skalierung relativ zur Hauptschrift (in em).
  // Default: 1/φ ≈ 0.6180339887
  phiMinorScaleEm: 0.8
};

export function applyAppConfig(cfg = APP_CONFIG) {
  const v = Number(cfg?.phiMinorScaleEm);
  if (Number.isFinite(v) && v > 0) {
    document.documentElement.style.setProperty("--phi-minor-scale", `${v}em`);
  }
}
