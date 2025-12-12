document.addEventListener("DOMContentLoaded", () => {

    const sigillum = document.getElementById("sigillum");
    const sigillumWrapper = document.getElementById("sigillum-wrapper");
    const axiomBlock = document.getElementById("axiom-block");

    let activated = false;

    sigillum.addEventListener("click", () => {

        if (activated) return;
        activated = true;

        // Zoom via CSS-Klasse
        sigillumWrapper.classList.add("zoom");

        // Satz −1 + Possibilitas est einblenden
        setTimeout(() => {
            axiomBlock.classList.add("show");
        }, 400);
    });
});