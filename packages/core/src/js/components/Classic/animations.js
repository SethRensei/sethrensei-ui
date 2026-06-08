export class AnimationObserver {
    /* ── Table d'easings ───────────────────────────────────────── */
    static EASINGS = {
        "ease-in": "cubic-bezier(0.4, 0, 1, 1)",
        "ease-out": "cubic-bezier(0, 0, 0.2, 1)",
        "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
        linear: "linear",
        spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        elastic: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        overshoot: "cubic-bezier(0.36, 0.07, 0.19, 0.97)",
        snappy: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        anticipate: "cubic-bezier(0.36, 0.66, 0.04, 1)",
    };

    /*
     * Table de résolution : data-animation="xxx" → nom du keyframe ui-xxx
     * Permet de gérer les alias (ex: "zoom" → "zoom-fade") et
     * de valider les noms sans risque d'injection CSS.
     */
    static KEYFRAMES = {
        /* fade */
        "fade-in": "ui-fade-in",
        "fade-in-up": "ui-fade-in-up",
        "fade-in-down": "ui-fade-in-down",
        "fade-in-left": "ui-fade-in-left",
        "fade-in-right": "ui-fade-in-right",
        /* zoom */
        zoom: "ui-zoom-fade", // alias par défaut
        "zoom-fade": "ui-zoom-fade",
        "zoom-in": "ui-zoom-in",
        drop: "ui-drop",
        rise: "ui-rise",
        pop: "ui-pop",
        /* slide (100%) */
        "slide-in-up": "ui-slide-in-up",
        "slide-in-down": "ui-slide-in-down",
        "slide-in-left": "ui-slide-in-left",
        "slide-in-right": "ui-slide-in-right",
        /* flip 3D */
        "flip-x": "ui-flip-x",
        "flip-y": "ui-flip-y",
        "flip-in": "ui-flip-in",
        swing: "ui-swing",
        /* spéciales */
        elastic: "ui-elastic",
        rubber: "ui-rubber",
        newspaper: "ui-newspaper",
        "rotate-in": "ui-rotate-in",
        "blur-in": "ui-blur-in",
        "skew-in": "ui-skew-in",
        "roll-in": "ui-roll-in",
        unfold: "ui-unfold",
        glitch: "ui-glitch",
    };

    static DEFAULT_ANIMATION = "zoom";
    static DEFAULT_DURATION = 500;
    static DEFAULT_DIRECTION = "ease-in";
    static DEFAULT_THRESHOLD = 0.12;
    static DEFAULT_STAGGER = 80;

    static _observer = null;

    /* ── Point d'entrée (idempotent via data-anim-init) ─────────── */
    static init(root = document) {
        /* IntersectionObserver partagé (threshold par défaut) */
        if (!this._observer) {
            this._observer = new IntersectionObserver(
                (entries) =>
                    entries.forEach((e) => {
                        if (e.isIntersecting) this._play(e.target);
                    }),
                { threshold: this.DEFAULT_THRESHOLD },
            );
        }

        /* 1. Stagger : distribuer les délais AVANT d'observer */
        root.querySelectorAll(
            "[data-stagger-parent]:not([data-stagger-init])",
        ).forEach((parent) => {
            parent.dataset.staggerInit = "1";
            const gap = parseInt(
                parent.dataset.staggerDelay ?? this.DEFAULT_STAGGER,
                10,
            );
            parent
                .querySelectorAll("[data-animation]")
                .forEach((child, idx) => {
                    /* Cumuler avec un éventuel data-delay existant */
                    const base = parseInt(child.dataset.delay ?? 0, 10);
                    child.dataset.delay = base + idx * gap;
                });
        });

        /* 2. Observer chaque [data-animation] non encore initialisé */
        root.querySelectorAll("[data-animation]:not([data-anim-init])").forEach(
            (el) => {
                el.dataset.animInit = "1";

                /* Observer dédié si threshold personnalisé */
                if (el.dataset.threshold) {
                    new IntersectionObserver(
                        (entries) =>
                            entries.forEach((e) => {
                                if (e.isIntersecting) this._play(e.target);
                            }),
                        { threshold: parseFloat(el.dataset.threshold) },
                    ).observe(el);
                } else {
                    this._observer.observe(el);
                }
            },
        );
    }

    /* ── Déclenche l'animation sur un élément ───────────────────── */
    static _play(el) {
        /* data-once : ne joue qu'une fois même si l'observer re-trigger */
        if (el.hasAttribute("data-once") && el.dataset.animPlaying) return;

        const name = el.dataset.animation ?? this.DEFAULT_ANIMATION;
        const keyframe = this.KEYFRAMES[name] ?? `ui-${name}`; // fallback permissif
        const duration = parseInt(
            el.dataset.duration ?? this.DEFAULT_DURATION,
            10,
        );
        const direction = el.dataset.direction ?? this.DEFAULT_DIRECTION;
        const delay = parseInt(el.dataset.animationDelay ?? 0, 10);
        const easing =
            this.EASINGS[direction] ?? this.EASINGS[this.DEFAULT_DIRECTION];

        /* Reset propre pour le replay */
        el.removeAttribute("data-anim-playing");
        el.style.removeProperty("animation");

        /*
         * Double rAF : garantit que le navigateur a bien
         * retiré l'état précédent avant de re-déclencher.
         */
        requestAnimationFrame(() =>
            requestAnimationFrame(() => {
                /* Injecter les valeurs comme custom properties sur l'élément */
                el.style.setProperty("--ui-anim-name", keyframe);
                el.style.setProperty("--ui-anim-duration", `${duration}ms`);
                el.style.setProperty("--ui-anim-easing", easing);
                el.style.setProperty("--ui-anim-delay", `${delay}ms`);

                /* Activer le state CSS */
                el.dataset.animPlaying = "1";
            }),
        );
    }

    /* ── API publique ────────────────────────────────────────────── */

    /** Rejoue manuellement un élément (ex: onclick) */
    static replay(el) {
        this._play(el);
    }

    /** Rejoue tous les éléments animés dans un root */
    static replayAll(root = document) {
        root.querySelectorAll("[data-animation]").forEach((el) =>
            this._play(el),
        );
    }
}
