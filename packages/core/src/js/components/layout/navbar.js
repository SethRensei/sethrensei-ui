export class Navbar {
    constructor(element) {
        this.navbar = element;
        this.toggle = this.navbar.querySelector(".navbar-toggle");
        this.mobileMenu = this.navbar.querySelector(".mobile-menu");
        this.init();
    }

    init() {
        this.toggle?.addEventListener("click", () => {
            this.mobileMenu?.classList.toggle("open");
        });
    }
}
