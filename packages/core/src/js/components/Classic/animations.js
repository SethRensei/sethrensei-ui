export class AnimationObserver {
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
    static KEYFRAMES = {
        "fade-in": "ui-fade-in",
        "fade-in-up": "ui-fade-in-up",
        "fade-in-down": "ui-fade-in-down",
        "fade-in-left": "ui-fade-in-left",
        "fade-in-right": "ui-fade-in-right",
        zoom: "ui-zoom-fade",
        "zoom-fade": "ui-zoom-fade",
        "zoom-in": "ui-zoom-in",
        drop: "ui-drop",
        rise: "ui-rise",
        pop: "ui-pop",
        "slide-in-up": "ui-slide-in-up",
        "slide-in-down": "ui-slide-in-down",
        "slide-in-left": "ui-slide-in-left",
        "slide-in-right": "ui-slide-in-right",
        "flip-x": "ui-flip-x",
        "flip-y": "ui-flip-y",
        "flip-in": "ui-flip-in",
        swing: "ui-swing",
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
    static KEYFRAMES_CLOSE = {
        "fade-in": "ui-fade-out",
        "fade-in-up": "ui-fade-out-down",
        "fade-in-down": "ui-fade-out-up",
        "fade-in-left": "ui-fade-out-left",
        "fade-in-right": "ui-fade-out-right",
        "zoom-fade": "ui-zoom-fade-out",
        "zoom-in": "ui-zoom-out",
        "slide-in-up": "ui-slide-out-down",
        "slide-in-down": "ui-slide-out-up",
        "slide-in-left": "ui-slide-out-left",
        "slide-in-right": "ui-slide-out-right",
        "flip-in": "ui-flip-out",
        swing: "ui-swing-out",
        newspaper: "ui-newspaper-out",
        "flip-x": "ui-fade-out",
        "flip-y": "ui-fade-out",
        drop: "ui-fade-out",
        rise: "ui-fade-out",
        pop: "ui-fade-out",
        elastic: "ui-fade-out",
        rubber: "ui-fade-out",
        "rotate-in": "ui-fade-out",
        "blur-in": "ui-fade-out",
        "skew-in": "ui-fade-out",
        "roll-in": "ui-fade-out",
        unfold: "ui-fade-out",
        glitch: "ui-fade-out",
    };
    static DEFAULT_ANIMATION = "zoom";
    static DEFAULT_DURATION = 500;
    static DEFAULT_DIRECTION = "ease-in";
    static DEFAULT_THRESHOLD = 0.12;
    static DEFAULT_STAGGER = 80;
    static DEFAULT_CLOSE_ANIMATION = "ui-fade-out";
    static _observer = null;

    static init(root = document) {
        if (!this._observer) {
            this._observer = new IntersectionObserver(
                (entries) =>
                    entries.forEach((e) => {
                        if (e.isIntersecting) this._play(e.target);
                    }),
                { threshold: this.DEFAULT_THRESHOLD },
            );
        }
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
                    const base = parseInt(child.dataset.delay ?? 0, 10);
                    child.dataset.delay = base + idx * gap;
                });
        });
        root.querySelectorAll("[data-animation]:not([data-anim-init])").forEach(
            (el) => {
                el.dataset.animInit = "1";
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

    static _readOptions(el) {
        return {
            duration: parseInt(
                el.dataset.duration ?? this.DEFAULT_DURATION,
                10,
            ),
            easing:
                this.EASINGS[el.dataset.direction ?? this.DEFAULT_DIRECTION] ??
                this.EASINGS[this.DEFAULT_DIRECTION],
        };
    }

    static _applyAnimation(el, keyframe, duration, easing, delay, attr) {
        el.removeAttribute("data-anim-playing");
        el.removeAttribute("data-anim-closing");
        requestAnimationFrame(() =>
            requestAnimationFrame(() => {
                el.style.setProperty("--ui-anim-name", keyframe);
                el.style.setProperty("--ui-anim-duration", `${duration}ms`);
                el.style.setProperty("--ui-anim-easing", easing);
                el.style.setProperty("--ui-anim-delay", `${delay}ms`);
                el.dataset[attr] = "1";
            }),
        );
    }

    static _play(el) {
        if (el.hasAttribute("data-once") && el.dataset.animPlaying) return;
        const name = el.dataset.animation ?? this.DEFAULT_ANIMATION;
        const keyframe = this.KEYFRAMES[name] ?? `ui-${name}`;
        const delay = parseInt(
            el.dataset.animationDelay ?? el.dataset.delay ?? 0,
            10,
        );
        const { duration, easing } = this._readOptions(el);
        this._applyAnimation(
            el,
            keyframe,
            duration,
            easing,
            delay,
            "animPlaying",
        );
    }

    static _resolveCloseKeyframe(el) {
        const explicit = el.dataset.animationClose;
        if (explicit) return this.KEYFRAMES[explicit] ?? `ui-${explicit}`;
        const openName = el.dataset.animation ?? this.DEFAULT_ANIMATION;
        const openKeyframe = this.KEYFRAMES[openName] ?? `ui-${openName}`;
        return (
            this.KEYFRAMES_CLOSE[openKeyframe] ?? this.DEFAULT_CLOSE_ANIMATION
        );
    }

    static close(el) {
        return new Promise((resolve) => {
            const keyframe = this._resolveCloseKeyframe(el);
            const { duration, easing } = this._readOptions(el);
            this._applyAnimation(
                el,
                keyframe,
                duration,
                easing,
                0,
                "animClosing",
            );
            el.addEventListener(
                "animationend",
                () => {
                    el.removeAttribute("data-anim-closing");
                    resolve(el);
                },
                { once: true },
            );
        });
    }

    static replay(el) {
        this._play(el);
    }
    static replayAll(root = document) {
        root.querySelectorAll("[data-animation]").forEach((el) =>
            this._play(el),
        );
    }
}
