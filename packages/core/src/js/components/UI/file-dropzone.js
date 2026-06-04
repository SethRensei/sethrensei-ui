export class UIFileDropzone {
    constructor(element, options = {}) {
        if (!(element instanceof HTMLElement))
            throw new Error("UIFileDropzone: element must be an HTMLElement");
        if (element._uiFileDropzone) return element._uiFileDropzone; // singleton guard

        this.el = element;
        this.opts = Object.assign(
            {
                maxSizeKb: 10240, // 10 MB par défaut
                allowedTypes: [], // [] = Tous les types autorisés par défaut
            },
            options,
        );

        this.file = null;

        this._bindDOM();
        this._bindEvents();

        element._uiFileDropzone = this;
    }

    /* ── DOM binding ─────────────────────────────────────── */
    _bindDOM() {
        this.input = this.el.querySelector(".dropzone-input");
        this.trigger = this.el.querySelector(".dropzone-trigger");
        this.previewContainer = this.el.querySelector(
            ".file-preview-container",
        );
        this.previewDisplay = this.el.querySelector("[id^='file-display-']");
    }

    /* ── Event listeners ─────────────────────────────────── */
    _bindEvents() {
        // Changement de fichier via explorateur
        this.input.addEventListener("change", (e) => this._handleFileChange(e));

        // Drag and drop handlers
        ["dragenter", "dragover"].forEach((eventName) => {
            this.trigger.addEventListener(eventName, (e) => {
                this._preventDefaults(e);
                this.el.dataset.dragover = "true";
            });
        });

        ["dragleave", "drop"].forEach((eventName) => {
            this.trigger.addEventListener(eventName, (e) => {
                this._preventDefaults(e);
                this.el.dataset.dragover = "false";
            });
        });

        this.trigger.addEventListener("drop", (e) => {
            if (this.el.dataset.disabled === "true") return;
            const dt = e.dataTransfer;
            this.input.files = dt.files;
            this.input.dispatchEvent(new Event("change"));
        });
    }

    /* ── Handlers & Logic ────────────────────────────────── */
    _preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    _handleFileChange(e) {
        const file = e.target.files[0];

        if (!file) {
            this.clear();
            return;
        }

        // Validation optionnelle du type et de la taille
        if (!this._validateFile(file)) {
            this.clear();
            return;
        }

        this.file = file;
        this._renderPreview();
        this._emit("file:added", { file });
    }

    _validateFile(file) {
        const sizeKb = file.size / 1024;
        if (sizeKb > this.opts.maxSizeKb) {
            this._emit("file:error", {
                type: "size",
                message: "Fichier trop volumineux",
            });
            return false;
        }
        if (
            this.opts.allowedTypes.length &&
            !this.opts.allowedTypes.includes(file.type)
        ) {
            this._emit("file:error", {
                type: "type",
                message: "Format de fichier non supporté",
            });
            return false;
        }
        return true;
    }

    /* ── Render preview content ──────────────────────────── */
    _renderPreview() {
        if (!this.file) return;

        const fileSize = (this.file.size / 1024).toFixed(2);
        let fileIcon = "fa-file";

        if (this.file.type === "application/pdf") {
            fileIcon = "fa-file-pdf";
        } else if (this.file.type.startsWith("image/")) {
            fileIcon = "fa-file-image";
        }

        this.previewDisplay.innerHTML = `
            <div class="file-preview-card">
                <!-- <i class="fas ${fileIcon} text-primary-500 text-lg">WX</i> -->
                <div class="file-preview-details">
                    <p class="file-preview-name">${this.file.name}</p>
                    <p class="file-preview-size">${fileSize} KB</p>
                </div>
                <button type="button" class="file-preview-remove" aria-label="Supprimer le fichier">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352 512" width="1.125em" height="1.125em" fill="currentColor">
                        <path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.19 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.19 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"/>
                    </svg>
                </button>
            </div>
        `;

        this.previewContainer.classList.remove("hidden");

        // Attachement dynamique du bouton de suppression
        const removeBtn = this.previewDisplay.querySelector(
            ".file-preview-remove",
        );
        removeBtn.addEventListener("click", () => this.clear());
    }

    /* ── API Publique ────────────────────────────────────── */
    clear() {
        this.file = null;
        this.input.value = "";
        this.previewDisplay.innerHTML = "";
        this.previewContainer.classList.add("hidden");
        this._emit("file:removed");
    }

    getFile() {
        return this.file;
    }

    disable() {
        this.el.dataset.disabled = "true";
        this.input.disabled = true;
    }

    enable() {
        this.el.dataset.disabled = "false";
        this.input.disabled = false;
    }

    /* ── Event dispatcher ────────────────────────────────── */
    _emit(name, detail = {}) {
        const event = new CustomEvent(name, { bubbles: true, detail });
        this.el.dispatchEvent(event);
    }

    /* ── Destructeur (Mémoire) ───────────────────────────── */
    destroy() {
        document.removeEventListener("mousedown", this._outsideHandler);
        delete this.el._uiFileDropzone;
    }
}
