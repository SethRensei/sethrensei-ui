export class UIAlert {
    constructor(element) {
        if (!(element instanceof HTMLElement))
            throw new Error("UIAlert: element must be an HTMLElement");

        if (element._uiAlert) return element._uiAlert; // singleton guard

        this.el = element;
        this.dismissible = element.hasAttribute("data-dismissible");
        this.duration = this._getDuration();
        this.autoDismissTimer = null;
        this.dismissed = false;
        this.animationEndHandler = (event) => {
            if (event.target !== this.el || !this.dismissed) return;

            this.el.removeEventListener(
                "animationend",
                this.animationEndHandler,
            );
            this.el.remove();
        };

        if (this.dismissible) {
            this._injectCloseButton();
        }

        if (this.duration !== null) {
            this.autoDismissTimer = setTimeout(
                () => this.dismiss(),
                this.duration,
            );
        }

        element._uiAlert = this;
    }

    _getDuration() {
        if (!this.el.hasAttribute("data-duration")) return null;

        const value = this.el.getAttribute("data-duration").trim();
        const duration = Number(value);

        if (value === "" || !Number.isFinite(duration) || duration < 0) {
            console.error(
                "[UIAlert] data-duration must be a non-negative number of milliseconds.",
                this.el,
            );
            return null;
        }

        return duration;
    }

    _injectCloseButton() {
        const btn = document.createElement("button");
        btn.className = "ui-alert-close";
        btn.setAttribute("aria-label", "Close");
        btn.innerHTML =
            '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>';
        btn.addEventListener("click", () => this.dismiss());
        this.el.appendChild(btn);
        this.closeButton = btn;
    }

    dismiss() {
        if (this.dismissed) return;

        this.dismissed = true;
        clearTimeout(this.autoDismissTimer);
        this.autoDismissTimer = null;
        this.el.classList.add("ui-alert-hiding");
        this.el.addEventListener("animationend", this.animationEndHandler);
    }

    destroy() {
        clearTimeout(this.autoDismissTimer);
        this.autoDismissTimer = null;
        this.el.removeEventListener("animationend", this.animationEndHandler);
        this.el.classList.remove("ui-alert-hiding");
        this.closeButton?.remove();
        this.dismissed = false;
        delete this.el._uiAlert;
    }
}