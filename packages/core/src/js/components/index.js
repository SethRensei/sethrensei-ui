import Alpine from "alpinejs";

import { UISelect } from "./UI/select-search.js";
import { Dropdown } from "./Classic/dropdown.js";
import { Navbar } from "./Layout/navbar.js";
import { Modal } from "./Classic/modal.js";

Alpine.start();

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

document.addEventListener("DOMContentLoaded", () => initUISelects());

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