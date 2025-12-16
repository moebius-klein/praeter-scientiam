let fsArmed = false;

export function ensureFullscreenOnce(onFirstGestureWork) {
    if (fsArmed) return;
    fsArmed = true;

    const onFirstGesture = (ev) => {
        document.removeEventListener("pointerdown", onFirstGesture, true);

        // 1) Alles, was als User-Gesture gelten muss: sofort ausführen
        try { onFirstGestureWork?.(ev); } catch (_) { }

        // 2) Fullscreen anstoßen – NICHT awaiten
        try {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen?.();
            }
        } catch (_) {
            // Browser kann blocken – dann bleibt es normal
        }
    };

    document.addEventListener("pointerdown", onFirstGesture, true);
}
