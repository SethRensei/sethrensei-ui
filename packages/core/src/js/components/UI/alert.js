export class UIAlert {
    constructor(element) {
        if (!(element instanceof HTMLElement))
            throw new Error("UIAlert: element must be an HTMLElement");

        if (element._uiAlert) return element._uiAlert; // singleton guard

        this.el = element;
        this.dismissible = element.hasAttribute("data-dismissible");

        if (this.dismissible) {
            this._injectCloseButton();
        }

        element._uiAlert = this;
    }

    _injectCloseButton() {
        const btn = document.createElement("button");
        btn.className = "ui-alert-close";
        btn.setAttribute("aria-label", "Close");
        btn.innerHTML =
            '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>';
        btn.addEventListener("click", () => this.dismiss());
        this.el.appendChild(btn);
    }

    dismiss() {
        this.el.classList.add("ui-alert-hiding");
        this.el.addEventListener("animationend", () => this.el.remove(), {
            once: true,
        });
    }

    destroy() {
        delete this.el._uiAlert;
    }
}