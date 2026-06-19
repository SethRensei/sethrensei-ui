export class UILoader {
    // Registre des spinners disponibles : la clé correspond à data-loader="..."
    // et à la classe CSS .loader-<clé> déjà définie dans le design system.
    static SPINNERS = {
        "circle-2": `<div class="loader-circle-2"></div>`,
        "circle-11": `
            <div class="loader-circle-11">
                <div class="arc"></div>
                <div class="arc"></div>
                <div class="arc"></div>
            </div>
        `,
    };

    constructor({
        selector = ".ui-loader-overlay",
        minDuration = 400, // ms — anti-flash si tout va trop vite
        maxDuration = 8000, // ms — sécurité si rien n'appelle hide()
    } = {}) {
        this.minDuration = minDuration;
        this.maxDuration = maxDuration;
        this.startedAt = Date.now();
        this.hidden = false;
        this.failsafeTimer = null;

        // On cherche l'overlay déjà présent dans le HTML — jamais créé par la classe.
        this.overlay = document.querySelector(selector);

        if (!this.overlay) {
            // Aucun loader dans cette page : la classe devient un no-op silencieux.
            return;
        }

        this._renderSpinner();
        this.failsafeTimer = setTimeout(
            () => this.hide("timeout"),
            this.maxDuration,
        );
    }

    _renderSpinner() {
        // Si l'utilisateur a déjà écrit le markup interne à la main, on n'y touche pas.
        if (this.overlay.children.length > 0) return;

        const type = this.overlay.dataset.loader || "circle-2";
        const markup = UILoader.SPINNERS[type];

        if (!markup) {
            console.warn(`[UILoader] type de spinner inconnu : "${type}"`);
            return;
        }

        this.overlay.innerHTML = markup;
    }

    hide(reason = "ok") {
        if (this.hidden || !this.overlay) return;
        this.hidden = true;
        clearTimeout(this.failsafeTimer);

        const elapsed = Date.now() - this.startedAt;
        const wait = Math.max(0, this.minDuration - elapsed);

        setTimeout(() => {
            const remove = () => this.overlay?.remove();

            this.overlay.classList.add("ui-loader-hide");
            this.overlay.addEventListener("transitionend", remove, {
                once: true,
            });

            // Filet de sécurité si la transition ne se déclenche jamais
            // (ex: prefers-reduced-motion, ou pas de transition CSS définie).
            setTimeout(remove, 400);

            if (reason !== "ok") {
                console.warn(`[UILoader] masqué via fallback : "${reason}"`);
            }
            document.dispatchEvent(
                new CustomEvent("ui:loader-hidden", { detail: { reason } }),
            );
        }, wait);
    }
}

// Export d'une instance unique pour usage global (uiLoader.hide()...)
export const uiLoader = new UILoader();