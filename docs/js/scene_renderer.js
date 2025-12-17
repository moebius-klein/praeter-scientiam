let _generatedCache = null;

async function loadGeneratedScenes() {
  if (_generatedCache) return _generatedCache;
  _generatedCache = await fetch("js/scenes/scenes.generated.json", { cache: "no-store" }).then(r => r.json());
  return _generatedCache;
}

export async function getGeneratedSceneDef(name) {
  const data = await loadGeneratedScenes();
  // je nach Struktur: entweder data[name] oder data.scenes[name]
  return data[name] ?? data.scenes?.[name] ?? null;
}

// Generativer Scene-Renderer für einfache, hochgradig deckungsgleiche Scenes.
// Lädt ein JSON-Manifest und rendert HTML anhand einer gemeinsamen Struktur.
// Hinweis: Text wird escaped; SATZ erlaubt HTML-Entities (&nbsp; etc.), aber keine Tags.

let _manifestPromise = null;

async function loadManifest() {
  if (_manifestPromise) return _manifestPromise;
  _manifestPromise = fetch("js/scenes/scenes.generated.json", { cache: "no-store" })
    .then(r => {
      if (!r.ok) throw new Error(`Failed to load scenes.generated.json: ${r.status}`);
      return r.json();
    });
  return _manifestPromise;
}

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}



// Strenge φ-Minor-Regel: Nur reine Kleinbuchstaben-Wörter [a-z]+ werden als Minor gesetzt.
// Damit sind z. B. "cum", "sui", "est" minor; "Cum", "EST", "cvm" (falls groß) nicht.
function renderPhiMinor(text) {
  const safe = esc(text ?? "");
  return safe.replace(/\b([a-z]+)\b/g, '<span class="minor">$1</span>');
}
// Erlaubt Entities, aber keine Tags. Minimale Sanitization für "SATZ&nbsp;0" etc.
function allowEntitiesNoTags(s) {
  const str = String(s ?? "");
  return str.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function renderRelatum(rel) {
  if (!rel?.id || !rel?.imgSrc) return "";
  const ariaHidden = rel.ariaHidden ? ' aria-hidden="true"' : "";
  const alt = rel.imgAlt ?? "";
  return `
    <div id="${esc(rel.id)}"${ariaHidden}>
      <img src="${esc(rel.imgSrc)}" alt="${esc(alt)}">
    </div>
  `.trim();
}

export async function renderGeneratedScene(sceneId) {
  const manifest = await loadManifest();
  const def = manifest[sceneId];
  if (!def) throw new Error(`No generated scene definition for: ${sceneId}`);

  const contentBlocks = (def.content ?? []).map(block => {
    const id = esc(block.id ?? "");
    const text = renderPhiMinor(block.text ?? "");
    const ariaDesc = block.ariaDescribedBy ? ` aria-describedby="${esc(block.ariaDescribedBy)}"` : "";
    const gloss = block.glossId
      ? `<div id="${esc(block.glossId)}" class="gloss" role="tooltip" aria-hidden="true"></div>`
      : "";
    return `
      <div id="${id}"${ariaDesc}>
        ${text}
      </div>
      ${gloss}
    `.trim();
  }).join("\n");

  const relataLeft = def.relata?.left ? renderRelatum(def.relata.left) : "";
  const relataRight = def.relata?.right ? renderRelatum(def.relata.right) : "";

  const html = `
    <main id="scene" class="${esc(def.class ?? "")}" data-scene="${esc(sceneId)}" aria-label="${esc(def.ariaLabel ?? sceneId)}">
      <section id="satzblock" aria-label="${esc(def.satzblockAria ?? def.ariaLabel ?? sceneId)}">
        <div id="satz">${allowEntitiesNoTags(def.satzHtml ?? "")}</div>
        ${contentBlocks}
      </section>
      ${relataLeft}
      ${relataRight}
    </main>
  `.trim();

  return html;
}
