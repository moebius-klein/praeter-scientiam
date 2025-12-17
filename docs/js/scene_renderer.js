// Generative Scene Renderer
// Renders scenes from a JSON manifest into the shared DOM container (#app).
// Keep this renderer conservative: escape text, allow explicit HTML only where intended
// (e.g., &nbsp; in SATZ labels).

let _manifest = null;

async function loadManifest() {
  if (_manifest) return _manifest;
  const res = await fetch("js/scenes/scenes.generated.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load scene manifest: ${res.status}`);
  _manifest = await res.json();
  return _manifest;
}

function escText(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// For specific fields we intentionally allow simple HTML entities (e.g., &nbsp;).
// We still block raw tags by escaping < and >.
function safeInlineHtml(s) {
  return String(s ?? "")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function attrsToString(attrs = {}) {
  const parts = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    parts.push(`${k}="${escText(v)}"`);
  }
  return parts.length ? " " + parts.join(" ") : "";
}

function renderNode(n) {
  const tag = n.tag ?? "div";
  const id = n.id ? ` id="${escText(n.id)}"` : "";
  const cls = n.class ? ` class="${escText(n.class)}"` : "";
  const attrs = attrsToString(n.attrs);
  const html = (n.html === undefined) ? "" : escText(n.html);
  return `<${tag}${id}${cls}${attrs}>${html}</${tag}>`;
}

function renderRelataImages(relataImages) {
  if (!relataImages) return "";
  const mk = (side) => {
    const r = relataImages[side];
    if (!r) return "";
    const aria = r.ariaHidden ? ' aria-hidden="true"' : "";
    const imgAlt = escText(r.imgAlt ?? "");
    const imgSrc = escText(r.imgSrc ?? "");
    return `
    <div id="${escText(r.id)}"${aria}>
        <img src="${imgSrc}" alt="${imgAlt}">
    </div>`.trim();
  };
  return `

${mk("left")}

${mk("right")}
`;
}

export async function renderScene(sceneId) {
  const manifest = await loadManifest();
  const def = manifest[sceneId];
  if (!def) throw new Error(`No manifest entry for scene: ${sceneId}`);

  const main = def.main ?? {};
  const mainId = escText(main.id ?? "scene");
  const mainClass = escText(main.class ?? "");
  const dataScene = escText(main.dataScene ?? sceneId);
  const ariaLabel = escText(main.ariaLabel ?? sceneId);

  const sb = def.satzblock ?? {};
  const sbId = escText(sb.id ?? "satzblock");
  const sbAria = escText(sb.ariaLabel ?? "");

  const satzHtml = safeInlineHtml(def.satzHtml ?? "");
  const nodesHtml = (def.nodes ?? []).map(renderNode).join("\n\n");
  const relataHtml = renderRelataImages(def.relataImages);

  return `
<main id="${mainId}" class="${mainClass}" data-scene="${dataScene}" aria-label="${ariaLabel}">
    <section id="${sbId}" aria-label="${sbAria}">
        <div id="satz">${satzHtml}</div>

${nodesHtml ? "        " + nodesHtml.replaceAll("\n", "\n        ") : ""}
    </section>${relataHtml}
</main>
`.trim();
}
