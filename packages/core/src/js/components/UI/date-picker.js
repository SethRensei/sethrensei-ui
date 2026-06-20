/**
 * Fix v4 :
 *  • La fermeture "clic extérieur" utilisait wrapper.contains(e.target),
 *    mais le panneau étant dans le wrapper, tout clic à l'intérieur était
 *    bien détecté… sauf que l'ordre de propagation faisait que le listener
 *    document "click" (phase bubble) se déclenchait APRÈS le listener sur
 *    la grille, provoquant une fermeture immédiate post-sélection.
 *    → Solution : écouter sur "pointerdown" pour la fermeture extérieure
 *      (se déclenche avant le "click" et ne consomme pas l'événement).
 *
 *  • Flux picker confirmé :
 *      Clic ANNÉE → #viewDate.year mis à jour, reste sur picker (re-render)
 *      Clic MOIS  → #viewDate.month mis à jour avec l'année courante,
 *                   retour au calendrier (#showView("days"))
 *
 * Deux modes :
 *   MODE "input" → new DatePicker(input[type="date"])
 *   MODE "div"   → new DatePicker(div[data-name="..."])
 */
export class DatePicker {
    #isOpen = false;
    #view = "days";
    #listeners = new Map();
    #options = {};

    #mode = "input";
    #nativeInput = null;
    #wrapper = null;
    #displayBtn = null;
    #panel = null;

    #daysView = null;
    #titleBtn = null;
    #prevBtn = null;
    #nextBtn = null;
    #gridEl = null;

    #pickerView = null;
    #decadeLabel = null;
    #monthsGrid = null;
    #yearsGrid = null;
    #pickerBackBtn = null;

    #selectedDate = null;
    #viewDate = new Date();
    #decadeStart = null;
    #minDate = null;
    #maxDate = null;

