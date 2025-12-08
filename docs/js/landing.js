document.addEventListener("DOMContentLoaded", () => {

    const sigillum = document.getElementById("sigillum");
    const axiomBlock = document.getElementById("axiom-block");

    let activated = false;

    sigillum.addEventListener("click", () => {

        if (activated) return;
        activated = true;

        // Zoom to ~40%
        sigillum.style.width = "40vw";

        // Show Satz −1 + Possibilitas est
        setTimeout(() => {
            axiomBlock.classList.add("show");
        }, 400);
    });
});
