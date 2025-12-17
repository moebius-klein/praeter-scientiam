export default function init({ ensureFullscreenOnce }) {
    document.body.classList.remove("landing", "totum", "delta-min");
    document.body.classList.add("delta-s");

    ensureFullscreenOnce();
}

