export class RenAlert {
    /* ── Catalogue des types ── */
    static TYPES = {
        info: {
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
            iconBg: "var(--ui-alert-info-icon-bg,   #dbeafe)",
            iconColor: "var(--ui-alert-info-icon-color, #2563eb)",
            accent: "var(--ui-alert-info-accent,    #3b82f6)",
            confirmClass: "ua-btn-info",
        },
        success: {
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>`,
            iconBg: "var(--ui-alert-success-icon-bg,   #dcfce7)",
            iconColor: "var(--ui-alert-success-icon-color, #16a34a)",
            accent: "var(--ui-alert-success-accent,    #22c55e)",
            confirmClass: "ua-btn-success",
        },
        warning: {
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M10.3 3.3L2 20h20L13.7 3.3a2 2 0 00-3.4 0z"/><path d="M12 10v4M12 17h.01"/></svg>`,
            iconBg: "var(--ui-alert-warning-icon-bg,   #fef9c3)",
            iconColor: "var(--ui-alert-warning-icon-color, #ca8a04)",
            accent: "var(--ui-alert-warning-accent,    #eab308)",
            confirmClass: "ua-btn-warning",
        },
        danger: {
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`,
            iconBg: "var(--ui-alert-danger-icon-bg,   #fee2e2)",
            iconColor: "var(--ui-alert-danger-icon-color, #dc2626)",
            accent: "var(--ui-alert-danger-accent,    #ef4444)",
            confirmClass: "ua-btn-danger",
        },
        error: {
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`,
            iconBg: "var(--ui-alert-error-icon-bg,   #fee2e2)",
            iconColor: "var(--ui-alert-error-icon-color, #dc2626)",
            accent: "var(--ui-alert-error-accent,    #ef4444)",
            confirmClass: "ua-btn-danger",
        },
        confirm: {
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>`,
            iconBg: "var(--ui-alert-confirm-icon-bg,   #eff6ff)",
            iconColor: "var(--ui-alert-confirm-icon-color, #2563eb)",
            accent: "var(--ui-alert-confirm-accent,    #3b82f6)",
            confirmClass: "ua-btn-info",
            showCancel: true,
        },
        loading: {
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" class="ua-spin"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="10"/></svg>`,
            iconBg: "var(--ui-alert-loading-icon-bg,   #f1f5f9)",
            iconColor: "var(--ui-alert-loading-icon-color, #64748b)",
            accent: "var(--ui-alert-loading-accent,    #94a3b8)",
            confirmClass: "",
            closable: false,
            showCancel: false,
        },
        prompt: {
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
            iconBg: "var(--ui-alert-prompt-icon-bg,   #f0f9ff)",
            iconColor: "var(--ui-alert-prompt-icon-color, #0284c7)",
            accent: "var(--ui-alert-prompt-accent,    #0ea5e9)",
            confirmClass: "ua-btn-info",
            showCancel: true,
        },
        classic: {
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
            iconBg: "var(--ui-alert-classic-icon-bg,   #f8fafc)",
            iconColor: "var(--ui-alert-classic-icon-color, #475569)",
            accent: "var(--ui-alert-classic-accent,    #64748b)",
            confirmClass: "ua-btn-classic",
        },
    };

    /* ── Méthodes statiques de raccourci ── */
    static info(title, message, opts = {}) {
        return RenAlert.show("info", title, message, opts);
    }
    static success(title, message, opts = {}) {
        return RenAlert.show("success", title, message, opts);
    }
    static warning(title, message, opts = {}) {
        return RenAlert.show("warning", title, message, opts);
    }
    static danger(title, message, opts = {}) {
        return RenAlert.show("danger", title, message, opts);
    }
    static error(title, message, opts = {}) {
        return RenAlert.show("error", title, message, opts);
    }
    static confirm(title, message, opts = {}) {
        return RenAlert.show("confirm", title, message, opts);
    }
    static loading(title, message, opts = {}) {
        return RenAlert.show("loading", title, message, {
            ...opts,
            showCancel: false,
            closable: false,
        });
    }
    static prompt(title, message, opts = {}) {
        return RenAlert.show("prompt", title, message, opts);
    }
    static classic(title, message, opts = {}) {
        return RenAlert.show("classic", title, message, opts);
    }
    static custom(opts = {}) {
        return RenAlert.show(
            opts.type ?? "info",
            opts.title ?? "",
            opts.message ?? "",
            opts,
        );
    }

