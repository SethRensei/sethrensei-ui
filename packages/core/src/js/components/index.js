import Alpine from "alpinejs";
import { UISelect } from "./UI/select-search.js";
import {
    Dropdown,
    DropdownHover,
    DropdownMega,
    DropdownSelect,
    DropdownMultiSelect,
    DropdownNested,
    DropdownCommand,
    DropdownContext,
} from "./Classic/dropdown.js";
import { Navbar } from "./Layout/navbar.js";
import { Modal } from "./Classic/modal.js";
import { UIFileDropzone } from "./UI/file-dropzone.js";
import { UIAlert } from "./UI/alert.js";
import { uiToast } from "./UI/toast.js";
import { UIDataTable } from "./UI/datatable.js";
import { AnimationObserver } from "./Classic/animations.js";
import { RenAlert } from "./UI/alert-fn.js";
import { UIEditor } from "./UI/wysiwyg.js";
import { uiLoader } from "./UI/loader.js";

/* ── Alpine ─────────────────────────────────────────────────── */
if (!window.__alpineStarted) {
    Alpine.start();
    window.__alpineStarted = true;
}
window.uiToast = uiToast;
window.RenAlert = RenAlert;
window.uiLoader = uiLoader;

const TYPE_MAP = {
    default: Dropdown,
    hover: DropdownHover,
    mega: DropdownMega,
    select: DropdownSelect,
    "multi-select": DropdownMultiSelect,
    nested: DropdownNested,
    command: DropdownCommand,
    context: DropdownContext,
};

/* ── Classe centrale : tous les init/destroy regroupés ───────── */
class UIKit {
    static INIT_ATTR = "data-ui-init";

    constructor() {
        this.registry = new Map(); // el → instance
    }

    register(el, instance) {
        this.registry.set(el, instance);
        return instance;
    }

    initUISelects(root) {
        root.querySelectorAll(`.ui-select:not([${UIKit.INIT_ATTR}])`).forEach(
            (el) => {
                if (!el.dataset.placeholder) {
                    const ph = el.querySelector(".ui-select-placeholder");
                    if (ph) el.dataset.placeholder = ph.textContent.trim();
                }
                el.setAttribute(UIKit.INIT_ATTR, "1");
                this.register(el, new UISelect(el));
            },
        );
    }

    initUIFileDropzones(root) {
        root.querySelectorAll(
            `.form-file-group:not([${UIKit.INIT_ATTR}])`,
        ).forEach((el) => {
            if (
                !el.querySelector(".dropzone-input") ||
                !el.querySelector(".dropzone-trigger")
            )
                return;
            el.setAttribute(UIKit.INIT_ATTR, "1");
            this.register(
                el,
                new UIFileDropzone(el, {
                    maxSizeKb: el.dataset.maxSize
                        ? parseInt(el.dataset.maxSize, 10)
                        : 10240,
                    allowedTypes: el.dataset.allowedTypes
                        ? el.dataset.allowedTypes.split(",")
                        : ["image/png", "image/jpeg", "image/jpg"],
                }),
            );
        });
    }

    initUIAlerts(root) {
        root.querySelectorAll(
            `.ui-alert[data-dismissible]:not([${UIKit.INIT_ATTR}])`,
        ).forEach((el) => {
            el.setAttribute(UIKit.INIT_ATTR, "1");
            this.register(el, new UIAlert(el));
        });
    }

    initDropdowns(root) {
        root.querySelectorAll(`.dropdown:not([${UIKit.INIT_ATTR}])`).forEach(
            (el) => {
                el.setAttribute(UIKit.INIT_ATTR, "1");
                const T = TYPE_MAP[el.dataset.ddType ?? "default"] ?? Dropdown;
                this.register(el, new T(el));
            },
        );
    }

    initNavbars(root) {
        root.querySelectorAll(`.navbar:not([${UIKit.INIT_ATTR}])`).forEach(
            (el) => {
                el.setAttribute(UIKit.INIT_ATTR, "1");
                this.register(el, new Navbar(el));
            },
        );
    }

    initModals(root) {
        root.querySelectorAll(
            `[data-modal-target]:not([${UIKit.INIT_ATTR}])`,
        ).forEach((trigger) => {
            const target = document.querySelector(trigger.dataset.modalTarget);
            if (!target) return;
            trigger.setAttribute(UIKit.INIT_ATTR, "1");
            const modal = this.register(target, new Modal(target));
            trigger.addEventListener("click", () => modal.open());
        });
    }

    initEditors(root) {
        root.querySelectorAll(
            `[data-ui-editor]:not([${UIKit.INIT_ATTR}])`,
        ).forEach((el) => {
            el.setAttribute(UIKit.INIT_ATTR, "1");
            this.register(el, new UIEditor(el));
        });
    }

    initDataTables(root) {
        root.querySelectorAll(
            `table.datatable:not([${UIKit.INIT_ATTR}]),
             table[data-datatable="true"]:not([${UIKit.INIT_ATTR}])`,
        ).forEach((tableEl) => {
            this.register(tableEl, new UIDataTable(tableEl));
        });
    }

    init(root = document) {
        this.initUISelects(root);
        this.initUIFileDropzones(root);
        this.initUIAlerts(root);
        this.initDropdowns(root);
        this.initNavbars(root);
        this.initModals(root);
        AnimationObserver.init(root);
        this.initEditors(root);
        this.initDataTables(root);
    }

    destroy(root = document) {
        root.querySelectorAll(`[${UIKit.INIT_ATTR}]`).forEach((el) => {
            const instance = this.registry.get(el);
            if (instance?.destroy) instance.destroy();
            this.registry.delete(el);
            el.removeAttribute(UIKit.INIT_ATTR);
        });
    }

    /** init() protégé : ne plante jamais le masquage du loader */
    safeInit(root = document) {
        try {
            this.init(root);
        } catch (err) {
            console.error("[UIKit] erreur pendant l'initialisation :", err);
        } finally {
            uiLoader.hide();
        }
    }
}

export const uiKit = new UIKit();
window.uiKit = uiKit;

/* ── Cycle de vie Turbo ──────────────────────────────────────── */

// Premier chargement (couvre aussi le cold start si Turbo est présent)
document.addEventListener("turbo:load", () => uiKit.safeInit(document));

// Navigation Turbo (page complète) : init avant affichage
document.addEventListener("turbo:before-render", (event) => {
    event.preventDefault();
    Promise.resolve()
        .then(() => uiKit.init(event.detail.newBody))
        .catch((err) =>
            console.error("[UIKit] erreur (turbo:before-render) :", err),
        )
        .finally(() => event.detail.resume());
});

// Turbo Frames (chargement partiel)
document.addEventListener("turbo:before-frame-render", (event) => {
    event.preventDefault();
    Promise.resolve()
        .then(() => uiKit.init(event.detail.newFrame))
        .catch((err) =>
            console.error("[UIKit] erreur (turbo:before-frame-render) :", err),
        )
        .finally(() => event.detail.resume());
});

// Nettoyage avant mise en cache
document.addEventListener("turbo:before-cache", () => uiKit.destroy(document));

// Fallback HTML classique (sans Turbo)
document.addEventListener("DOMContentLoaded", () => {
    if (!document.documentElement.hasAttribute("data-turbo")) {
        uiKit.safeInit(document);
    }
});
