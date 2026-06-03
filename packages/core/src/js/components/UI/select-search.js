export class UISelect {
    constructor(element, options = {}) {
        if (!(element instanceof HTMLElement))
            throw new Error("UISelect: element must be an HTMLElement");
        if (element._uiSelect) return element._uiSelect; // singleton guard

        this.el = element;
        this.opts = Object.assign(
            { closeOnSelect: true, searchDelay: 0 },
            options,
        );
        this.multiple = element.dataset.multiple === "true";
        this.selected = new Map(); // value → label
        this._focusIdx = -1;

        this._bindDOM();
        this._bindEvents();
        this._syncInitial();

        element._uiSelect = this;
    }

    /* ── DOM binding ─────────────────────────────────────── */
    _bindDOM() {
        this.trigger = this.el.querySelector(".ui-select-trigger");

        // 1. Injection automatique du chevron dans le trigger s'il n'existe pas
        if (!this.el.querySelector(".ui-select-chevron")) {
            const chevronHTML = `<svg class="ui-select-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7.5l5 5 5-5"/></svg>`;
            this.trigger.insertAdjacentHTML("beforeend", chevronHTML);
        }

        // 2. Injection automatique du bouton "Clear" dans le wrapper principal s'il n'existe pas
        if (!this.el.querySelector(".ui-select-clear")) {
            const clearHTML = `
                <button type="button" class="ui-select-clear" aria-label="Clear" hidden>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                </button>`;
            // On l'insère au tout début du conteneur principal .ui-select
            this.el.insertAdjacentHTML("afterbegin", clearHTML);
        }

        // 3. Liaison classique des éléments maintenant qu'ils sont dans le DOM
        this.trigger = this.el.querySelector(".ui-select-trigger");
        this.dropdown = this.el.querySelector(".ui-select-dropdown");
        this.searchEl = this.el.querySelector(".ui-select-search");
        this.optsList = this.el.querySelector(".ui-select-options");
        this.clearBtn = this.el.querySelector(".ui-select-clear");
        this.content = this.trigger.querySelector(".ui-select-trigger-content");
        this.placeholder = this.trigger.querySelector(".ui-select-placeholder");
        this.emptyMsg = this.el.querySelector(".ui-select-empty");
        this.allOptions = () => [
            ...this.optsList.querySelectorAll(".ui-option"),
        ];
        this.visibleOptions = () =>
            this.allOptions().filter((o) => o.dataset.hidden !== "true");
    }

    /* ── Event listeners ─────────────────────────────────── */
    _bindEvents() {
        // Toggle on trigger click
        this.trigger.addEventListener("click", (e) => {
            if (e.target === this.clearBtn || this.clearBtn?.contains(e.target))
                return;
            this.toggle();
        });

        // Clear button
        this.clearBtn?.addEventListener("click", (e) => {
            e.stopPropagation();
            this.clear();
        });

        // Search
        this.searchEl?.addEventListener("input", () =>
            this.search(this.searchEl.value),
        );

        // Option click
        this.optsList.addEventListener("click", (e) => {
            const opt = e.target.closest(".ui-option");
            if (opt) this._selectOption(opt);
        });

        // Keyboard navigation on trigger
        this.trigger.addEventListener("keydown", (e) =>
            this._handleTriggerKey(e),
        );

        // Keyboard navigation on dropdown
        this.el.addEventListener("keydown", (e) => this._handleDropdownKey(e));

        // Close on outside click
        this._outsideHandler = (e) => {
            if (!this.el.contains(e.target)) this.close();
        };
        document.addEventListener("mousedown", this._outsideHandler);
    }

    /* ── Sync pre-selected values (SSR support) ──────────── */
    _syncInitial() {
        this.allOptions().forEach((opt) => {
            if (opt.dataset.selected === "true") {
                const value = opt.dataset.value;
                const label =
                    opt.querySelector(".ui-option-label")?.textContent.trim() ||
                    value;
                this.selected.set(value, label);
                opt.setAttribute("aria-selected", "true");
            }
        });
        if (this.selected.size) this._renderTrigger();
    }

    /* ── Open ────────────────────────────────────────────── */
    open() {
        if (this.el.dataset.disabled === "true") return;
        this.el.dataset.open = "true";
        this.trigger.setAttribute("aria-expanded", "true");
        this.searchEl?.focus();
        this._focusIdx = -1;
        this._emit("select:open");
    }

    /* ── Close ───────────────────────────────────────────── */
    close() {
        this.el.dataset.open = "false";
        this.trigger.setAttribute("aria-expanded", "false");
        if (this.searchEl) {
            this.searchEl.value = "";
            this.search("");
        }
        this._focusIdx = -1;
        this._clearFocusedOption();
        this._emit("select:close");
    }

    /* ── Toggle ──────────────────────────────────────────── */
    toggle() {
        this.el.dataset.open === "true" ? this.close() : this.open();
    }

    /* ── Search ──────────────────────────────────────────── */
    search(query) {
        const q = query.toLowerCase().trim();
        let visibleCount = 0;

        this.allOptions().forEach((opt) => {
            const label =
                opt
                    .querySelector(".ui-option-label")
                    ?.textContent.toLowerCase() || "";
            const matches = !q || label.includes(q);
            opt.dataset.hidden = matches ? "false" : "true";
            if (matches) visibleCount++;
        });

        if (this.emptyMsg) {
            this.emptyMsg.classList.toggle("visible", visibleCount === 0);
        }

        this._focusIdx = -1;
        this._clearFocusedOption();
        this._emit("select:search", { query });
    }

    /* ── Select / deselect an option ─────────────────────── */
    _selectOption(optEl) {
        const value = optEl.dataset.value;
        const label =
            optEl.querySelector(".ui-option-label")?.textContent.trim() ||
            value;

        if (this.multiple) {
            if (this.selected.has(value)) {
                this._deselect(value);
            } else {
                this.selected.set(value, label);
                optEl.dataset.selected = "true";
                optEl.setAttribute("aria-selected", "true");
            }
        } else {
            // Deselect previous
            this.allOptions().forEach((o) => {
                o.dataset.selected = "false";
                o.setAttribute("aria-selected", "false");
            });
            this.selected.clear();
            this.selected.set(value, label);
            optEl.dataset.selected = "true";
            optEl.setAttribute("aria-selected", "true");
        }

        this._renderTrigger();
        this._syncHidden();
        this._emit("select:change", { value: this.getValue() });

        if (!this.multiple && this.opts.closeOnSelect) this.close();
    }

    /* ── Deselect by value ───────────────────────────────── */
    _deselect(value) {
        this.selected.delete(value);
        const opt = this.optsList.querySelector(
            `.ui-option[data-value="${CSS.escape(value)}"]`,
        );
        if (opt) {
            opt.dataset.selected = "false";
            opt.setAttribute("aria-selected", "false");
        }
        this._renderTrigger();
        this._syncHidden();
        this._emit("select:change", { value: this.getValue() });
    }

    /* ── Render trigger content ──────────────────────────── */
    _renderTrigger() {
        this.content.innerHTML = "";

        if (this.selected.size === 0) {
            const ph = document.createElement("span");
            ph.className = "ui-select-placeholder";
            ph.textContent =
                this.trigger.querySelector(".ui-select-placeholder")
                    ?.textContent ||
                this.el.dataset.placeholder ||
                "Select…";
            // Re-grab placeholder from a data attr if original was replaced
            const ph0 = this.el.dataset.placeholder;
            if (ph0) ph.textContent = ph0;
            this.content.appendChild(ph);
            this.clearBtn && (this.clearBtn.hidden = true);
            return;
        }

        this.clearBtn && (this.clearBtn.hidden = false);

        if (this.multiple) {
            const tagsWrapper = document.createElement("div");
            tagsWrapper.className = "ui-select-tags";

            this.selected.forEach((label, value) => {
                const badge = document.createElement("span");
                badge.className = "ui-badge";
                badge.dataset.badgeValue = value;
                badge.innerHTML = `<span class="ui-badge-label">${this._escHtml(label)}</span>
          <button type="button" class="ui-badge-remove" aria-label="Remove ${this._escHtml(label)}" data-remove="${value}">×</button>`;
                badge
                    .querySelector(".ui-badge-remove")
                    .addEventListener("click", (e) => {
                        e.stopPropagation();
                        this._deselect(value);
                    });
                tagsWrapper.appendChild(badge);
            });

            this.content.appendChild(tagsWrapper);
        } else {
            const [[, label]] = this.selected;
            const val = document.createElement("span");
            val.className = "ui-select-value";
            val.textContent = label;
            this.content.appendChild(val);
        }
    }

    /* ── Sync hidden inputs ──────────────────────────────── */
    _syncHidden() {
        // Remove old hidden inputs added by UISelect
        this.el
            .querySelectorAll('input[type="hidden"][data-ui-select]')
            .forEach((i) => i.remove());

        const baseInput = this.el.querySelector(
            'input[type="hidden"]:not([data-ui-select])',
        );

        if (!baseInput) return;
        const name = baseInput.name;

        if (this.multiple) {
            baseInput.value = "";
            const arrayFormat = this.el.dataset.arrayFormat || "standard";
            this.selected.forEach((_, value) => {
                const inp = document.createElement("input");
                inp.type = "hidden";
                inp.value = value;
                switch (arrayFormat) {
                    // category=A&category=B
                    case "standard":
                        inp.name = name.replace(/\[\]$/, "");
                        break;
                    
                    // category[]=A&category[]=B
                    case "php":
                        inp.name = name.endsWith("[]") ? name : `${name}[]`;
                        break;

                    default:
                        inp.name = name.replace(/\[\]$/, "");
                }
                inp.dataset.uiSelect = "1";
                this.el.appendChild(inp);
            });
        } else {
            const [[value] = []] = this.selected;
            baseInput.value = value ?? "";
        }
    }

    /* ── Keyboard: trigger ───────────────────────────────── */
    _handleTriggerKey(e) {
        const open = this.el.dataset.open === "true";
        switch (e.key) {
            case "Enter":
            case " ":
                e.preventDefault();
                open ? this.close() : this.open();
                break;
            case "ArrowDown":
                e.preventDefault();
                if (!open) this.open();
                this._moveFocus(1);
                break;
            case "ArrowUp":
                e.preventDefault();
                if (!open) this.open();
                this._moveFocus(-1);
                break;
            case "Escape":
                this.close();
                this.trigger.focus();
                break;
        }
    }

    /* ── Keyboard: dropdown ──────────────────────────────── */
    _handleDropdownKey(e) {
        if (this.el.dataset.open !== "true") return;
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                this._moveFocus(1);
                break;
            case "ArrowUp":
                e.preventDefault();
                this._moveFocus(-1);
                break;
            case "Enter":
                e.preventDefault();
                if (this._focusIdx >= 0) {
                    const vis = this.visibleOptions();
                    if (vis[this._focusIdx])
                        this._selectOption(vis[this._focusIdx]);
                }
                break;
            case "Escape":
                this.close();
                this.trigger.focus();
                break;
        }
    }

    /* ── Move keyboard focus ─────────────────────────────── */
    _moveFocus(dir) {
        const vis = this.visibleOptions();
        if (!vis.length) return;
        this._clearFocusedOption();
        this._focusIdx = Math.max(
            0,
            Math.min(vis.length - 1, this._focusIdx + dir),
        );
        vis[this._focusIdx].classList.add("ui-focused");
        vis[this._focusIdx].scrollIntoView({ block: "nearest" });
        this.trigger.setAttribute(
            "aria-activedescendant",
            vis[this._focusIdx].id || "",
        );
    }

    _clearFocusedOption() {
        this.optsList
            .querySelectorAll(".ui-focused")
            .forEach((o) => o.classList.remove("ui-focused"));
    }

    /* ── Public API ──────────────────────────────────────── */
    getValue() {
        if (this.multiple) return [...this.selected.keys()];
        const [[v] = []] = this.selected;
        return v ?? null;
    }

    setValue(value) {
        const values = Array.isArray(value) ? value : [value];
        if (!this.multiple) {
            this.selected.clear();
            this.allOptions().forEach((o) => {
                o.dataset.selected = "false";
                o.setAttribute("aria-selected", "false");
            });
        }
        values.forEach((v) => {
            const opt = this.optsList.querySelector(
                `.ui-option[data-value="${CSS.escape(v)}"]`,
            );
            if (opt) {
                const label =
                    opt.querySelector(".ui-option-label")?.textContent.trim() ||
                    v;
                this.selected.set(v, label);
                opt.dataset.selected = "true";
                opt.setAttribute("aria-selected", "true");
            }
        });
        this._renderTrigger();
        this._syncHidden();
        this._emit("select:change", { value: this.getValue() });
    }

    clear() {
        this.selected.clear();
        this.allOptions().forEach((o) => {
            o.dataset.selected = "false";
            o.setAttribute("aria-selected", "false");
        });
        this._renderTrigger();
        this._syncHidden();
        this._emit("select:clear");
        this._emit("select:change", { value: this.getValue() });
    }

    destroy() {
        document.removeEventListener("mousedown", this._outsideHandler);
        delete this.el._uiSelect;
    }

    /* ── Helpers ─────────────────────────────────────────── */
    _emit(name, detail = {}) {
        this.el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    }

    _escHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }
}