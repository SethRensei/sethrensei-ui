export class Dropdown {
    constructor(element) {
        this.dropdown = element;
        this.trigger = this.dropdown.querySelector(".dropdown-trigger");
        this.menu = this.dropdown.querySelector(".dropdown-menu");
        this.init();
    }

    init() {
        this.trigger?.addEventListener("click", (e) => {
            e.stopPropagation();
            this.toggle();
        });

        document.addEventListener("click", (e) => {
            if (!this.dropdown.contains(e.target)) {
                this.close();
            }
        });
    }

    toggle() {
        this.dropdown.classList.toggle("open");
    }

    open() {
        this.dropdown.classList.add("open");
    }

    close() {
        this.dropdown.classList.remove("open");
    }
}
