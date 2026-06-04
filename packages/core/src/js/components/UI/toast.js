export class UIToast {
    constructor() {
        this.container = this._getOrCreateContainer();
        this.icons = {
            info: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8"/><line x1="10" y1="9" x2="10" y2="14"/><circle cx="10" cy="6.5" r=".8" fill="currentColor"/></svg>',
            success:
                '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10.5 9 13 14 7.5"/></svg>',
            warning:
                '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2.5L18 17H2z"/><line x1="10" y1="8.5" x2="10" y2="12.5"/><circle cx="10" cy="14.5" r=".8" fill="currentColor"/></svg>',
            danger: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8"/><line x1="7" y1="7" x2="13" y2="13"/><line x1="13" y1="7" x2="7" y2="13"/></svg>',
        };
    }

    _getOrCreateContainer() {
        let container = document.getElementById("ui-toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "ui-toast-container";
            document.body.appendChild(container);
        }
        return container;
    }

    show(title, message, type = "info", duration = 4500) {
        const toast = document.createElement("div");
        toast.className = `ui-toast ui-toast-${type}`;

        toast.innerHTML = `
            <div class="ui-toast-icon">${this.icons[type]}</div>
            <div class="ui-toast-body">
                <span class="ui-toast-title">${title}</span>
                <span class="ui-toast-msg">${message}</span>
            </div>
            <button class="ui-toast-close">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
            </button>
            <div class="ui-toast-progress"></div>
        `;

        this.container.appendChild(toast);

        // Animation de la barre de progression
        const progress = toast.querySelector(".ui-toast-progress");
        progress.style.transition = `transform ${duration}ms linear`;
        requestAnimationFrame(() => {
            requestAnimationFrame(
                () => (progress.style.transform = "scaleX(0)"),
            );
        });

        const autoClose = setTimeout(() => this.dismiss(toast), duration);

        toast.querySelector(".ui-toast-close").addEventListener("click", () => {
            clearTimeout(autoClose);
            this.dismiss(toast);
        });
    }

    dismiss(toast) {
        toast.classList.add("ui-toast-hiding");
        toast.addEventListener("animationend", () => toast.remove(), {
            once: true,
        });
    }

    // Helpers API
    success(t, m, d) {
        this.show(t, m, "success", d);
    }
    error(t, m, d) {
        this.show(t, m, "danger", d);
    }
    info(t, m, d) {
        this.show(t, m, "info", d);
    }
    warn(t, m, d) {
        this.show(t, m, "warning", d);
    }
}

// Export d'une instance unique pour usage global (uiToast.success...)
export const uiToast = new UIToast();
