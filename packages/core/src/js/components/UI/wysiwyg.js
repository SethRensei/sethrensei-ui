/**
 * Nouveauté v4 :
 *  • getStyledContent() — retourne le HTML avec des classes Tailwind inlinées
 *    sur chaque balise, de sorte que le contenu reste lisible même avec
 *    Tailwind Preflight (reset CSS). Utilisez cette méthode pour persister
 *    en base de données à la place de getContent().
 *
 *    Les classes injectées suivent les conventions utilitaires Tailwind
 *    (prose-like) : taille, graisse, marge, couleur, etc.
 *    Elles sont configurables via options.tailwindMap.
 *
 *  • H1–H5 + P (toggle : 2e clic = repasse en <p>)
 *  • Listes imbriquées Tab / Shift+Tab
 */
export class UIEditor {
    #listeners = new Map();
    #options = {};

    #source = null;
    #wrapper = null;
    #toolbar = null;
    #content = null;
    #buttons = new Map();

    // ─── Mapping Tailwind par défaut ─────────────────────────────────────
    // Chaque entrée : balise → classes Tailwind injectées lors de getStyledContent()
    // Surchargeables via options.tailwindMap
    static CLASS_MAP = {
        h1: "ui-editor-content h1",
        h2: "ui-editor-content h2",
        h3: "ui-editor-content h3",
        h4: "ui-editor-content h4",
        h5: "ui-editor-content h5",
        p: "ui-editor-content p",
        blockquote: "ui-editor-content blockquote",
        ul: "ui-editor-content ul",
        ol: "ui-editor-content ol",
        li: "leading-relaxed",
        strong: "font-bold",
        em: "italic",
        u: "underline",
        s: "line-through",
        a: "ui-editor-content a",
        // Listes imbriquées
        "ul ul": "ui-editor-content ul ul",
        "ul ul ul": "ui-editor-content ul ul ul",
        "ol ol": "ui-editor-content ol ol",
        "ol ol ol": "ui-editor-content ol ol ol"
    };

    static COMMANDS = {
        p: { type: "block", tag: "p", label: "Paragraphe", icon: "P" },
        h1: { type: "block", tag: "h1", label: "Titre 1", icon: "H1" },
        h2: { type: "block", tag: "h2", label: "Titre 2", icon: "H2" },
        h3: { type: "block", tag: "h3", label: "Titre 3", icon: "H3" },
        h4: { type: "block", tag: "h4", label: "Titre 4", icon: "H4" },
        h5: { type: "block", tag: "h5", label: "Titre 5", icon: "H5" },
        quote: {
            type: "block",
            tag: "blockquote",
            label: "Citation",
            icon: "❝",
        },
        bold: { type: "inline", cmd: "bold", label: "Gras", icon: "B" },
        italic: { type: "inline", cmd: "italic", label: "Italique", icon: "I" },
        underline: {
            type: "inline",
            cmd: "underline",
            label: "Souligné",
            icon: "U",
        },
        strike: {
            type: "inline",
            cmd: "strikeThrough",
            label: "Barré",
            icon: "S",
        },
        ul: {
            type: "list",
            cmd: "insertUnorderedList",
            label: "Liste à puces",
            icon: "•≡",
        },
        ol: {
            type: "list",
            cmd: "insertOrderedList",
            label: "Liste numérotée",
            icon: "1≡",
        },
        link: { type: "action", cmd: "link", label: "Lien", icon: "🔗" },
        unlink: {
            type: "action",
            cmd: "unlink",
            label: "Retirer lien",
            icon: "🔗∅",
        },
        undo: { type: "action", cmd: "undo", label: "Annuler", icon: "↺" },
        redo: { type: "action", cmd: "redo", label: "Rétablir", icon: "↻" },
        clear: {
            type: "action",
            cmd: "removeFormat",
            label: "Effacer style",
            icon: "Tx",
        },
    };

    static DEFAULTS = {
        toolbar: [ "p", "h1", "h2", "h3", "h4", "h5",
            "|", "bold", "italic", "underline", "strike",
            "|", "quote", "ul", "ol",
            "|", "link", "unlink",
            "|", "undo", "redo", "clear",
        ],
        placeholder: "Écrivez ici…",
        minHeight: "10rem",
        sanitize: true,
        tailwindMap: null, // surcharge du CLASS_MAP statique
        onChange: null,
        onFocus: null,
        onBlur: null,
    };

