import { UISelect } from "./UI/select-search.js";

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