    /* ── Constructeur principal ── */
    static show(type, title, message, opts = {}) {
        const def = RenAlert.TYPES[type] ?? RenAlert.TYPES.info;

        const cfg = {
            confirmLabel:
                opts.confirmLabel ?? (type === "danger" ? "Delete" : "OK"),
            cancelLabel: opts.cancelLabel ?? "Cancel",
            showCancel: opts.showCancel ?? def.showCancel ?? false,
            closable: opts.closable ?? def.closable ?? true,
            autoClose: opts.autoClose ?? null,
            placeholder: opts.placeholder ?? "",
            inputType: opts.inputType ?? "text",
            onConfirm: opts.onConfirm ?? null,
            onCancel: opts.onCancel ?? null,
            isPrompt: type === "prompt",
            isLoading: type === "loading",
        };

        /* ── DOM ── */
        const overlay = document.createElement("div");
        overlay.className = "ua-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-labelledby", "ua-title");

        overlay.innerHTML = `
            <div class="ua-box ua-${type}">
                <div class="ua-accent-bar" style="background:${def.accent}"></div>
                <div class="ua-body">
                    <div class="ua-icon-wrap" style="background:${def.iconBg};color:${def.iconColor}">
                        ${def.icon}
                    </div>
                    <div class="ua-content">
                        <div class="ua-title" id="ua-title">${title}</div>
                        ${message ? `<div class="ua-message">${message}</div>` : ""}
                        ${cfg.isPrompt ? `<input class="ua-input" type="${cfg.inputType}" placeholder="${cfg.placeholder}" autocomplete="off" spellcheck="false"/>` : ""}
                        ${cfg.isLoading ? `<div class="ua-loading-dots"><span></span><span></span><span></span></div>` : ""}
                    </div>
                </div>
                ${
                    !cfg.isLoading
                        ? `
                <div class="ua-footer">
                    ${cfg.showCancel ? `<button class="ua-btn ua-btn-cancel" data-action="cancel">${cfg.cancelLabel}</button>` : ""}
                    <button class="ua-btn ${def.confirmClass}" data-action="confirm">${cfg.confirmLabel}</button>
                </div>`
                        : ""
                }
            </div>
        `;

        document.body.appendChild(overlay);

        /* Animation entrée */
        requestAnimationFrame(() => overlay.classList.add("ua-open"));

        /* Focus */
        const input = overlay.querySelector(".ua-input");
        const btnConfirm = overlay.querySelector("[data-action='confirm']");
        const btnCancel = overlay.querySelector("[data-action='cancel']");
        setTimeout(() => {
            (input ?? btnConfirm)?.focus();
        }, 60);

        /* ── Fermeture ── */
        let _closed = false;
        const close = (action = "cancel") => {
            if (_closed) return;
            _closed = true;
            clearTimeout(_autoTimer);
            overlay.classList.remove("ua-open");
            overlay.classList.add("ua-closing");
            overlay.addEventListener("transitionend", () => {
                    if (overlay.classList.contains("ua-closing")) {
                        overlay.remove();
                    }
                },
                { once: true },
            );

            if (action === "confirm") {
                const val = input ? input.value.trim() : true;
                cfg.onConfirm?.(val);
            } else {
                cfg.onCancel?.();
            }
        };

        /* Boutons */
        btnConfirm?.addEventListener("click", () => close("confirm"));
        btnCancel?.addEventListener("click", () => close("cancel"));

        /* Clic overlay */
        if (cfg.closable) {
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) close("cancel");
            });
        }

        /* Escape */
        const _esc = (e) => {
            if (e.key === "Escape" && cfg.closable) {
                close("cancel");
                document.removeEventListener("keydown", _esc);
            }
        };
        document.addEventListener("keydown", _esc);

        /* Enter dans le prompt */
        if (cfg.isPrompt) {
            input?.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    close("confirm");
                }
            });
        }

        /* Auto-close */
        let _autoTimer = null;
        if (cfg.autoClose) {
            _autoTimer = setTimeout(() => close("confirm"), cfg.autoClose);
        }

        /* Retour pour .loading (expose close) */
        return { close: () => close("cancel") };
    }
}
