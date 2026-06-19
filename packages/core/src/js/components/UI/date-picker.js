/**
 * ════════════════════════════════════════════════════════════════════════
 *  DatePicker
 * ════════════════════════════════════════════════════════════════════════
 *
 * Deux modes d'utilisation :
 *
 *  1) MODE "input"  → new DatePicker(document.querySelector('input[type="date"]'))
 *     L'input natif reste dans le DOM (et donc dans le <form>), mais il est
 *     visuellement masqué. Sa `value` (format yyyy-mm-dd, standard HTML)
 *     reste la source de vérité envoyée au backend (PHP, Node, etc.).
 *     Un bouton d'affichage + un panneau calendrier "maison" sont injectés
 *     juste à côté.
 *
 *  2) MODE "div"    → new DatePicker(document.querySelector('.my-datepicker'))
 *     Si l'élément n'est PAS un <input type="date">, on construit tout de
 *     bout en bout à l'intérieur de cet élément :
 *       - un <input type="hidden" name="..."> (valeur soumise au backend)
 *       - un bouton d'affichage
 *       - le panneau calendrier
 *     Le nom du champ est lu depuis `data-name` (ou `options.name`).
 *
 * Architecture identique à Modal.js : champs privés ES2022, options
 * statiques fusionnables, registre de listeners pour un destroy() propre,
 * et émission de CustomEvent (bubbles + cancelable) préfixés "datepicker:".
 *
 * API publique calquée sur Modal : open(), close(), toggle(), setOptions(),
 * getOptions(), destroy(), getters isOpen / element / input / value.
 */
export class UIDatePicker {
    // ─── Champs privés ──────────────────────────────────────────────────────
    #isOpen = false;
    #listeners = new Map();
    #options = {};

    #mode = "input"; // "input" | "div"
    #nativeInput = null; // input[type=date] (mode input) ou input[hidden] (mode div)
    #wrapper = null; // conteneur position:relative
    #displayBtn = null; // bouton visible affichant la date formatée
    #panel = null; // panneau calendrier (.ui-datepicker-panel)
    #titleEl = null; // libellé "Juin 2026"
    #gridEl = null; // grille des jours

    #selectedDate = null; // Date | null
    #viewDate = new Date(); // mois actuellement affiché dans le calendrier
    #minDate = null;
    #maxDate = null;
    #view = "days"; // "days" | "months" | "years" — vue actuelle du panneau

    // ─── Valeurs par défaut ─────────────────────────────────────────────────
    static DEFAULTS = {
        locale: "fr-FR",
        // Format d'affichage : "long" | "medium" | "short" | "full" (Intl)
        // OU un patron à jetons : "dd/mm/yyyy"
        format: "dd/mm/yyyy",
        firstDayOfWeek: 1, // 0 = dimanche, 1 = lundi
        min: null, // Date | "yyyy-mm-dd" | null
        max: null, // Date | "yyyy-mm-dd" | null
        closeOnSelect: true,
        showFooter: true, // boutons "Aujourd'hui" / "Effacer"
        animationClass: "show",
        placeholder: "jj/mm/aaaa",
        name: null, // requis en mode "div" si data-name absent
        onOpen: null,
        onClose: null,
        onChange: null, // callback(date, picker)
    };

    static EVENTS = {
        BEFORE_OPEN: "datepicker:before-open",
        OPEN: "datepicker:open",
        BEFORE_CLOSE: "datepicker:before-close",
        CLOSE: "datepicker:close",
        BEFORE_CHANGE: "datepicker:before-change",
        CHANGE: "datepicker:change",
    };

