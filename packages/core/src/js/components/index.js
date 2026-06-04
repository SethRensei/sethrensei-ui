import Alpine from "alpinejs";

import { UISelect } from "./UI/select-search.js";
import { Dropdown } from "./Classic/dropdown.js";
import { Navbar } from "./Layout/navbar.js";
import { Modal } from "./Classic/modal.js";
import { UIFileDropzone } from "./UI/file-dropzone.js";
import { UIAlert } from "./UI/alert.js";
import { uiToast } from "./UI/toast.js";
import { UIDataTable } from "./UI/datatable.js";

Alpine.start();

/* ── 1. INITIALISATEUR Select With Search ───────────────────── */
function initUISelects(root = document) {
    root.querySelectorAll(".ui-select:not([data-ui-select-init])").forEach(
        (el) => {
            // Skip disabled shells with no dropdown options
            if (!el.querySelector(".ui-select-trigger")) return;
            el.dataset.uiSelectInit = "1";
            // Store placeholder text before first render overwrites it
            const ph = el.querySelector(".ui-select-placeholder");
            if (ph) el.dataset.placeholder = ph.textContent.trim();
            new UISelect(el);
        },
    );
}

/* ── 2. INITIALISATEUR FILE DROPZONES ───────────────── */
function initUIFileDropzones(root = document) {
    // Ciblage via la classe de bloc racine .form-file-group
    root.querySelectorAll(".form-file-group:not([data-file-init])").forEach(
        (el) => {
            // Vérification de sécurité élémentaire (présence de l'input et du trigger)
            if (
                !el.querySelector(".dropzone-input") ||
                !el.querySelector(".dropzone-trigger")
            )
                return;

            el.dataset.fileInit = "1"; // Guard anti-doublon

            // Récupération des options dynamiques via des attributs de données (data-*) optionnels
            const maxSize = el.dataset.maxSize
                ? parseInt(el.dataset.maxSize, 10)
                : 10240;
            const allowed = el.dataset.allowedTypes
                ? el.dataset.allowedTypes.split(",")
                : ["image/png", "image/jpeg", "image/jpg"];

            // Instanciation
            new UIFileDropzone(el, {
                maxSizeKb: maxSize,
                allowedTypes: allowed,
            });
        },
    );
}

/* ── 3. INITIALISATEUR ALERTS ─────────────────────────── */
function initUIAlerts(root = document) {
    root.querySelectorAll(
        ".ui-alert[data-dismissible]:not([data-alert-init])",
    ).forEach((el) => {
        el.dataset.alertInit = "1";
        new UIAlert(el);
    });
}

/* ── 4. INITIALISATEUR TOASTS  ─────────────────────────── */
window.uiToast = uiToast;

/* ── END. CYCLE DE VIE & ÉVÉNEMENTS ───────────────────── */
document.addEventListener("DOMContentLoaded", () => {
    // Initialisation des composants à états complexes / asynchrones
    initUISelects();
    initUIFileDropzones();
    initUIAlerts();
    UIDataTable.init();

    // DROPDOWNS
    document.querySelectorAll(".dropdown").forEach((element) => {
        new Dropdown(element);
    });

    // NAVBAR
    document.querySelectorAll(".navbar").forEach((element) => {
        new Navbar(element);
    });

    // MODALS
    document.querySelectorAll("[data-modal-target]").forEach((trigger) => {
        const target = document.querySelector(trigger.dataset.modalTarget);
        if (!target) return;

        const modal = new Modal(target);
        trigger.addEventListener("click", () => {
            modal.open();
        });
    });
});

document.addEventListener("turbo:load", () => UIDataTable.init());
document.addEventListener("turbolinks:load", () => UIDataTable.init());