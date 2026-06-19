/**
 * ════════════════════════════════════════════════════════════════════════
 *  UIEditor  v3
 * ════════════════════════════════════════════════════════════════════════
 *
 * Nouveautés v3 :
 *  • Titres H1 à H5 + P (paragraphe normal) dans la barre d'outils
 *  • Tous les boutons de bloc (H1–H5, blockquote) fonctionnent en TOGGLE :
 *      - si le bloc courant est déjà ce type → repasse en <p> (désactivé)
 *      - sinon → applique le type
 *  • Listes imbriquées Tab / Shift+Tab (comportement Word)
 *  • Synchronisation continue vers l'<input>/<textarea> soumis au backend
 */
export class UIEditor {
    #listeners = new Map();
    #options = {};

    #source = null;
    #wrapper = null;
    #toolbar = null;
    #content = null;
    #buttons = new Map();

    // ─── Définition des commandes ────────────────────────────────────────
    // type "block"  → formatBlock (toggle : si déjà actif → repasse en p)
    // type "inline" → execCommand state-based (bold, italic, …)
    // type "list"   → insertUnorderedList / insertOrderedList
    // type "action" → commande ponctuelle (link, unlink, undo, redo, clear)
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

    setContent(html, { silent = false } = {}) {
        const clean = this.#options.sanitize ? this.#sanitize(html) : html;
        this.#content.innerHTML = clean;
        this.#syncToSource(silent);
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

    /** Exécute une commande bas niveau (utilisable depuis l'extérieur). */
    exec(command, value = null) {
        this.#content.focus();
        document.execCommand(command, false, value);
        this.#syncToSource();
        this.#refreshToolbarState();
        return this;
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
            this.#on(btn, "click", () => this.#runCommand(key));
        });

        this.#on(this.#content, "input", () => this.#syncToSource());

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
            if (this.isFocused) this.#refreshToolbarState();
        });

        this.#on(this.#content, "keydown", (e) => this.#onKeydown(e));
    }

    // ══════════════════════════════════════════════════════════════════════
    //  GESTION CLAVIER
    // ══════════════════════════════════════════════════════════════════════

    #onKeydown(e) {
        // Raccourcis Ctrl/Cmd
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
                this.#runCommand(key);
            }
            return;
        }
        // Tab dans une liste → indentation
        if (e.key === "Tab") {
            const li = this.#getAncestorLi();
            if (!li) return;
            e.preventDefault();
            e.shiftKey ? this.#unindentList(li) : this.#indentList(li);
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  LISTES IMBRIQUÉES
    // ══════════════════════════════════════════════════════════════════════

    #getAncestorLi() {
        const sel = document.getSelection();
        if (!sel || !sel.rangeCount) return null;
        let node = sel.getRangeAt(0).startContainer;
        while (node && node !== this.#content) {
            if (node.nodeName === "LI") return node;
            node = node.parentNode;
        }
        return null;
    }

    #indentList(li) {
        const parentList = li.parentElement;
        const prevLi = li.previousElementSibling;
        if (!prevLi) return;
        const listType = parentList.tagName.toLowerCase();
        let subList = prevLi.querySelector(`:scope > ${listType}`);
        if (!subList) {
            subList = document.createElement(listType);
            prevLi.appendChild(subList);
        }
        subList.appendChild(li);
        this.#placeCursorInLi(li);
        this.#syncToSource();
    }

    #unindentList(li) {
        const subList = li.parentElement;
        const parentLi = subList.parentElement;
        const rootList = this.#content.querySelector("ul, ol");
        if (!parentLi || parentLi === this.#content || subList === rootList)
            return;
        const outerList = parentLi.parentElement;
        outerList.insertBefore(li, parentLi.nextSibling);
        if (!subList.children.length) subList.remove();
        this.#placeCursorInLi(li);
        this.#syncToSource();
    }

    #placeCursorInLi(li) {
        const sel = document.getSelection();
        const range = document.createRange();
        let textNode = null;
        for (const child of li.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                textNode = child;
                break;
            }
            if (child.nodeName !== "UL" && child.nodeName !== "OL") {
                const walker = document.createTreeWalker(
                    child,
                    NodeFilter.SHOW_TEXT,
                );
                const found = walker.nextNode();
                if (found) {
                    textNode = found;
                    break;
                }
            }
        }
        if (textNode) {
            range.setStart(textNode, textNode.length);
            range.collapse(true);
        } else {
            range.selectNodeContents(li);
            range.collapse(false);
        }
        sel.removeAllRanges();
        sel.addRange(range);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  EXÉCUTION DES COMMANDES
    // ══════════════════════════════════════════════════════════════════════

    #runCommand(key) {
        const def = UIEditor.COMMANDS[key];
        if (!def) return;

        this.#content.focus();

        switch (def.type) {
            case "block":
                this.#toggleBlock(def.tag);
                break;

            case "inline":
                document.execCommand(def.cmd, false, null);
                break;

            case "list":
                document.execCommand(def.cmd, false, null);
                break;

            case "action":
                if (key === "link") {
                    this.#promptLink();
                    return;
                }
                document.execCommand(def.cmd, false, null);
                break;
        }

        this.#syncToSource();
        this.#refreshToolbarState();
    }

    /**
     * Toggle d'un bloc (H1-H5, blockquote, p) :
     *   - si le bloc sous le curseur est DÉJÀ ce tag → repasse en <p>
     *   - sinon → applique le tag
     *
     * Implémentation sans dépendance externe : on utilise execCommand
     * "formatBlock" qui est la seule API universelle pour les blocs.
     * Pour <blockquote> le navigateur utilise "blockquote",
     * pour <p> il utilise "p" ou "div" selon le navigateur →
     * on normalise en forçant "p" quand on désactive.
     */
    #toggleBlock(tag) {
        const current = document
            .queryCommandValue("formatBlock")
            .toLowerCase()
            .trim();
        // Les navigateurs retournent parfois "div" pour <p> par défaut
        const normalize = (t) => (t === "div" ? "p" : t);

        if (normalize(current) === tag) {
            // Déjà actif → repasse en paragraphe normal
            document.execCommand("formatBlock", false, "p");
        } else {
            document.execCommand("formatBlock", false, tag);
        }
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
        this.#syncToSource();
        this.#refreshToolbarState();
    }

    // ══════════════════════════════════════════════════════════════════════
    //  ÉTAT DE LA BARRE D'OUTILS
    // ══════════════════════════════════════════════════════════════════════

    #refreshToolbarState() {
        const currentBlock = document
            .queryCommandValue("formatBlock")
            .toLowerCase()
            .trim();
        const normalize = (t) => (t === "div" ? "p" : t);

        this.#buttons.forEach((btn, key) => {
            const def = UIEditor.COMMANDS[key];
            let active = false;

            try {
                switch (def.type) {
                    case "block":
                        active = normalize(currentBlock) === def.tag;
                        break;
                    case "inline":
                    case "list":
                        active = document.queryCommandState(def.cmd);
                        break;
                    // "action" → jamais actif (undo/redo/clear/link)
                }
            } catch {
                active = false;
            }

            btn.classList.toggle("is-active", active);
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    //  SYNCHRONISATION & UTILITAIRES
    // ══════════════════════════════════════════════════════════════════════

    #syncToSource(silent = false) {
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
        const event = new CustomEvent(eventName, {
            bubbles: true,
            cancelable: true,
            detail: { editor: this, element: this.#wrapper, ...detail },
        });
        return this.#wrapper.dispatchEvent(event);
    }
}