    /**
     * @param {HTMLElement} element  — input[type=date] OU conteneur <div>
     * @param {object}      options  — surcharge de DEFAULTS
     */
    constructor(element, options = {}) {
        if (!(element instanceof HTMLElement)) {
            throw new TypeError(
                "[DatePicker] Le premier argument doit être un HTMLElement.",
            );
        }

        this.#options = { ...DatePicker.DEFAULTS, ...options };
        this.#minDate = this.#parseDate(this.#options.min);
        this.#maxDate = this.#parseDate(this.#options.max);

        this.#mode =
            element instanceof HTMLInputElement && element.type === "date"
                ? "input"
                : "div";

        this.#mode === "input"
            ? this.#buildFromInput(element)
            : this.#buildFromContainer(element);

        // État initial à partir de la valeur native (input[type=date] ⇒ yyyy-mm-dd)
        const initial = this.#parseISO(this.#nativeInput.value);
        if (initial) {
            this.#selectedDate = initial;
            this.#viewDate = new Date(
                initial.getFullYear(),
                initial.getMonth(),
                1,
            );
        }

        this.#renderDisplay();
        this.#renderCalendar();

        // ── Stockage de l'instance (cohérent avec Modal._modalInstance) ──────
        this.#wrapper._datePickerInstance = this;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  API PUBLIQUE
    // ══════════════════════════════════════════════════════════════════════

