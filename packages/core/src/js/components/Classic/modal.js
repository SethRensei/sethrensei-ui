export class Modal {
    constructor(element) {
        this.modal = element;
        this.overlay = this.modal.querySelector(".modal-overlay");
        this.closeButtons = this.modal.querySelectorAll("[data-close]");
        this.init();
    }

    init() {
        this.closeButtons.forEach((button) => {
            button.addEventListener("click", () => {
                this.close();
            });
        });

        this.overlay?.addEventListener("click", () => {
            this.close();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.modal.classList.contains("show")) {
                this.close();
            }
        });
    }

    open() {
        this.modal.classList.add("show");
        document.body.classList.add("overflow-hidden");
    }

    close() {
        this.modal.classList.remove("show");
        document.body.classList.remove("overflow-hidden");
    }
}
