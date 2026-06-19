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

/* ── Alpine ─────────────────────────────────────────────────── */
if (!window.__alpineStarted) {
    Alpine.start();
    window.__alpineStarted = true;
}
window.uiToast = uiToast;
window.RenAlert = RenAlert;

/* ── Registry des instances (pour destroy propre) ───────────── */
const registry = new Map();
function register(el, instance) {
    registry.set(el, instance);
    return instance;
}

/* ── Initialisateurs ─────────────────────────────────────────── */
const INIT_ATTR = "data-ui-init";

function initUISelects(root) {
    root.querySelectorAll(`.ui-select:not([${INIT_ATTR}])`).forEach((el) => {
        if (!el.dataset.placeholder) {
            const ph = el.querySelector(".ui-select-placeholder");
            if (ph) el.dataset.placeholder = ph.textContent.trim();
        }
        el.setAttribute(INIT_ATTR, "1");
        register(el, new UISelect(el));
    });
}

function initUIFileDropzones(root) {
    root.querySelectorAll(`.form-file-group:not([${INIT_ATTR}])`).forEach(
        (el) => {
            if (
                !el.querySelector(".dropzone-input") ||
                !el.querySelector(".dropzone-trigger")
            )
                return;
            el.setAttribute(INIT_ATTR, "1");
            register(
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
        },
    );
}

function initUIAlerts(root) {
    root.querySelectorAll(
        `.ui-alert[data-dismissible]:not([${INIT_ATTR}])`,
    ).forEach((el) => {
        el.setAttribute(INIT_ATTR, "1");
        register(el, new UIAlert(el));
    });
}

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

function initDropdowns(root) {
    root.querySelectorAll(`.dropdown:not([${INIT_ATTR}])`).forEach((el) => {
        el.setAttribute(INIT_ATTR, "1");
        const T = TYPE_MAP[el.dataset.ddType ?? "default"] ?? Dropdown;
        register(el, new T(el));
    });
}

function initNavbars(root) {
    root.querySelectorAll(`.navbar:not([${INIT_ATTR}])`).forEach((el) => {
        el.setAttribute(INIT_ATTR, "1");
        register(el, new Navbar(el));
    });
}

function initModals(root) {
    root.querySelectorAll(`[data-modal-target]:not([${INIT_ATTR}])`).forEach(
        (trigger) => {
            const target = document.querySelector(trigger.dataset.modalTarget);
            if (!target) return;
            trigger.setAttribute(INIT_ATTR, "1");
            const modal = register(target, new Modal(target));
            trigger.addEventListener("click", () => modal.open());
        },
    );
}

function initEditors(root) {
    root.querySelectorAll(`[data-ui-editor]:not([${INIT_ATTR}])`).forEach(
        (el) => {
            el.setAttribute(INIT_ATTR, "1");
            register(el, new UIEditor(el));
        },
    );
}

/* ── Init & Destroy ──────────────────────────────────────────── */
function init(root = document) {
    initUISelects(root);
    initUIFileDropzones(root);
    initUIAlerts(root);
    initDropdowns(root);
    initNavbars(root);
    initModals(root);
    AnimationObserver.init(root);
    initEditors(root);
    root.querySelectorAll(
        `table.datatable:not([data-ui-init]),
         table[data-datatable="true"]:not([data-ui-init])`,
    ).forEach((tableEl) => {
        register(tableEl, new UIDataTable(tableEl));
    });
}

function destroy(root = document) {
    root.querySelectorAll(`[${INIT_ATTR}]`).forEach((el) => {
        const instance = registry.get(el);
        if (instance?.destroy) instance.destroy();
        registry.delete(el);
        el.removeAttribute(INIT_ATTR);
    });
}

/* ── Cycle de vie Turbo : on suspend le rendu plutôt que de réagir après ── */

// Premier chargement (turbo:load reste déclenché au cold start aussi)
document.addEventListener("turbo:load", () => {
    init(document);
    document.documentElement.classList.remove("ui-loading");
});

// Navigation Turbo (page complète) : init AVANT affichage
document.addEventListener("turbo:before-render", (event) => {
    event.preventDefault();
    Promise.resolve()
        .then(() => init(event.detail.newBody))
        .then(() => event.detail.resume());
});

// Turbo Frames (chargement partiel) : init AVANT affichage du frame
document.addEventListener("turbo:before-frame-render", (event) => {
    event.preventDefault();
    Promise.resolve()
        .then(() => init(event.detail.newFrame))
        .then(() => event.detail.resume());
});

// Nettoyage avant mise en cache
document.addEventListener("turbo:before-cache", () => destroy(document));

// Fallback sans Turbo
document.addEventListener("DOMContentLoaded", () => {
    if (!document.documentElement.hasAttribute("data-turbo")) {
        init(document);
        document.documentElement.classList.remove("ui-loading");
    }
});