    static DEFAULTS = {
        locale: "fr-FR",
        format: "dd/mm/yyyy",
        firstDayOfWeek: 1,
        min: null,
        max: null,
        closeOnSelect: true,
        showFooter: true,
        animationClass: "show",
        placeholder: "jj/mm/aaaa",
        name: null,
        onOpen: null,
        onClose: null,
        onChange: null,
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
     * Détecte si un élément remplit les conditions d'opt-in du DatePicker.
     * Utile pour le registry (initDatePickers) afin de filtrer sans instancier.
     *
     * Conditions d'activation sur un <input type="date"> :
     *   • possède la classe "ui-datepicker-input"  OU
     *   • possède l'attribut "data-datepicker" (valeur quelconque)
     *
     * Un conteneur <div> (mode "div") est toujours éligible car placé
     * intentionnellement par le développeur.
     *
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    static isEligible(element) {
        if (!(element instanceof HTMLElement)) return false;
        if (!(element instanceof HTMLInputElement)) return true; // div → toujours ok
        if (element.type !== "date") return false;
        return (
            element.classList.contains("ui-datepicker-input") ||
            element.hasAttribute("data-datepicker")
        );
    }

    constructor(element, options = {}) {
        if (!(element instanceof HTMLElement))
            throw new TypeError(
                "[DatePicker] Le premier argument doit être un HTMLElement.",
            );

        // ── Opt-in obligatoire pour les <input type="date"> ────────────────
        // Sans la classe "ui-datepicker-input" ou l'attribut "data-datepicker",
        // l'input natif n'est PAS transformé : aucun input date de la page
        // ne sera intercepté sans consentement explicite du développeur.
        if (
            element instanceof HTMLInputElement &&
            element.type === "date" &&
            !element.classList.contains("ui-datepicker-input") &&
            !element.hasAttribute("data-datepicker")
        ) {
            throw new TypeError(
                '[DatePicker] Un <input type="date"> doit posséder la classe ' +
                    '"ui-datepicker-input" ou l\'attribut "data-datepicker" pour être activé.\n' +
                    "Utilisez DatePicker.isEligible(el) pour tester avant d'instancier.",
            );
        }

        this.#options = { ...DatePicker.DEFAULTS, ...options };
        this.#minDate = this.#pd(this.#options.min);
        this.#maxDate = this.#pd(this.#options.max);
        this.#mode =
            element instanceof HTMLInputElement && element.type === "date"
                ? "input"
                : "div";

        this.#mode === "input"
            ? this.#fromInput(element)
            : this.#fromDiv(element);

        const ini = this.#parseISO(this.#nativeInput.value);
        if (ini) {
            this.#selectedDate = ini;
            this.#viewDate = new Date(ini.getFullYear(), ini.getMonth(), 1);
        }
        this.#decadeStart = Math.floor(this.#viewDate.getFullYear() / 10) * 10;

        this.#renderDisplay();
        this.#renderDays();
        this.#wrapper._datePickerInstance = this;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  API PUBLIQUE
    // ══════════════════════════════════════════════════════════════════════

    open() {
        if (this.#isOpen) return this;
        if (!this.#emit(DatePicker.EVENTS.BEFORE_OPEN)) return this;

        const ref = this.#selectedDate ?? new Date();
        this.#viewDate = new Date(ref.getFullYear(), ref.getMonth(), 1);
        this.#decadeStart = Math.floor(ref.getFullYear() / 10) * 10;
        this.#showView("days");

        this.#panel.classList.add(this.#options.animationClass);
        this.#panel.hidden = false;
        this.#displayBtn.setAttribute("aria-expanded", "true");
        this.#isOpen = true;

        this.#emit(DatePicker.EVENTS.OPEN);
        this.#options.onOpen?.call(this, this);
        return this;
    }

    close() {
        if (!this.#isOpen) return this;
        if (!this.#emit(DatePicker.EVENTS.BEFORE_CLOSE)) return this;

        this.#panel.classList.remove(this.#options.animationClass);
        this.#panel.hidden = true;
        this.#displayBtn.setAttribute("aria-expanded", "false");
        this.#isOpen = false;

        this.#emit(DatePicker.EVENTS.CLOSE);
        this.#options.onClose?.call(this, this);
        return this;
    }

    toggle() {
        return this.#isOpen ? this.close() : this.open();
    }

    setDate(date, { silent = false } = {}) {
        const parsed = date instanceof Date ? date : this.#parseISO(date);
        if (parsed && this.#isDisabledDate(parsed)) return this;
        if (
            !silent &&
            !this.#emit(DatePicker.EVENTS.BEFORE_CHANGE, { date: parsed })
        )
            return this;

        this.#selectedDate = parsed;
        this.#nativeInput.value = parsed ? this.#iso(parsed) : "";
        this.#nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
        this.#nativeInput.dispatchEvent(new Event("change", { bubbles: true }));

        this.#renderDisplay();
        if (this.#isOpen) this.#renderDays();

        if (!silent) {
            this.#emit(DatePicker.EVENTS.CHANGE, { date: parsed });
            this.#options.onChange?.call(this, parsed, this);
        }
        if (parsed && this.#options.closeOnSelect) this.close();
        return this;
    }

    clear() {
        return this.setDate(null);
    }
    getDate() {
        return this.#selectedDate ? new Date(this.#selectedDate) : null;
    }

    setOptions(o = {}) {
        this.#options = { ...this.#options, ...o };
        if ("min" in o) this.#minDate = this.#pd(o.min);
        if ("max" in o) this.#maxDate = this.#pd(o.max);
        this.#renderDisplay();
        if (this.#isOpen) this.#renderDays();
        return this;
    }

    getOptions() {
        return { ...this.#options };
    }

    destroy() {
        if (this.#isOpen) this.close();
        this.#listeners.forEach((handlers, target) =>
            handlers.forEach(({ event, handler }) =>
                target.removeEventListener(event, handler),
            ),
        );
        this.#listeners.clear();
        if (this.#mode === "input") {
            this.#nativeInput.classList.remove("ui-datepicker-native");
            this.#wrapper.replaceWith(this.#nativeInput);
        }
        this.#panel.remove();
        this.#displayBtn.remove();
        delete this.#wrapper._datePickerInstance;
    }

    get isOpen() {
        return this.#isOpen;
    }
    get element() {
        return this.#wrapper;
    }
    get input() {
        return this.#nativeInput;
    }
    get value() {
        return this.#selectedDate ? this.#iso(this.#selectedDate) : "";
    }

    // ══════════════════════════════════════════════════════════════════════
    //  CONSTRUCTION DU DOM
    // ══════════════════════════════════════════════════════════════════════

    #fromInput(input) {
        this.#nativeInput = input;
        const w = document.createElement("div");
        w.className = "ui-datepicker";
        input.replaceWith(w);
        w.appendChild(input);
        input.classList.add("ui-datepicker-native");
        input.setAttribute("tabindex", "-1");
        input.setAttribute("aria-hidden", "true");
        this.#wrapper = w;
        this.#buildPanel();
    }

    #fromDiv(container) {
        container.classList.add("ui-datepicker");
        this.#wrapper = container;
        const name = this.#options.name ?? container.dataset.name ?? "";
        if (!name) console.warn('[DatePicker] Aucun "name" fourni.');
        const hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.name = name;
        if (container.dataset.value) hidden.value = container.dataset.value;
        container.appendChild(hidden);
        this.#nativeInput = hidden;
        this.#buildPanel();
    }

    #buildPanel() {
        // ── Bouton déclencheur ────────────────────────────────────────────
        const db = document.createElement("button");
        db.type = "button";
        db.className = "ui-datepicker-input";
        db.setAttribute("aria-haspopup", "dialog");
        db.setAttribute("aria-expanded", "false");
        db.innerHTML = `
            <span class="ui-datepicker-value"></span>
            <svg class="ui-datepicker-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <path d="M3 9.5h18" stroke="currentColor" stroke-width="1.5"/>
                <path d="M8 3v3M16 3v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>`;
        this.#wrapper.appendChild(db);
        this.#displayBtn = db;
        this.#on(db, "click", () => this.toggle());
        this.#on(db, "keydown", (e) => {
            if (e.key === "ArrowDown" && !this.#isOpen) {
                e.preventDefault();
                this.open();
            }
        });

        // ── Panneau ───────────────────────────────────────────────────────
        const panel = document.createElement("div");
        panel.className = "ui-datepicker-panel";
        panel.setAttribute("role", "dialog");
        panel.hidden = true;

        // ─ Vue jours ──────────────────────────────────────────────────────
        const dv = document.createElement("div");
        dv.className = "ui-datepicker-days-view";

        const dh = document.createElement("div");
        dh.className = "ui-datepicker-header";

        const prev = document.createElement("button");
        prev.type = "button";
        prev.className = "ui-datepicker-nav-btn";
        prev.setAttribute("aria-label", "Mois précédent");
        prev.innerHTML = "&#8249;";

        const titleBtn = document.createElement("button");
        titleBtn.type = "button";
        titleBtn.className = "ui-datepicker-title ui-datepicker-title--btn";
        titleBtn.setAttribute("aria-label", "Choisir le mois et l'année");
        titleBtn.innerHTML = `
            <span class="ui-datepicker-title-text"></span>
            <svg class="ui-datepicker-title-arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;

        const nxt = document.createElement("button");
        nxt.type = "button";
        nxt.className = "ui-datepicker-nav-btn";
        nxt.setAttribute("aria-label", "Mois suivant");
        nxt.innerHTML = "&#8250;";

        dh.append(prev, titleBtn, nxt);
        const grid = document.createElement("div");
        grid.className = "ui-datepicker-grid";
        dv.append(dh, grid);

        if (this.#options.showFooter) {
            const foot = document.createElement("div");
            foot.className = "ui-datepicker-footer";
            const tb = document.createElement("button");
            tb.type = "button";
            tb.className = "ui-datepicker-footer-btn";
            tb.textContent = "Aujourd'hui";
            this.#on(tb, "click", () => this.setDate(new Date()));
            const cb = document.createElement("button");
            cb.type = "button";
            cb.className =
                "ui-datepicker-footer-btn ui-datepicker-footer-btn--ghost";
            cb.textContent = "Effacer";
            this.#on(cb, "click", () => this.clear());
            foot.append(tb, cb);
            dv.append(foot);
        }

        // ─ Vue picker ─────────────────────────────────────────────────────
        const pv = document.createElement("div");
        pv.className = "ui-datepicker-picker-view";
        pv.hidden = true;

        const ph = document.createElement("div");
        ph.className = "ui-datepicker-header";

        const dp = document.createElement("button");
        dp.type = "button";
        dp.className = "ui-datepicker-nav-btn";
        dp.setAttribute("aria-label", "Décennie précédente");
        dp.innerHTML = "&#8249;";

        const dl = document.createElement("div");
        dl.className = "ui-datepicker-title";

        const dn = document.createElement("button");
        dn.type = "button";
        dn.className = "ui-datepicker-nav-btn";
        dn.setAttribute("aria-label", "Décennie suivante");
        dn.innerHTML = "&#8250;";

        ph.append(dp, dl, dn);

        const pb = document.createElement("div");
        pb.className = "ui-datepicker-picker-body";

        const mg = document.createElement("div");
        mg.className = "ui-datepicker-months-grid";

        const divider = document.createElement("div");
        divider.className = "ui-datepicker-picker-divider";

        const yg = document.createElement("div");
        yg.className = "ui-datepicker-years-grid";

        pb.append(mg, divider, yg);

        const bk = document.createElement("button");
        bk.type = "button";
        bk.className = "ui-datepicker-picker-back";
        bk.textContent = "↩ Retour";

        pv.append(ph, pb, bk);
        panel.append(dv, pv);
        this.#wrapper.appendChild(panel);

        // Références
        this.#panel = panel;
        this.#daysView = dv;
        this.#titleBtn = titleBtn;
        this.#prevBtn = prev;
        this.#nextBtn = nxt;
        this.#gridEl = grid;
        this.#pickerView = pv;
        this.#decadeLabel = dl;
        this.#monthsGrid = mg;
        this.#yearsGrid = yg;
        this.#pickerBackBtn = bk;

        // ── Listeners stables ─────────────────────────────────────────────
        this.#on(prev, "click", () => this.#changeMonth(-1));
        this.#on(nxt, "click", () => this.#changeMonth(1));
        this.#on(titleBtn, "click", () => this.#openPicker());
        this.#on(dp, "click", () => this.#changeDecade(-10));
        this.#on(dn, "click", () => this.#changeDecade(10));
        this.#on(bk, "click", () => this.#showView("days"));

        // ── Délégation — grille jours ─────────────────────────────────────
        this.#on(grid, "click", (e) => {
            const btn = e.target.closest(".ui-datepicker-day");
            if (!btn || btn.disabled) return;
            this.setDate(btn.dataset.date);
        });

        // ── Délégation — grille mois ──────────────────────────────────────
        // Clic mois → valide avec l'année déjà dans #viewDate → calendrier
        this.#on(mg, "click", (e) => {
            const btn = e.target.closest(".ui-datepicker-month-btn");
            if (!btn || btn.disabled) return;
            this.#viewDate = new Date(
                this.#viewDate.getFullYear(),
                parseInt(btn.dataset.month, 10),
                1,
            );
            this.#showView("days");
        });

        // ── Délégation — grille années ────────────────────────────────────
        // Clic année → met à jour l'année, reste sur picker
        this.#on(yg, "click", (e) => {
            const btn = e.target.closest(".ui-datepicker-year-btn");
            if (!btn || btn.disabled) return;
            this.#viewDate = new Date(
                parseInt(btn.dataset.year, 10),
                this.#viewDate.getMonth(),
                1,
            );
            this.#renderPicker(); // reste sur picker, re-render surbrillance
        });

        // ── Fermeture : pointerdown EXTÉRIEUR au wrapper ──────────────────
        // On utilise "pointerdown" (et non "click") pour intercepter AVANT
        // que le click natif se propage aux boutons internes.
        // L'ordre est : pointerdown extérieur → on ferme → click interne n'arrive plus sur un panneau ouvert
        // Mais ici on veut l'inverse : les clics internes doivent d'abord être traités.
        // Solution : on vérifie simplement que e.target n'est PAS dans le wrapper.
        // En "pointerdown" le panneau n'est pas encore fermé → les listeners internes
        // en "click" (phase bubble) s'exécutent normalement après.
        this.#on(document, "pointerdown", (e) => {
            if (this.#isOpen && !this.#wrapper.contains(e.target)) {
                this.close();
            }
        });

        this.#on(document, "keydown", (e) => {
            if (e.key === "Escape" && this.#isOpen) {
                this.close();
                this.#displayBtn.focus();
            }
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    //  VUES
    // ══════════════════════════════════════════════════════════════════════

    #showView(view) {
        this.#view = view;
        const isDays = view === "days";
        this.#daysView.hidden = !isDays;
        this.#pickerView.hidden = isDays;
        const arrow = this.#titleBtn.querySelector(
            ".ui-datepicker-title-arrow",
        );
        if (arrow) arrow.style.transform = isDays ? "" : "rotate(180deg)";
        if (isDays) this.#renderDays();
        else this.#renderPicker();
    }

    #openPicker() {
        this.#decadeStart = Math.floor(this.#viewDate.getFullYear() / 10) * 10;
        this.#showView("picker");
    }

    // ══════════════════════════════════════════════════════════════════════
    //  RENDU — JOURS
    // ══════════════════════════════════════════════════════════════════════

    #changeMonth(delta) {
        this.#viewDate = new Date(
            this.#viewDate.getFullYear(),
            this.#viewDate.getMonth() + delta,
            1,
        );
        this.#renderDays();
    }

    #renderDisplay() {
        const v = this.#displayBtn.querySelector(".ui-datepicker-value");
        if (this.#selectedDate) {
            v.textContent = this.#fmt(this.#selectedDate);
            v.classList.remove("ui-datepicker-placeholder");
        } else {
            v.textContent = this.#options.placeholder;
            v.classList.add("ui-datepicker-placeholder");
        }
    }

    #renderDays() {
        const tt = this.#titleBtn.querySelector(".ui-datepicker-title-text");
        if (tt) {
            tt.textContent = new Intl.DateTimeFormat(this.#options.locale, {
                month: "long",
                year: "numeric",
            }).format(this.#viewDate);
        }

        const wf = new Intl.DateTimeFormat(this.#options.locale, {
            weekday: "short",
        });
        const wn = [];
        for (let i = 0; i < 7; i++) {
            const dow = (this.#options.firstDayOfWeek + i) % 7;
            wn.push(wf.format(new Date(2023, 0, 1 + dow)));
        }

        const yr = this.#viewDate.getFullYear();
        const mo = this.#viewDate.getMonth();
        const fom = new Date(yr, mo, 1);
        const off = (fom.getDay() - this.#options.firstDayOfWeek + 7) % 7;
        const st = new Date(yr, mo, 1 - off);
        const tod = this.#iso(new Date());

        let h = "";
        wn.forEach((n) => {
            h += `<div class="ui-datepicker-weekday">${n}</div>`;
        });

        for (let i = 0; i < 42; i++) {
            const d = new Date(st);
            d.setDate(st.getDate() + i);
            const iso = this.#iso(d);
            const cl = ["ui-datepicker-day"];
            if (d.getMonth() !== mo) cl.push("is-outside");
            if (iso === tod) cl.push("is-today");
            if (this.#selectedDate && iso === this.#iso(this.#selectedDate))
                cl.push("is-selected");
            const dis = this.#isDisabledDate(d);
            if (dis) cl.push("is-disabled");
            h += `<button type="button" class="${cl.join(" ")}" data-date="${iso}"${dis ? " disabled" : ""}
                aria-label="${d.toLocaleDateString(this.#options.locale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                })}"
                >${d.getDate()}</button>`;
        }
        this.#gridEl.innerHTML = h;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  RENDU — PICKER (mois + années)
    // ══════════════════════════════════════════════════════════════════════

    #changeDecade(delta) {
        this.#decadeStart += delta;
        this.#renderPicker();
    }

    #renderPicker() {
        const cy = this.#viewDate.getFullYear();
        const cm = this.#viewDate.getMonth();
        const s = this.#decadeStart;
        const e = s + 11;

        this.#decadeLabel.textContent = `${s} – ${e}`;

        // Grille des mois — toujours calculés avec l'année DÉJÀ dans #viewDate
        const mf = new Intl.DateTimeFormat(this.#options.locale, {
            month: "short",
        });
        let mh = "";
        for (let m = 0; m < 12; m++) {
            const dis = this.#isMonthDisabled(cy, m);
            mh += `<button type="button"
                class="ui-datepicker-month-btn${m === cm ? " is-selected" : ""}${dis ? " is-disabled" : ""}"
                data-month="${m}" ${dis ? "disabled" : ""} aria-pressed="${m === cm}">
                ${mf.format(new Date(2024, m, 1))}</button>`;
        }
        this.#monthsGrid.innerHTML = mh;

        // Grille des années
        let yh = "";
        for (let y = s; y <= e; y++) {
            const dis = this.#isYearDisabled(y);
            yh += `<button type="button"
                class="ui-datepicker-year-btn${y === cy ? " is-selected" : ""}${dis ? " is-disabled" : ""}"
                data-year="${y}" ${dis ? "disabled" : ""} aria-pressed="${y === cy}">
                ${y}</button>`;
        }
        this.#yearsGrid.innerHTML = yh;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  UTILITAIRES
    // ══════════════════════════════════════════════════════════════════════

    #isDisabledDate(d) {
        return (
            (this.#minDate && d < this.#minDate) ||
            (this.#maxDate && d > this.#maxDate)
        );
    }
    #isMonthDisabled(y, m) {
        const f = new Date(y, m, 1),
            l = new Date(y, m + 1, 0);
        return (
            (this.#minDate && l < this.#minDate) ||
            (this.#maxDate && f > this.#maxDate)
        );
    }
    #isYearDisabled(y) {
        return (
            (this.#minDate && y < this.#minDate.getFullYear()) ||
            (this.#maxDate && y > this.#maxDate.getFullYear())
        );
    }

    #iso(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${dd}`;
    }
    #parseISO(v) {
        if (!v) return null;
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
        if (!m) return null;
        const [, y, mo, d] = m.map(Number);
        const dt = new Date(y, mo - 1, d);
        return Number.isNaN(dt.getTime()) ? null : dt;
    }
    #pd(v) {
        if (!v) return null;
        if (v instanceof Date) return v;
        return this.#parseISO(v);
    }
    #fmt(d) {
        const f = this.#options.format;
        if (/^[dmy/\-. ]+$/i.test(f)) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return f.replace(/yyyy/g, y).replace(/mm/g, m).replace(/dd/g, dd);
        }
        return new Intl.DateTimeFormat(this.#options.locale, {
            dateStyle: f,
        }).format(d);
    }

    #on(target, event, handler) {
        target.addEventListener(event, handler);
        if (!this.#listeners.has(target)) this.#listeners.set(target, []);
        this.#listeners.get(target).push({ event, handler });
    }
    #emit(eventName, detail = {}) {
        const ev = new CustomEvent(eventName, {
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
        return this.#wrapper.dispatchEvent(ev);
    }
}
