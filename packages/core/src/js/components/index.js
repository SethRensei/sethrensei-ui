import Alpine from "alpinejs";
import { UISelect } from "./UI/select-search.js";
import { Dropdown } from "./Classic/dropdown.js";
import { Navbar } from "./Layout/navbar.js";
import { Modal } from "./Classic/modal.js";
import { UIFileDropzone } from "./UI/file-dropzone.js";
import { UIAlert } from "./UI/alert.js";
import { uiToast } from "./UI/toast.js";
import { UIDataTable } from "./UI/datatable.js";
import { AnimationObserver } from "./Classic/animations.js";

/* ── Alpine ─────────────────────────────────────────────────── */
window.uiToast = uiToast;
Alpine.start();

/* ── Initialisateurs (tous idempotents via guards data-*) ───── */
function initUISelects(root = document) {
    root.querySelectorAll(".ui-select:not([data-ui-select-init])").forEach(
        (el) => {
            if (!el.querySelector(".ui-select-trigger")) return;
            el.dataset.uiSelectInit = "1";
            const ph = el.querySelector(".ui-select-placeholder");
            if (ph) el.dataset.placeholder = ph.textContent.trim();
            new UISelect(el);
        },
    );
}

function initUIFileDropzones(root = document) {
    root.querySelectorAll(".form-file-group:not([data-file-init])").forEach(
        (el) => {
            if (
                !el.querySelector(".dropzone-input") ||
                !el.querySelector(".dropzone-trigger")
            )
                return;
            el.dataset.fileInit = "1";
            new UIFileDropzone(el, {
                maxSizeKb: el.dataset.maxSize
                    ? parseInt(el.dataset.maxSize, 10)
                    : 10240,
                allowedTypes: el.dataset.allowedTypes
                    ? el.dataset.allowedTypes.split(",")
                    : ["image/png", "image/jpeg", "image/jpg"],
            });
        },
    );
}

function initUIAlerts(root = document) {
    root.querySelectorAll(
        ".ui-alert[data-dismissible]:not([data-alert-init])",
    ).forEach((el) => {
        el.dataset.alertInit = "1";
        new UIAlert(el);
    });
}

function initDropdowns(root = document) {
    root.querySelectorAll(".dropdown:not([data-dropdown-init])").forEach(
        (el) => {
            el.dataset.dropdownInit = "1";
            new Dropdown(el);
        },
    );
}

function initNavbars(root = document) {
    root.querySelectorAll(".navbar:not([data-navbar-init])").forEach((el) => {
        el.dataset.navbarInit = "1";
        new Navbar(el);
    });
}

function initModals(root = document) {
    root.querySelectorAll("[data-modal-target]:not([data-modal-init])").forEach(
        (trigger) => {
            const target = document.querySelector(trigger.dataset.modalTarget);
            if (!target) return;
            trigger.dataset.modalInit = "1";
            const modal = new Modal(target);
            trigger.addEventListener("click", () => modal.open());
        },
    );
}

/* ── Point d'entrée unique ──────────────────────────────────── */
function init() {
    initUISelects();
    initUIFileDropzones();
    initUIAlerts();
    initDropdowns();
    initNavbars();
    initModals();
    UIDataTable.init();
    AnimationObserver.init();
    
}

/* ── Cycle de vie : fonctionne avec ou sans Turbo ───────────── */
document.addEventListener("DOMContentLoaded", init);
document.addEventListener("turbo:load", init);
document.addEventListener("turbolinks:load", init);