    static EVENTS = {
        READY: "editor:ready",
        CHANGE: "editor:change",
        FOCUS: "editor:focus",
        BLUR: "editor:blur",
    };

    constructor(element, options = {}) {
        if (
            !(element instanceof HTMLTextAreaElement) &&
            !(element instanceof HTMLInputElement)
        )
            throw new TypeError(
                "[UIEditor] Le premier argument doit être un <input> ou <textarea>.",
            );

        this.#source = element;
        this.#options = { ...UIEditor.DEFAULTS, ...options };

        this.#build();
        this.#bindEvents();
        this.setContent(this.#source.value ?? "", { silent: true });

        this.#wrapper._editorInstance = this;
        this.#emit(UIEditor.EVENTS.READY);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  API PUBLIQUE
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Définit le contenu HTML de l'éditeur.
     * Accepte aussi le HTML stylé (avec classes Tailwind) retourné par
     * getStyledContent() : les classes sont ignorées visuellement dans
     * l'éditeur (qui a ses propres styles CSS) mais restent dans le markup.
     */
    setContent(html, { silent = false } = {}) {
        const clean = this.#options.sanitize ? this.#sanitize(html) : html;
        this.#content.innerHTML = clean;
        this.#sync(silent);
        return this;
    }

    getContent() {
        return this.#content.innerHTML;
    }
    getText() {
        return this.#content.textContent ?? "";
    }
    clear() {
        return this.setContent("");
    }

    isEmpty() {
        return (
            this.getText().trim() === "" &&
            /^(<br\s*\/?>|\s)*$/i.test(this.getContent().trim())
        );
    }

    focus() {
        this.#content.focus();
        return this;
    }

    exec(command, value = null) {
        this.#content.focus();
        document.execCommand(command, false, value);
        this.#sync();
        this.#refreshState();
        return this;
    }

    /**
     * Retourne le HTML avec des classes Tailwind injectées sur chaque balise.
     * À utiliser pour persister en base de données afin que le contenu
     * soit lisible même sous Tailwind Preflight (reset CSS).
     *
     * @param {object} [mapOverride] — surcharge ponctuelle du tailwindMap
     * @returns {string} HTML stylé
     */
    getStyledContent(mapOverride = {}) {
        const map = {
            ...UIEditor.CLASS_MAP,
            ...(this.#options.tailwindMap ?? {}),
            ...mapOverride,
        };

        // Clone le DOM de l'éditeur pour ne pas altérer l'affichage
        const clone = this.#content.cloneNode(true);

        // Sélecteurs simples (balise directe)
        const simpleTags = [ "h1", "h2", "h3", "h4", "h5", "p",
            "blockquote", "ul", "ol", "li", "strong", "em", "u", "s", "a"
        ];
        simpleTags.forEach((tag) => {
            const classes = map[tag];
            if (!classes) return;
            clone.querySelectorAll(tag).forEach((el) => {
                this.#addClasses(el, classes);
            });
        });

        // Sélecteurs imbriqués (ul ul, ol ol, etc.)
        const nestedSelectors = ["ul ul", "ul ul ul", "ol ol", "ol ol ol", "ul ol", "ol ul"];
        nestedSelectors.forEach((sel) => {
            const classes = map[sel] ?? map[sel.split(" ")[1]]; // fallback sur le tag
            if (!classes) return;
            clone.querySelectorAll(sel).forEach((el) => {
                this.#addClasses(el, classes);
            });
        });

        return clone.innerHTML;
    }

    setOptions(o = {}) {
        this.#options = { ...this.#options, ...o };
        if ("placeholder" in o)
            this.#content.setAttribute(
                "data-placeholder",
                this.#options.placeholder,
            );
        if ("minHeight" in o)
            this.#content.style.minHeight = this.#options.minHeight;
        return this;
    }

    getOptions() {
        return { ...this.#options };
    }

    destroy() {
        this.#listeners.forEach((handlers, target) =>
            handlers.forEach(({ event, handler }) =>
                target.removeEventListener(event, handler),
            ),
        );
        this.#listeners.clear();
        this.#source.classList.remove("ui-editor-source");
        this.#source.removeAttribute("aria-hidden");
        this.#source.removeAttribute("tabindex");
        this.#wrapper.replaceWith(this.#source);
        delete this.#wrapper._editorInstance;
    }

    get element() {
        return this.#wrapper;
    }
    get input() {
        return this.#source;
    }
    get isFocused() {
        return document.activeElement === this.#content;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  CONSTRUCTION DU DOM
    // ══════════════════════════════════════════════════════════════════════

    #build() {
        const wrapper = document.createElement("div");
        wrapper.className = "ui-editor";

        this.#source.classList.add("ui-editor-source");
        this.#source.setAttribute("aria-hidden", "true");
        this.#source.setAttribute("tabindex", "-1");
        this.#source.replaceWith(wrapper);
        wrapper.appendChild(this.#source);

        const toolbar = document.createElement("div");
        toolbar.className = "ui-editor-toolbar";
        toolbar.setAttribute("role", "toolbar");

        this.#options.toolbar.forEach((key) => {
            if (key === "|") {
                const sep = document.createElement("span");
                sep.className = "ui-editor-separator";
                sep.setAttribute("aria-hidden", "true");
                toolbar.appendChild(sep);
                return;
            }
            const def = UIEditor.COMMANDS[key];
            if (!def) return;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "ui-editor-btn";
            btn.dataset.command = key;
            btn.title = def.label;
            btn.setAttribute("aria-label", def.label);
            btn.innerHTML = `<span class="ui-editor-btn-icon">${def.icon}</span>`;
            toolbar.appendChild(btn);
            this.#buttons.set(key, btn);
        });

        const content = document.createElement("div");
        content.className = "ui-editor-content";
        content.contentEditable = "true";
        content.setAttribute("role", "textbox");
        content.setAttribute("aria-multiline", "true");
        content.setAttribute("data-placeholder", this.#options.placeholder);
        content.style.minHeight = this.#options.minHeight;

        wrapper.appendChild(toolbar);
        wrapper.appendChild(content);

        this.#wrapper = wrapper;
        this.#toolbar = toolbar;
        this.#content = content;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  ÉVÉNEMENTS
    // ══════════════════════════════════════════════════════════════════════

    #bindEvents() {
        this.#buttons.forEach((btn, key) => {
            this.#on(btn, "click", () => this.#run(key));
        });
        this.#on(this.#content, "input", () => this.#sync());
        this.#on(this.#content, "focus", () => {
            this.#wrapper.classList.add("is-focused");
            this.#emit(UIEditor.EVENTS.FOCUS);
            this.#options.onFocus?.call(this, this);
        });
        this.#on(this.#content, "blur", () => {
            this.#wrapper.classList.remove("is-focused");
            this.#emit(UIEditor.EVENTS.BLUR);
            this.#options.onBlur?.call(this, this);
        });
        this.#on(document, "selectionchange", () => {
            if (this.isFocused) this.#refreshState();
        });
        this.#on(this.#content, "keydown", (e) => this.#onKey(e));
    }

    #onKey(e) {
        if (e.ctrlKey || e.metaKey) {
            const map = {
                b: "bold",
                i: "italic",
                u: "underline",
                z: "undo",
                y: "redo",
            };
            const key = map[e.key.toLowerCase()];
            if (key) {
                e.preventDefault();
                this.#run(key);
            }
            return;
        }
        if (e.key === "Tab") {
            const li = this.#ancestorLi();
            if (!li) return;
            e.preventDefault();
            e.shiftKey ? this.#unindent(li) : this.#indent(li);
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  LISTES IMBRIQUÉES
    // ══════════════════════════════════════════════════════════════════════

    #ancestorLi() {
        const sel = document.getSelection();
        if (!sel || !sel.rangeCount) return null;
        let node = sel.getRangeAt(0).startContainer;
        while (node && node !== this.#content) {
            if (node.nodeName === "LI") return node;
            node = node.parentNode;
        }
        return null;
    }

    #indent(li) {
        const pl = li.parentElement;
        const prev = li.previousElementSibling;
        if (!prev) return;
        const lt = pl.tagName.toLowerCase();
        let sl = prev.querySelector(`:scope > ${lt}`);
        if (!sl) {
            sl = document.createElement(lt);
            prev.appendChild(sl);
        }
        sl.appendChild(li);
        this.#cursorInLi(li);
        this.#sync();
    }

    #unindent(li) {
        const sl = li.parentElement;
        const pl = sl.parentElement;
        const root = this.#content.querySelector("ul, ol");
        if (!pl || pl === this.#content || sl === root) return;
        pl.parentElement.insertBefore(li, pl.nextSibling);
        if (!sl.children.length) sl.remove();
        this.#cursorInLi(li);
        this.#sync();
    }

    #cursorInLi(li) {
        const sel = document.getSelection();
        const r = document.createRange();
        let tn = null;
        for (const ch of li.childNodes) {
            if (ch.nodeType === Node.TEXT_NODE) {
                tn = ch;
                break;
            }
            if (ch.nodeName !== "UL" && ch.nodeName !== "OL") {
                const w = document.createTreeWalker(ch, NodeFilter.SHOW_TEXT);
                const f = w.nextNode();
                if (f) {
                    tn = f;
                    break;
                }
            }
        }
        if (tn) {
            r.setStart(tn, tn.length);
            r.collapse(true);
        } else {
            r.selectNodeContents(li);
            r.collapse(false);
        }
        sel.removeAllRanges();
        sel.addRange(r);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  COMMANDES
    // ══════════════════════════════════════════════════════════════════════

    #run(key) {
        const def = UIEditor.COMMANDS[key];
        if (!def) return;
        this.#content.focus();

        if (def.type === "block") {
            this.#toggleBlock(def.tag);
        } else if (def.type === "inline") {
            document.execCommand(def.cmd, false, null);
        } else if (def.type === "list") {
            document.execCommand(def.cmd, false, null);
        } else if (key === "link") {
            this.#promptLink();
            return;
        } else {
            document.execCommand(def.cmd, false, null);
        }

        this.#sync();
        this.#refreshState();
    }

    #toggleBlock(tag) {
        const cur = document
            .queryCommandValue("formatBlock")
            .toLowerCase()
            .trim();
        const norm = (t) => (t === "div" ? "p" : t);
        document.execCommand(
            "formatBlock",
            false,
            norm(cur) === tag ? "p" : tag,
        );
    }

    #promptLink() {
        const sel = document.getSelection();
        if (!sel || sel.isCollapsed) {
            window.alert(
                "Sélectionnez d'abord le texte à transformer en lien.",
            );
            return;
        }
        const url = window.prompt("URL du lien :", "https://");
        if (!url) return;
        document.execCommand("createLink", false, url);
        this.#sync();
        this.#refreshState();
    }

    #refreshState() {
        const cur = document
            .queryCommandValue("formatBlock")
            .toLowerCase()
            .trim();
        const norm = (t) => (t === "div" ? "p" : t);
        this.#buttons.forEach((btn, key) => {
            const def = UIEditor.COMMANDS[key];
            let active = false;
            try {
                if (def.type === "block") {
                    active = norm(cur) === def.tag;
                } else if (def.type === "inline" || def.type === "list") {
                    active = document.queryCommandState(def.cmd);
                }
            } catch {
                active = false;
            }
            btn.classList.toggle("is-active", active);
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    //  UTILITAIRES
    // ══════════════════════════════════════════════════════════════════════

    /** Ajoute des classes sans supprimer les existantes. */
    #addClasses(el, classString) {
        classString
            .trim()
            .split(/\s+/)
            .forEach((c) => {
                if (c) el.classList.add(c);
            });
    }

    #sync(silent = false) {
        const html = this.getContent();
        this.#source.value = html;
        this.#source.dispatchEvent(new Event("input", { bubbles: true }));
        this.#source.dispatchEvent(new Event("change", { bubbles: true }));
        if (!silent) {
            this.#emit(UIEditor.EVENTS.CHANGE, { html });
            this.#options.onChange?.call(this, html, this);
        }
    }

    #sanitize(html) {
        const t = document.createElement("template");
        t.innerHTML = html;
        t.content
            .querySelectorAll("script, style")
            .forEach((el) => el.remove());
        t.content.querySelectorAll("*").forEach((el) => {
            [...el.attributes].forEach((attr) => {
                const name = attr.name.toLowerCase();
                const value = attr.value.trim().toLowerCase();
                if (
                    name.startsWith("on") ||
                    (name === "href" && value.startsWith("javascript:"))
                )
                    el.removeAttribute(attr.name);
            });
        });
        return t.innerHTML;
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
            detail: { editor: this, element: this.#wrapper, ...detail },
        });
        return this.#wrapper.dispatchEvent(ev);
    }
}