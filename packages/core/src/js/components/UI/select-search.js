export class UISelect {
    constructor(element, options = {}) {
        if (!(element instanceof HTMLElement))
            throw new Error("UISelect: element must be an HTMLElement");
        if (element._uiSelect) return element._uiSelect; // singleton guard

        // ── Native <select> support ──────────────────────────────
        // Si l'élément fourni est un <select> natif, on l'enveloppe dans
        // un .ui-select généré à la volée et on construit les .ui-option
        // à partir de ses <option>. Le <select> d'origine reste dans le
        // DOM (masqué visuellement) pour rester la source de vérité du
        // formulaire : sa valeur est synchronisée et un événement
        // "change" natif y est déclenché à chaque sélection.
        this.isNative = element.tagName === "SELECT";
        this.el = this.isNative ? this._wrapNativeSelect(element) : element;

        this.opts = Object.assign(
            { closeOnSelect: true, searchDelay: 0 },
            options,
        );
        this.multiple = this.el.dataset.multiple === "true";
        this.selected = new Map(); // value → label
        this._focusIdx = -1;
        this._injectStructure();
        this._bindDOM();
        this._bindEvents();
        this._syncInitial();
        this._applyStyleOverrides();
        element._uiSelect = this;
        this.el._uiSelect = this;
    }
    /* ── Native <select> wrapping ─────────────────────────────── */
    _wrapNativeSelect(select) {
        const wrapper = document.createElement("div");
        wrapper.className = "ui-select";
        // Copie les classes utilitaires (ui-select-sm, ui-error, ...)
        select.classList.forEach((c) => wrapper.classList.add(c));
        // Copie tous les data-* (placeholder, search, multiple, select-class, ...)
        Object.entries(select.dataset).forEach(([key, value]) => {
            wrapper.dataset[key] = value;
        });
        if (select.multiple) wrapper.dataset.multiple = "true";
        if (select.disabled) wrapper.dataset.disabled = "true";
        select.classList.add("ui-select-native");
        select.setAttribute("tabindex", "-1");
        select.setAttribute("aria-hidden", "true");
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        return wrapper;
    }
    /* Construit les .ui-option depuis les <option> du <select> natif */
    _buildOptionsFromNativeSelect(optsList) {
        const select = this.el.querySelector(".ui-select-native");
        let html = "";
        Array.from(select.options).forEach((o) => {
            if (!o.value && !o.textContent.trim()) return; // ignore option placeholder vide
            html += `<div class="ui-option" data-value="${this._escHtml(o.value)}"${o.disabled ? ' data-disabled="true"' : ""}>
                <span class="ui-option-label">${this._escHtml(o.textContent.trim())}</span>
            </div>`;
        });
        optsList.insertAdjacentHTML("afterbegin", html);
        // Copie les data-* additionnels de chaque <option> (couleurs, data-select-class, ...)
        // vers son .ui-option généré, pour permettre une surcharge par option.
        Array.from(select.options).forEach((o) => {
            const opt = optsList.querySelector(
                `.ui-option[data-value="${CSS.escape(o.value)}"]`,
            );
            if (!opt) return;
            Object.entries(o.dataset).forEach(([key, value]) => {
                opt.dataset[key] = value;
            });
        });
        Array.from(select.selectedOptions).forEach((o) => {
            const opt = optsList.querySelector(
                `.ui-option[data-value="${CSS.escape(o.value)}"]`,
            );
            if (opt) opt.dataset.selected = "true";
        });
    }
    /* ── Auto-inject missing structure ───────────────────────── */
    _injectStructure() {
        const placeholder = this.el.dataset.placeholder || "Choose an option";
        const withSearch = this.el.dataset.search === "true";
        // 1. Inject trigger if absent
        if (!this.el.querySelector(".ui-select-trigger")) {
            this.el.insertAdjacentHTML(
                "afterbegin",
                `<button type="button" class="ui-select-trigger">
                    <span class="ui-select-trigger-content">
                        <span class="ui-select-placeholder">${this._escHtml(placeholder)}</span>
                    </span>
                </button>`,
            );
        }
        // 2. Ensure dropdown wrapper exists
        let dropdown = this.el.querySelector(".ui-select-dropdown");
        if (!dropdown) {
            dropdown = document.createElement("div");
            dropdown.className = "ui-select-dropdown";
            this.el.appendChild(dropdown);
        }
        // 3. Inject search bar inside dropdown if data-search="true" and not already present
        if (
            withSearch &&
            !dropdown.querySelector(".ui-select-search-wrapper")
        ) {
            dropdown.insertAdjacentHTML(
                "afterbegin",
                `<div class="ui-select-search-wrapper">
                    <input type="search" class="ui-select-search" placeholder="Search..." autocomplete="off">
                </div>`,
            );
        }
        // 4. Ensure options list exists
        if (!dropdown.querySelector(".ui-select-options")) {
            dropdown.insertAdjacentHTML(
                "beforeend",
                `<div class="ui-select-options"></div>`,
            );
        }
        const optsList = dropdown.querySelector(".ui-select-options");
        // 4bis. Select natif : générer les .ui-option depuis les <option>
        if (this.isNative && !optsList.querySelector(".ui-option")) {
            this._buildOptionsFromNativeSelect(optsList);
        }
        // 5. Ensure empty-state message exists inside options list
        if (!optsList.querySelector(".ui-select-empty")) {
            optsList.insertAdjacentHTML(
                "beforeend",
                `<div class="ui-select-empty">No results</div>`,
            );
        }
        dropdown.querySelectorAll(".ui-option").forEach((opt) => {
            if (!opt.querySelector(".ui-option-checkbox")) {
                opt.insertAdjacentHTML(
                    "afterbegin",
                    `<span class="ui-option-checkbox"></span>`,
                );
            }
        });
    }
    /* ── DOM binding ─────────────────────────────────────────── */
    _bindDOM() {
        // Inject chevron into trigger if absent
        if (!this.el.querySelector(".ui-select-chevron")) {
            this.el
                .querySelector(".ui-select-trigger")
                .insertAdjacentHTML(
                    "beforeend",
                    `<svg class="ui-select-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7.5l5 5 5-5"/></svg>`,
                );
        }
        // Inject clear button into root if absent
        if (!this.el.querySelector(".ui-select-clear")) {
            this.el.insertAdjacentHTML(
                "afterbegin",
                `<button type="button" class="ui-select-clear" aria-label="Clear" hidden>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                </button>`,
            );
        }
        // Bind element references
        this.trigger = this.el.querySelector(".ui-select-trigger");
        this.dropdown = this.el.querySelector(".ui-select-dropdown");
        this.searchEl = this.el.querySelector(".ui-select-search");
        this.optsList = this.el.querySelector(".ui-select-options");
        this.clearBtn = this.el.querySelector(".ui-select-clear");
        this.content = this.trigger.querySelector(".ui-select-trigger-content");
        this.emptyMsg = this.el.querySelector(".ui-select-empty");
        this.allOptions = () => [
            ...this.optsList.querySelectorAll(".ui-option"),
        ];
        this.visibleOptions = () =>
            this.allOptions().filter((o) => o.dataset.hidden !== "true");
    }
    /* ── Event listeners ─────────────────────────────────────── */
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
    /* ── Sync pre-selected values (SSR support) ──────────────── */
    _syncInitial() {
        this.allOptions().forEach((opt) => {
            if (opt.dataset.selected === "true") {
                const value = opt.dataset.value;
                const label =
                    opt.querySelector(".ui-option-label")?.textContent.trim() ||
                    value;
                this.selected.set(value, label);
                opt.dataset.selected = "true";
                opt.setAttribute("aria-selected", "true");
            }
        });
        this._renderTrigger();
        this._syncHidden();
    }
    /* ── Open ────────────────────────────────────────────────── */
    open() {
        if (this.el.dataset.disabled === "true") return;
        this.el.dataset.open = "true";
        this.trigger.setAttribute("aria-expanded", "true");
        this.searchEl?.focus();
        this._focusIdx = -1;
        this._emit("select:open");
    }
    /* ── Close ───────────────────────────────────────────────── */
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
    /* ── Toggle ──────────────────────────────────────────────── */
    toggle() {
        this.el.dataset.open === "true" ? this.close() : this.open();
    }
    /* ── Search ──────────────────────────────────────────────── */
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
    /* ── Select / deselect an option ─────────────────────────── */
    _selectOption(optEl) {
        if (optEl.dataset.disabled === "true") return;
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
    /* ── Deselect by value ───────────────────────────────────── */
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
    /* ── Render trigger content ──────────────────────────────── */
    _renderTrigger() {
        this.content.innerHTML = "";
        if (this.selected.size === 0) {
            const ph = document.createElement("span");
            ph.className = "ui-select-placeholder";
            ph.textContent = this.el.dataset.placeholder || "Choose an option";
            this.content.appendChild(ph);
            if (this.clearBtn) this.clearBtn.hidden = true;
            return;
        }
        if (this.clearBtn) this.clearBtn.hidden = false;
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
    /* ── Sync hidden inputs (mode "div") OU <select> natif ────── */
    _syncHidden() {
        if (this.isNative) return this._syncNativeSelect();
        this.el
            .querySelectorAll('input[type="hidden"][data-ui-select]')
            .forEach((i) => i.remove());
        const baseInput = this.el.querySelector(
            'input[type="hidden"]:not([data-ui-select])',
        );
        if (!baseInput) return;
        // Toujours réactiver en début de cycle
        baseInput.disabled = false;
        baseInput.value = "";
        const name = baseInput.name;
        if (this.multiple) {
            const arrayFormat = this.el.dataset.arrayFormat || "standard";
            const resolvedName =
                arrayFormat === "php"
                    ? name.endsWith("[]")
                        ? name
                        : `${name}[]`
                    : name.replace(/\[\]$/, "");
            if (this.selected.size > 0) {
                baseInput.disabled = true; // exclut le sentinel du POST
                this.selected.forEach((_, value) => {
                    const inp = document.createElement("input");
                    inp.type = "hidden";
                    inp.name = resolvedName;
                    inp.value = value;
                    inp.dataset.uiSelect = "1";
                    this.el.appendChild(inp);
                });
            }
            // si selected.size === 0 → baseInput reste actif avec value=""
        } else {
            const [[value] = []] = this.selected;
            baseInput.value = value ?? "";
        }
    }
    /* Synchronise le <select> natif d'origine + déclenche son événement "change" */
    _syncNativeSelect() {
        const select = this.el.querySelector(".ui-select-native");
        if (!select) return;
        Array.from(select.options).forEach((o) => {
            o.selected = this.selected.has(o.value);
        });
        select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    /* ── Keyboard: trigger ───────────────────────────────────── */
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
    /* ── Keyboard: dropdown ──────────────────────────────────── */
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
    /* ── Move keyboard focus ─────────────────────────────────── */
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
    /* ── Style overrides : data-select-class + data-attributs couleur ── */
    _applyStyleOverrides() {
        // data-select-class : classes utilitaires libres (Tailwind, etc.)
        // utilisable sur n'importe quel noeud interne (root, dropdown, option, ...)
        this.el.querySelectorAll("[data-select-class]").forEach((node) => {
            node.classList.add(
                ...node.dataset.selectClass.split(/\s+/).filter(Boolean),
            );
        });
        if (this.el.dataset.selectClass) {
            this.el.classList.add(
                ...this.el.dataset.selectClass.split(/\s+/).filter(Boolean),
            );
        }
        // Couleurs ciblées via des data-attributs dédiés → variables CSS inline
        if (this.dropdown) {
            this._applyColorVars(this.dropdown, {
                dropdownBg: "--select-dropdown-bg",
                dropdownBorder: "--select-dropdown-border",
            });
        }
        if (this.searchEl) {
            this._applyColorVars(this.searchEl, {
                searchBorder: "--search-border",
                searchColor: "--search-color",
            });
        }
        this.allOptions().forEach((opt) => {
            this._applyColorVars(opt, {
                optionBg: "--option-bg",
                optionColor: "--option-color",
                optionHoverBg: "--option-hover-bg",
                optionSelectedBg: "--option-selected-bg",
                optionSelectedColor: "--option-selected-color",
            });
        });
    }
    _applyColorVars(node, map) {
        Object.entries(map).forEach(([dataKey, cssVar]) => {
            // Priorité à la valeur portée par le noeud lui-même, sinon on retombe
            // sur celle du root .ui-select — utile pour un <select> natif, où l'on
            // ne peut poser les data-attributs que sur la balise <select> elle-même.
            const value = node.dataset[dataKey] ?? this.el.dataset[dataKey];
            if (value) node.style.setProperty(cssVar, value);
        });
    }
    /* ── Public API ──────────────────────────────────────────── */
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
        if (this.isNative) {
            const select = this.el.querySelector(".ui-select-native");
            select.classList.remove("ui-select-native");
            select.removeAttribute("aria-hidden");
            select.removeAttribute("tabindex");
            this.el.parentNode.insertBefore(select, this.el);
            this.el.remove();
            delete select._uiSelect;
        } else {
            delete this.el._uiSelect;
        }
    }
    /* ── Helpers ─────────────────────────────────────────────── */
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