    /** Ouvre le panneau calendrier. */
    open() {
        if (this.#isOpen) return this;

        const allowed = this.#emit(DatePicker.EVENTS.BEFORE_OPEN);
        if (!allowed) return this;

        // Recentre le calendrier sur la date sélectionnée (ou aujourd'hui)
        const ref = this.#selectedDate ?? new Date();
        this.#viewDate = new Date(ref.getFullYear(), ref.getMonth(), 1);
        this.#view = "days";
        this.#renderCalendar();

        this.#panel.classList.add(this.#options.animationClass);
        this.#panel.hidden = false;
        this.#displayBtn.setAttribute("aria-expanded", "true");
        this.#isOpen = true;

        this.#emit(DatePicker.EVENTS.OPEN);
        this.#options.onOpen?.call(this, this);

        return this;
    }

    /** Ferme le panneau calendrier. */
    close() {
        if (!this.#isOpen) return this;

        const allowed = this.#emit(DatePicker.EVENTS.BEFORE_CLOSE);
        if (!allowed) return this;

        this.#panel.classList.remove(this.#options.animationClass);
        this.#panel.hidden = true;
        this.#displayBtn.setAttribute("aria-expanded", "false");
        this.#isOpen = false;

        this.#emit(DatePicker.EVENTS.CLOSE);
        this.#options.onClose?.call(this, this);

        return this;
    }

    /** Bascule ouvert/fermé. */
    toggle() {
        return this.#isOpen ? this.close() : this.open();
    }

    /**
     * Définit la date sélectionnée et synchronise l'input réel.
     * @param {Date|string|null} date — Date, "yyyy-mm-dd" ou null pour effacer
     * @param {object} [opts]
     * @param {boolean} [opts.silent=false] — si true, n'émet pas CHANGE / onChange
     */
    setDate(date, { silent = false } = {}) {
        const parsed = date instanceof Date ? date : this.#parseISO(date);

        if (parsed && this.#isDisabled(parsed)) return this;

        if (!silent) {
            const allowed = this.#emit(DatePicker.EVENTS.BEFORE_CHANGE, {
                date: parsed,
            });
            if (!allowed) return this;
        }

        this.#selectedDate = parsed;
        this.#nativeInput.value = parsed ? this.#toISO(parsed) : "";
        // Notifie les frameworks/écoutes externes (React, Alpine, ...)
        this.#nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
        this.#nativeInput.dispatchEvent(new Event("change", { bubbles: true }));

        this.#renderDisplay();
        if (this.#isOpen) this.#renderCalendar();

        if (!silent) {
            this.#emit(DatePicker.EVENTS.CHANGE, { date: parsed });
            this.#options.onChange?.call(this, parsed, this);
        }

        if (parsed && this.#options.closeOnSelect) this.close();

        return this;
    }

    /** Efface la date sélectionnée. */
    clear() {
        return this.setDate(null);
    }

    /** @returns {Date|null} */
    getDate() {
        return this.#selectedDate ? new Date(this.#selectedDate) : null;
    }

    /**
     * Met à jour les options après instanciation.
     * @param {object} newOptions
     */
    setOptions(newOptions = {}) {
        this.#options = { ...this.#options, ...newOptions };
        if ("min" in newOptions)
            this.#minDate = this.#parseDate(newOptions.min);
        if ("max" in newOptions)
            this.#maxDate = this.#parseDate(newOptions.max);

        this.#renderDisplay();
        this.#renderCalendar();
        return this;
    }

    /** @returns {object} copie des options actuelles */
    getOptions() {
        return { ...this.#options };
    }

    /** Nettoie listeners + DOM injecté. À appeler avant suppression du DOM. */
    destroy() {
        if (this.#isOpen) this.close();

        this.#listeners.forEach((handlers, target) => {
            handlers.forEach(({ event, handler }) => {
                target.removeEventListener(event, handler);
            });
        });
        this.#listeners.clear();

        // Remet l'input natif visible si on est en mode "input"
        if (this.#mode === "input") {
            this.#nativeInput.classList.remove("ui-datepicker-native");
            this.#wrapper.replaceWith(this.#nativeInput);
        }

        this.#panel.remove();
        this.#displayBtn.remove();
        delete this.#wrapper._datePickerInstance;
    }

    // ─── Getters publics (lecture seule) ──────────────────────────────────

    /** @returns {boolean} */
    get isOpen() {
        return this.#isOpen;
    }

    /** @returns {HTMLElement} conteneur racine du widget */
    get element() {
        return this.#wrapper;
    }

    /** @returns {HTMLInputElement} input réellement soumis au formulaire */
    get input() {
        return this.#nativeInput;
    }

    /** @returns {string} valeur ISO "yyyy-mm-dd" ou "" */
    get value() {
        return this.#selectedDate ? this.#toISO(this.#selectedDate) : "";
    }

    // ══════════════════════════════════════════════════════════════════════
    //  CONSTRUCTION DU DOM
    // ══════════════════════════════════════════════════════════════════════

    /** Mode "input" : on enveloppe l'input[type=date] existant. */
    #buildFromInput(input) {
        this.#nativeInput = input;

        const wrapper = document.createElement("div");
        wrapper.className = "ui-datepicker";
        input.replaceWith(wrapper);
        wrapper.appendChild(input);

        // L'input reste dans le DOM/form, mais visuellement masqué.
        input.classList.add("ui-datepicker-native");
        input.setAttribute("tabindex", "-1");
        input.setAttribute("aria-hidden", "true");

        this.#wrapper = wrapper;
        this.#buildDisplayAndPanel();
    }

    /** Mode "div" : on construit tout (input hidden + UI) dans le conteneur. */
    #buildFromContainer(container) {
        container.classList.add("ui-datepicker");
        this.#wrapper = container;

        const name = this.#options.name ?? container.dataset.name ?? "";
        if (!name) {
            console.warn(
                '[DatePicker] Aucun "name" fourni (options.name ou data-name) : ' +
                    "le champ caché ne sera pas soumis avec un nom au backend.",
            );
        }

        const hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.name = name;
        if (container.dataset.value) hidden.value = container.dataset.value;
        container.appendChild(hidden);

        this.#nativeInput = hidden;
        this.#buildDisplayAndPanel();
    }

    /** Construit le bouton d'affichage + le panneau calendrier (commun aux 2 modes). */
    #buildDisplayAndPanel() {
        // ── Bouton d'affichage ────────────────────────────────────────────
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ui-datepicker-input";
        btn.setAttribute("aria-haspopup", "dialog");
        btn.setAttribute("aria-expanded", "false");
        btn.innerHTML = `
            <span class="ui-datepicker-value"></span>
            <svg class="ui-datepicker-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <path d="M3 9.5h18" stroke="currentColor" stroke-width="1.5"/>
                <path d="M8 3v3M16 3v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>`;
        this.#wrapper.appendChild(btn);
        this.#displayBtn = btn;

        this.#on(btn, "click", () => this.toggle());
        this.#on(btn, "keydown", (e) => {
            if (e.key === "ArrowDown" && !this.#isOpen) {
                e.preventDefault();
                this.open();
            }
        });

        // ── Panneau calendrier ───────────────────────────────────────────
        const panel = document.createElement("div");
        panel.className = "ui-datepicker-panel";
        panel.setAttribute("role", "dialog");
        panel.hidden = true;

        const header = document.createElement("div");
        header.className = "ui-datepicker-header";

        const prevBtn = document.createElement("button");
        prevBtn.type = "button";
        prevBtn.className = "ui-datepicker-nav-btn";
        prevBtn.setAttribute("aria-label", "Mois précédent");
        prevBtn.innerHTML = "&#8249;";

        const title = document.createElement("button");
        title.type = "button";
        title.className = "ui-datepicker-title";
        title.setAttribute("aria-label", "Choisir le mois et l'année");

        const nextBtn = document.createElement("button");
        nextBtn.type = "button";
        nextBtn.className = "ui-datepicker-nav-btn";
        nextBtn.setAttribute("aria-label", "Mois suivant");
        nextBtn.innerHTML = "&#8250;";

        header.append(prevBtn, title, nextBtn);

        const grid = document.createElement("div");
        grid.className = "ui-datepicker-grid";

        panel.append(header);
        panel.append(grid);

        if (this.#options.showFooter) {
            const footer = document.createElement("div");
            footer.className = "ui-datepicker-footer";

            const todayBtn = document.createElement("button");
            todayBtn.type = "button";
            todayBtn.className = "ui-datepicker-footer-btn";
            todayBtn.textContent = "Aujourd'hui";
            this.#on(todayBtn, "click", () => this.setDate(new Date()));

            const clearBtn = document.createElement("button");
            clearBtn.type = "button";
            clearBtn.className =
                "ui-datepicker-footer-btn ui-datepicker-footer-btn--ghost";
            clearBtn.textContent = "Effacer";
            this.#on(clearBtn, "click", () => this.clear());

            footer.append(todayBtn, clearBtn);
            panel.append(footer);
        }

        this.#wrapper.appendChild(panel);
        this.#panel = panel;
        this.#titleEl = title;
        this.#gridEl = grid;

        this.#on(prevBtn, "click", () => this.#navigate(-1));
        this.#on(nextBtn, "click", () => this.#navigate(1));
        this.#on(title, "click", () => this.#cycleView());

        // ── Fermeture : clic extérieur + Escape ────────────────────────────
        this.#on(document, "click", (e) => {
            if (this.#isOpen && !this.#wrapper.contains(e.target)) this.close();
        });
        this.#on(document, "keydown", (e) => {
            if (e.key === "Escape" && this.#isOpen) {
                this.close();
                this.#displayBtn.focus();
            }
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    //  RENDU
    // ══════════════════════════════════════════════════════════════════════

    #cycleView() {
        const next = { days: "months", months: "years", years: "years" };
        this.#view = next[this.#view];
        this.#renderCalendar();
    }

    #navigate(delta) {
        if (this.#view === "years") {
            this.#viewDate = new Date(
                this.#viewDate.getFullYear() + delta * 12,
                this.#viewDate.getMonth(),
                1,
            );
        } else if (this.#view === "months") {
            this.#viewDate = new Date(
                this.#viewDate.getFullYear() + delta,
                this.#viewDate.getMonth(),
                1,
            );
        } else {
            this.#viewDate = new Date(
                this.#viewDate.getFullYear(),
                this.#viewDate.getMonth() + delta,
                1,
            );
        }
        this.#renderCalendar();
    }

    #renderDisplay() {
        const valueEl = this.#displayBtn.querySelector(".ui-datepicker-value");
        if (this.#selectedDate) {
            valueEl.textContent = this.#formatDate(this.#selectedDate);
            valueEl.classList.remove("ui-datepicker-placeholder");
        } else {
            valueEl.textContent = this.#options.placeholder;
            valueEl.classList.add("ui-datepicker-placeholder");
        }
    }

    #renderCalendar() {
        switch (this.#view) {
            case "months":
                this.#renderMonths();
                break;
            case "years":
                this.#renderYears();
                break;
            default:
                this.#renderDays();
        }
    }

    #renderDays() {
        const fmt = new Intl.DateTimeFormat(this.#options.locale, {
            month: "long",
            year: "numeric",
        });
        this.#titleEl.textContent = fmt.format(this.#viewDate);

        // En-têtes des jours de semaine
        const weekdayFmt = new Intl.DateTimeFormat(this.#options.locale, {
            weekday: "short",
        });
        const weekdayNames = [];
        for (let i = 0; i < 7; i++) {
            const dow = (this.#options.firstDayOfWeek + i) % 7;
            // 1er janvier 2023 = dimanche → référence stable pour les noms de jours
            const ref = new Date(2023, 0, 1 + dow);
            weekdayNames.push(weekdayFmt.format(ref));
        }

        // Grille des jours (6 semaines x 7 jours)
        const year = this.#viewDate.getFullYear();
        const month = this.#viewDate.getMonth();
        const firstOfMonth = new Date(year, month, 1);
        const offset =
            (firstOfMonth.getDay() - this.#options.firstDayOfWeek + 7) % 7;
        const start = new Date(year, month, 1 - offset);

        const today = this.#toISO(new Date());

        let html = "";
        weekdayNames.forEach((name) => {
            html += `<div class="ui-datepicker-weekday">${name}</div>`;
        });

        for (let i = 0; i < 42; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);

            const iso = this.#toISO(d);
            const classes = ["ui-datepicker-day"];
            if (d.getMonth() !== month) classes.push("is-outside");
            if (iso === today) classes.push("is-today");
            if (this.#selectedDate && iso === this.#toISO(this.#selectedDate)) {
                classes.push("is-selected");
            }

            const disabled = this.#isDisabled(d);
            if (disabled) classes.push("is-disabled");

            html += `<button type="button" class="${classes.join(" ")}" data-date="${iso}"${
                disabled ? " disabled" : ""
            } aria-label="${d.toLocaleDateString(this.#options.locale, {
                day: "numeric",
                month: "long",
                year: "numeric",
            })}">${d.getDate()}</button>`;
        }

        this.#gridEl.className = "ui-datepicker-grid";
        this.#gridEl.innerHTML = html;

        this.#gridEl
            .querySelectorAll(".ui-datepicker-day:not(.is-disabled)")
            .forEach((dayBtn) => {
                this.#on(dayBtn, "click", () =>
                    this.setDate(dayBtn.dataset.date),
                );
            });
    }

    /** Vue "mois" — grille des 12 mois de l'année affichée. */
    #renderMonths() {
        const year = this.#viewDate.getFullYear();
        this.#titleEl.textContent = String(year);

        const monthFmt = new Intl.DateTimeFormat(this.#options.locale, {
            month: "short",
        });
        const today = new Date();
        const selectedMonth =
            this.#selectedDate && this.#selectedDate.getFullYear() === year
                ? this.#selectedDate.getMonth()
                : null;

        let html = "";
        for (let m = 0; m < 12; m++) {
            const ref = new Date(year, m, 1);
            const classes = ["ui-datepicker-cell"];
            if (m === selectedMonth) classes.push("is-selected");
            if (m === today.getMonth() && year === today.getFullYear())
                classes.push("is-today");

            const disabled = this.#isMonthDisabled(year, m);
            if (disabled) classes.push("is-disabled");

            html += `<button type="button" class="${classes.join(" ")}" data-month="${m}"${
                disabled ? " disabled" : ""
            }>${monthFmt.format(ref)}</button>`;
        }

        this.#gridEl.className =
            "ui-datepicker-grid ui-datepicker-grid--months";
        this.#gridEl.innerHTML = html;

        this.#gridEl
            .querySelectorAll(".ui-datepicker-cell:not(.is-disabled)")
            .forEach((btn) => {
                this.#on(btn, "click", () => {
                    this.#viewDate = new Date(
                        year,
                        Number(btn.dataset.month),
                        1,
                    );
                    this.#view = "days";
                    this.#renderCalendar();
                });
            });
    }

    /** Vue "années" — grille de 12 années (par blocs de 12). */
    #renderYears() {
        const year = this.#viewDate.getFullYear();
        const start = year - (year % 12);
        const end = start + 11;
        this.#titleEl.textContent = `${start} – ${end}`;

        const todayYear = new Date().getFullYear();
        const selectedYear = this.#selectedDate
            ? this.#selectedDate.getFullYear()
            : null;

        let html = "";
        for (let y = start; y <= end; y++) {
            const classes = ["ui-datepicker-cell"];
            if (y === selectedYear) classes.push("is-selected");
            if (y === todayYear) classes.push("is-today");

            const disabled = this.#isYearDisabled(y);
            if (disabled) classes.push("is-disabled");

            html += `<button type="button" class="${classes.join(" ")}" data-year="${y}"${
                disabled ? " disabled" : ""
            }>${y}</button>`;
        }

        this.#gridEl.className = "ui-datepicker-grid ui-datepicker-grid--years";
        this.#gridEl.innerHTML = html;

        this.#gridEl
            .querySelectorAll(".ui-datepicker-cell:not(.is-disabled)")
            .forEach((btn) => {
                this.#on(btn, "click", () => {
                    this.#viewDate = new Date(
                        Number(btn.dataset.year),
                        this.#viewDate.getMonth(),
                        1,
                    );
                    this.#view = "months";
                    this.#renderCalendar();
                });
            });
    }

    // ══════════════════════════════════════════════════════════════════════
    //  UTILITAIRES PRIVÉS
    // ══════════════════════════════════════════════════════════════════════

    #isDisabled(date) {
        if (this.#minDate && date < this.#minDate) return true;
        if (this.#maxDate && date > this.#maxDate) return true;
        return false;
    }

    #toISO(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    #parseISO(value) {
        if (!value) return null;
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (!match) return null;
        const [, y, m, d] = match.map(Number);
        const date = new Date(y, m - 1, d);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    #parseDate(value) {
        if (!value) return null;
        if (value instanceof Date) return value;
        return this.#parseISO(value);
    }

    #formatDate(date) {
        const format = this.#options.format;

        // Patron à jetons type "dd/mm/yyyy"
        if (/^[dmy/\-. ]+$/i.test(format)) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, "0");
            const d = String(date.getDate()).padStart(2, "0");
            return format
                .replace(/yyyy/g, y)
                .replace(/mm/g, m)
                .replace(/dd/g, d);
        }

        // Sinon : style Intl ("long", "medium", "short", "full")
        return new Intl.DateTimeFormat(this.#options.locale, {
            dateStyle: format,
        }).format(date);
    }

    /**
     * Enregistre un listener pour pouvoir le retirer dans destroy().
     * Identique à Modal#on.
     */
    #on(target, event, handler) {
        target.addEventListener(event, handler);
        if (!this.#listeners.has(target)) this.#listeners.set(target, []);
        this.#listeners.get(target).push({ event, handler });
    }

    /**
     * Émet un CustomEvent("datepicker:*") sur le conteneur racine.
     * Retourne false si preventDefault() a été appelé (annulation).
     */
    #emit(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            bubbles: true,
            cancelable: true,
            detail: {
                picker: this,
                element: this.#wrapper,
                isOpen: this.#isOpen,
                value: this.value,
                ...detail,
            },
        });
        return this.#wrapper.dispatchEvent(event);
    }
}
