export class DropdownBase {
    constructor(element) {
        this.dropdown = element;
        this.trigger = element.querySelector(".dropdown-trigger");
        this.menu = element.querySelector(".dropdown-menu");
        this._onOut = (e) => {
            if (!this.dropdown.contains(e.target)) this.close();
        };
        this._onKey = (e) => this._handleKey(e);
        this._init();
    }
    _init() {
        this.trigger?.addEventListener("click", (e) => {
            e.stopPropagation();
            this.toggle();
        });
        document.addEventListener("click", this._onOut);
        document.addEventListener("keydown", this._onKey);
    }
    _handleKey(e) {
        if (!this.isOpen()) return;
        if (e.key === "Escape") {
            this.close();
            this.trigger?.focus();
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const items = [
                ...(this.menu?.querySelectorAll(
                    "[data-dd-item]:not([disabled]):not([hidden])",
                ) ?? []),
            ];
            if (!items.length) return;
            const idx = items.indexOf(document.activeElement);
            const next =
                e.key === "ArrowDown"
                    ? (idx + 1) % items.length
                    : (idx - 1 + items.length) % items.length;
            items[next]?.focus();
        }
    }
    isOpen() {
        return this.dropdown.classList.contains("open");
    }
    toggle() {
        this.isOpen() ? this.close() : this.open();
    }
    open() {
        this.dropdown.classList.add("open");
    }
    close() {
        this.dropdown.classList.remove("open");
    }
}

export class Dropdown extends DropdownBase {}

export class DropdownHover extends DropdownBase {
    constructor(el) {
        super(el);
        this._t = null;
        this._delay = parseInt(el.dataset.delay ?? "150", 10);
        el.addEventListener("mouseenter", () => {
            clearTimeout(this._t);
            this.open();
        });
        el.addEventListener("mouseleave", () => {
            this._t = setTimeout(() => this.close(), this._delay);
        });
    }
    _init() {
        document.addEventListener("click", this._onOut);
        document.addEventListener("keydown", this._onKey);
    }
}

export class DropdownMega extends DropdownBase {}

export class DropdownSelect extends DropdownBase {
    constructor(el) {
        super(el);
        this._label = el.querySelector(".dropdown-select-label");
        this._value = el.dataset.value ?? "";
        el.querySelectorAll("[data-dd-value]").forEach((item) => {
            item.addEventListener("click", () =>
                this._select(
                    item.dataset.ddValue,
                    item.dataset.ddLabel ?? item.textContent.trim(),
                ),
            );
        });
        if (this._value) {
            const init = el.querySelector(`[data-dd-value="${this._value}"]`);
            if (init)
                this._select(
                    this._value,
                    init.dataset.ddLabel ?? init.textContent.trim(),
                    true,
                );
        }
    }
    _select(value, label, silent = false) {
        this._value = value;
        if (this._label) this._label.textContent = label;
        this.menu
            ?.querySelectorAll("[data-dd-value]")
            .forEach((i) =>
                i.classList.toggle("dd-selected", i.dataset.ddValue === value),
            );
        this.close();
        if (!silent)
            this.dropdown.dispatchEvent(
                new CustomEvent("dd:change", {
                    bubbles: true,
                    detail: { value, label },
                }),
            );
    }
    getValue() {
        return this._value;
    }
}

export class DropdownMultiSelect extends DropdownBase {
    constructor(el) {
        super(el);
        this._label = el.querySelector(".dropdown-select-label");
        this._default = this._label?.textContent.trim() ?? "Sélectionner";
        this._values = new Set();
        el.querySelectorAll("[data-dd-value]").forEach((item) => {
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                this._toggle(item);
            });
        });
        this._updateLabel();
    }
    _toggle(item) {
        const v = item.dataset.ddValue;
        this._values.has(v) ? this._values.delete(v) : this._values.add(v);
        item.classList.toggle("dd-selected", this._values.has(v));
        this._updateLabel();
        this.dropdown.dispatchEvent(
            new CustomEvent("dd:change", {
                bubbles: true,
                detail: { values: [...this._values] },
            }),
        );
    }
    _updateLabel() {
        const c = this._values.size;
        if (this._label)
            this._label.textContent =
                c === 0 ? this._default : `${c} sélectionné${c > 1 ? "s" : ""}`;
    }
    clear() {
        this._values.clear();
        this.menu
            ?.querySelectorAll("[data-dd-value]")
            .forEach((i) => i.classList.remove("dd-selected"));
        this._updateLabel();
    }
    getValues() {
        return [...this._values];
    }
    open() {
        this.dropdown.classList.add("open");
    }
    close() {
        this.dropdown.classList.remove("open");
    }
}

export class DropdownNested extends DropdownBase {
    constructor(el) {
        super(el);
        el.querySelectorAll("[data-submenu]").forEach((item) => {
            const sub = item.nextElementSibling;
            if (!sub?.classList.contains("dropdown-submenu")) return;
            item.addEventListener("mouseenter", () => {
                el.querySelectorAll(".dropdown-submenu.open").forEach((s) => {
                    if (s !== sub) s.classList.remove("open");
                });
                sub.classList.add("open");
            });
            item.parentElement.addEventListener("mouseleave", () =>
                sub.classList.remove("open"),
            );
        });
    }
}

export class DropdownCommand extends DropdownBase {
    constructor(el) {
        super(el);
        this._input = el.querySelector(".dropdown-cmd-input");
        this._items = [...(el.querySelectorAll("[data-dd-item]") ?? [])];
        this._empty = el.querySelector(".dropdown-cmd-empty");
        this._input?.addEventListener("input", () =>
            this._filter(this._input.value),
        );
    }
    _filter(q) {
        q = q.toLowerCase().trim();
        let v = 0;
        this._items.forEach((item) => {
            const match =
                !q ||
                (item.dataset.ddSearch ?? item.textContent)
                    .toLowerCase()
                    .includes(q);
            item.hidden = !match;
            if (match) v++;
        });
        /* Group empty hide */
        this.dropdown.querySelectorAll(".dropdown-cmd-group").forEach((g) => {
            g.classList.toggle(
                "dd-group-empty",
                !g.querySelectorAll("[data-dd-item]:not([hidden])").length,
            );
        });
        if (this._empty) this._empty.hidden = v > 0;
    }
    open() {
        super.open();
        setTimeout(() => this._input?.focus(), 40);
        if (this._input) this._input.value = "";
        this._filter("");
    }
}

export class DropdownContext extends DropdownBase {
    constructor(el) {
        super(el);
        const zone = el.querySelector(".dropdown-context-zone") ?? el;
        zone.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            this._pos(e.clientX, e.clientY);
            this.open();
        });
    }
    _pos(x, y) {
        if (!this.menu) return;
        Object.assign(this.menu.style, {
            position: "fixed",
            top: "0",
            left: "0",
            zIndex: "9999",
        });
        requestAnimationFrame(() => {
            const { offsetWidth: mw, offsetHeight: mh } = this.menu;
            this.menu.style.left = `${Math.min(x, innerWidth - mw - 8)}px`;
            this.menu.style.top = `${Math.min(y, innerHeight - mh - 8)}px`;
        });
    }
    open() {
        this.dropdown.classList.add("open");
    }
}
