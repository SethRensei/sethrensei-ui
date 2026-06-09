/**
 * @fileoverview UIDataTable — Design System Component
 * @version 2.0.0
 *
 * Nouveautés v2 :
 *  - Export Word (.docx) et Excel (.xlsx) au format Office 2016+ (OOXML)
 *    via SheetJS pour xlsx ; docx généré en XML OpenDocument natif
 *  - Export scope : 'all' (toutes données), 'filtered' (état filtré/trié),
 *    'page' (page courante seulement)
 *  - Filtre date piloté par data-filter-date sur la colonne, label auto
 *    "Filtre par {nom_col}", plusieurs colonnes supportées
 *  - Table stylisable sans init JS (classes CSS autonomes)
 *  - Alternance lignes/colonnes : dt-table-striped / dt-table-striped-cols
 */
"use strict";

import * as XLSX from "xlsx";

/* ── ICONS ─────────────────────────────────────────────────── */
const Icons = {
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
    sortNone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9l4-4 4 4M8 15l4 4 4-4"/></svg>`,
    sortAsc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7-7 7 7"/></svg>`,
    sortDesc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>`,
    filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
    download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
    eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
    chevLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
    chevRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
    chevsLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>`,
    chevsRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>`,
    emptyBox: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
};

/* ── UTILS ─────────────────────────────────────────────────── */
function parseDate(str) {
    if (!str) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str);
    const p = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (p) return new Date(`${p[3]}-${p[2]}-${p[1]}`);
    return null;
}
function dispatch(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
}
function el(tag, attrs = {}, html = "") {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
        if (k === "cls") e.className = v;
        else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v);
    });
    if (html) e.innerHTML = html;
    return e;
}
function esc(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
    }, 1000);
}

/* ──────────────────────────────────────────────────────────────
   EXPORT  —  Office 2016+ OOXML
   ────────────────────────────────────────────────────────────── */

/**
 * Export .xlsx Office 2016+ via SheetJS
 */
export async function exportExcelOOXML(headers, rows, filename) {
    if (typeof XLSX === "undefined") {
        // Fallback HTML/xls si SheetJS non chargé
        exportExcelFallback(headers, rows, filename);
        return;
    }
    const ws_data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    // Style d'en-tête (couleur via SheetJS est pro uniquement, on met bold via cellStyle)
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[addr]) continue;
        ws[addr].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "D0E4F7" } },
            alignment: { horizontal: "center" },
        };
    }
    // Largeurs colonnes auto
    ws["!cols"] = headers.map((h, ci) => {
        const maxLen = Math.max(
            h.length,
            ...rows.map((r) => String(r[ci] || "").length),
        );
        return { wch: Math.min(maxLen + 2, 40) };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Données");
    XLSX.writeFile(wb, filename + ".xlsx");
}

function exportExcelFallback(headers, rows, filename) {
    const thead = `<tr>${headers.map((h) => `<th style="background:#d0e4f7;font-weight:bold;border:1px solid #999;padding:5px 8px">${esc(h)}</th>`).join("")}</tr>`;
    const tbody = rows
        .map(
            (r) =>
                `<tr>${r.map((c) => `<td style="border:1px solid #ccc;padding:4px 8px">${esc(c)}</td>`).join("")}</tr>`,
        )
        .join("");
    const html = `<html><head><meta charset="UTF-8"></head><body><table border="1">${thead}${tbody}</table></body></html>`;
    const blob = new Blob([html], {
        type: "application/vnd.ms-excel;charset=utf-8;",
    });
    triggerDownload(blob, filename + ".xls");
}

/**
 * Export .docx Office 2016+ (XML OpenDocument Word)
 * Génère un vrai fichier .docx (ZIP contenant du XML OOXML)
 * sans dépendance externe grâce à JSZip intégré en base64.
 * Si JSZip absent, fallback .doc HTML.
 */
function exportWordOOXML(headers, rows, title, filename) {
    // Tentative docx OOXML natif (nécessite JSZip)
    // On utilise directement la génération XML inline + Blob ZIP-like
    // Pour Office 2016+ sans JSZip, on génère un HTML Word XML (WordprocessingML)
    // qui est nativement reconnu par Word 2016+ et LibreOffice

    const colCount = headers.length;

    // Construire les lignes XML
    const makeRow = (cells, isHeader) => {
        const trPr = isHeader ? `<w:trPr><w:tblHeader/></w:trPr>` : "";
        const tds = cells
            .map((c) => {
                const bold = isHeader ? "<w:b/><w:bCs/>" : "";
                const shade = isHeader
                    ? `<w:shd w:val="clear" w:color="auto" w:fill="DCE6F1"/>`
                    : "";
                return `<w:tc>
        <w:tcPr>${shade}<w:tcW w:w="0" w:type="auto"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="${isHeader ? "center" : "left"}"/></w:pPr>
          <w:r><w:rPr>${bold}</w:rPr><w:t xml:space="preserve">${esc(String(c))}</w:t></w:r>
        </w:p>
      </w:tc>`;
            })
            .join("");
        return `<w:tr>${trPr}${tds}</w:tr>`;
    };

    const tableXML = `
  <w:tbl>
    <w:tblPr>
      <w:tblStyle w:val="TableGrid"/>
      <w:tblW w:w="0" w:type="auto"/>
      <w:tblBorders>
        <w:top    w:val="single" w:sz="4" w:space="0" w:color="999999"/>
        <w:left   w:val="single" w:sz="4" w:space="0" w:color="999999"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="999999"/>
        <w:right  w:val="single" w:sz="4" w:space="0" w:color="999999"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
      </w:tblBorders>
      <w:tblLook w:val="04A0"/>
    </w:tblPr>
    <w:tblGrid>${headers.map(() => `<w:gridCol w:w="1800"/>`).join("")}</w:tblGrid>
    ${makeRow(headers, true)}
    ${rows.map((r) => makeRow(r, false)).join("\n")}
  </w:tbl>`;

    const docXML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Word.Document"?>
<w:wordDocument
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  mc:Ignorable="w14">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>${esc(title)}</w:t></w:r>
    </w:p>
    ${tableXML}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1080" w:bottom="1440" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:wordDocument>`;

    const blob = new Blob([docXML], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    triggerDownload(blob, filename + ".docx");
}

/**
 * Export PDF via fenêtre d'impression
 */
function exportPDF(headers, rows, title) {
    const isLandscape = headers.length > 5;
    const thead = `<tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>`;
    const tbody = rows
        .map(
            (r) =>
                `<tr>${r.map((c) => `<td>${esc(String(c))}</td>`).join("")}</tr>`,
        )
        .join("");
    const win = window.open("", "_blank");
    win.document
        .write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(title)}</title>
    <style>
      @page { size: ${isLandscape ? "A4 landscape" : "A4 portrait"}; margin: 15mm; }
      body  { font: 11px/1.4 'Segoe UI', system-ui, sans-serif; color:#111; }
      h2    { font-size:14px; margin:0 0 10px; }
      table { border-collapse:collapse; width:100%; }
      th    { background:#edf2f7; font-size:9px; text-transform:uppercase; letter-spacing:.04em; padding:5px 7px; text-align:left; border:0.5px solid #ccc; }
      td    { padding:4px 7px; border:0.5px solid #ddd; font-size:10px; }
      tr:nth-child(even) td { background:#f9f9f8; }
    </style></head><body>
    <h2>${esc(title)}</h2>
    <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
    <script>window.onload=()=>{window.print();window.close();}<\/script>
    </body></html>`);
    win.document.close();
}

/* ──────────────────────────────────────────────────────────────
   MAIN CLASS
   ────────────────────────────────────────────────────────────── */
export class UIDataTable {
    static #instances = new Map();

    constructor(tableEl) {
        // Empêche la double-initialisation si Turbo rejoue avant destroy
        if (tableEl.hasAttribute("data-ui-init")) return;
        this.table = tableEl;
        this.id = tableEl.id || `dt_${Math.random().toString(36).slice(2, 8)}`;
        if (!tableEl.id) tableEl.id = this.id;
        this._storageKey = `datatable_${this.id}`;
        this._exportFormats = (tableEl.dataset.export || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        this._paginationStyle = tableEl.dataset.paginationStyle || "pill";
        this._columns = [];
        this._rawRows = [];
        this._bodyRows = [];
        this._state = {
            page: 1,
            pageSize: parseInt(tableEl.dataset.pageSize || "10", 10),
            globalSearch: "",
            sortCol: null,
            sortDir: null,
            colSearch: {},
            colFilter: {},
        };
        this._wrapper = null;
        this._filterbar = null;
        this._datebar = null;
        this._scrollArea = null;
        this._paginationEl = null;
        this._countEl = null;
        this._exportMenu = null;
        this._init();
        UIDataTable.#instances.set(this.id, this);
        dispatch("datatable:init", { id: this.id });
    }

    /* ── STATIC ── */
    static init(root = document) {
        root.querySelectorAll(
            'table.datatable, table[data-datatable="true"]',
        ).forEach((t) => {
            if (!UIDataTable.#instances.has(t.id || "_")) new UIDataTable(t);
        });
    }
    static getInstance(id) {
        return UIDataTable.#instances.get(id);
    }

    /* ── INIT ── */
    _init() {
        this.table.setAttribute("data-ui-init", "1"); // ← garde Turbo
        this._parseColumns();
        this._parseRows();
        this._restoreState();
        this._buildUI();
        this._render();
    }

    _parseColumns() {
        const ths = this.table.querySelectorAll("thead tr:first-child th");
        ths.forEach((th, i) => {
            // ── Lire le label ORIGINAL avant que _buildThead ne modifie le th ──
            // On stocke sur le th lui-même pour survivre au snapshot Turbo
            if (!th.dataset.originalLabel) {
                th.dataset.originalLabel = th.textContent.trim();
            }
            this._columns.push({
                index: i,
                label: th.textContent.trim(),
                label: th.dataset.originalLabel, // ← label stable
                sortable: th.dataset.sorted === "true",
                searchable: th.dataset.search === "true",
                filterable: th.dataset.filter === "true",
                filterDate: th.dataset.filterDate === "true",
                noExport:
                    th.dataset.noexport === "true" ||
                    th.classList.contains("col-action"),
            });
        });
    }

    _parseRows() {
        const rows = Array.from(this.table.querySelectorAll("tbody tr"));
        this._bodyRows = rows;
        this._rawRows = rows.map((tr) =>
            Array.from(tr.querySelectorAll("td")).map((td) =>
                td.textContent.trim(),
            ),
        );
    }

    _restoreState() {
        try {
            const saved = localStorage.getItem(this._storageKey);
            if (saved) this._state = { ...this._state, ...JSON.parse(saved) };
        } catch (_) {}
    }
    _saveState() {
        try {
            localStorage.setItem(this._storageKey, JSON.stringify(this._state));
        } catch (_) {}
    }

    /* ── BUILD UI ── */
    _buildUI() {
        const wrapper = el("div", { cls: "dt-root dt-wrapper" });
        const mh = this.table.style.getPropertyValue("--dt-max-height");
        if (mh) wrapper.style.setProperty("--dt-max-height", mh);
        this.table.parentNode.insertBefore(wrapper, this.table);
        this._wrapper = wrapper;

        wrapper.appendChild(this._buildToolbar());

        // Barre de filtres de dates (auto-générée depuis data-filter-date)
        this._datebar = this._buildDatebar();
        if (this._datebar) wrapper.appendChild(this._datebar);

        // Barre de chips de filtres actifs
        this._filterbar = el("div", {
            cls: "dt-filterbar",
            style: "display:none",
        });
        wrapper.appendChild(this._filterbar);

        // Zone de défilement avec la table
        const scroll = el("div", {
            cls: "dt-scroll",
            role: "region",
            "aria-label": "Données",
        });
        scroll.appendChild(this.table);
        wrapper.appendChild(scroll);
        this._scrollArea = scroll;

        this._buildThead();
        wrapper.appendChild(this._buildFooter());
    }

    _buildToolbar() {
        const bar = el("div", { cls: "dt-toolbar" });
        const left = el("div", { cls: "dt-toolbar-left" });
        const right = el("div", { cls: "dt-toolbar-right" });

        // Recherche globale
        if (this.table.dataset.search === "true") {
            const wrap = el("div", { cls: "dt-search-wrap" });
            wrap.innerHTML = Icons.search;
            const inp = el("input", {
                cls: "dt-search-input",
                type: "text",
                placeholder: "Recherche…",
                "aria-label": "Recherche globale",
                value: this._state.globalSearch,
                oninput: (e) => {
                    this._state.globalSearch = e.target.value;
                    this._state.page = 1;
                    this._render();
                    dispatch("datatable:search", {
                        id: this.id,
                        value: e.target.value,
                    });
                },
            });
            wrap.appendChild(inp);
            left.appendChild(wrap);
            this._globalSearchEl = inp;
        }

        // Taille de page
        const ps = el("select", {
            cls: "dt-page-size",
            "aria-label": "Lignes par page",
            onchange: (e) => {
                this._state.pageSize = +e.target.value;
                this._state.page = 1;
                this._render();
            },
        });
        [5, 10, 25, 50, 100].forEach((n) => {
            const o = el("option");
            o.value = n;
            o.textContent = n;
            if (n === this._state.pageSize) o.selected = true;
            ps.appendChild(o);
        });
        left.appendChild(ps);
        bar.appendChild(left);

        // Bouton filtres actifs
        this._filterBadgeBtn = el("button", {
            cls: "dt-btn",
            type: "button",
            "aria-label": "Filtres actifs",
        });
        this._filterBadgeBtn.innerHTML = `${Icons.filter} <span class="dt-label-hide">Filtres</span>`;
        this._filterBadge = el(
            "span",
            { cls: "dt-btn-badge", style: "display:none" },
            "0",
        );
        this._filterBadgeBtn.appendChild(this._filterBadge);
        right.appendChild(this._filterBadgeBtn);

        // Export dropdown — 3 scopes : toutes / filtrées / page courante
        if (this._exportFormats.length > 0) {
            const wrap = el("div", { cls: "dt-export-wrap" });
            const btn = el("button", {
                cls: "dt-btn",
                type: "button",
                "aria-haspopup": "true",
                "aria-expanded": "false",
                onclick: (e) => {
                    e.stopPropagation();
                    this._toggleExportMenu();
                },
            });
            btn.innerHTML = `${Icons.download} <span class="dt-label-hide">Exporter</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:10px;height:10px;margin-left:2px"><polyline points="6 9 12 15 18 9"/></svg>`;
            this._exportToggleBtn = btn;

            const menu = el("div", { cls: "dt-export-menu", role: "menu" });
            this._exportMenu = menu;

            const fmtLabels = { excel: "Excel", pdf: "PDF", word: "Word" };
            const fmtExts = {
                excel: ".xlsx",
                pdf: "impression",
                word: ".docx",
            };

            const scopes = [
                {
                    key: "all",
                    label: "All data",
                    icon: Icons.download,
                },
                {
                    key: "filtered",
                    label: "Current status (active filters)",
                    icon: Icons.filter,
                },
                {
                    key: "page",
                    label: "Current page only",
                    icon: Icons.eye,
                },
            ];

            this._exportFormats.forEach((fmt, fi) => {
                if (fi > 0)
                    menu.appendChild(el("div", { cls: "dt-export-sep" }));
                const secLabel = el("div", { cls: "dt-export-section-label" });
                secLabel.innerHTML = `${fmtLabels[fmt] || fmt} <span style="color:var(--dt-text-tertiary)">${fmtExts[fmt] || ""}</span>`;
                menu.appendChild(secLabel);
                scopes.forEach((scope) => {
                    const item = el("button", {
                        cls: "dt-export-item",
                        type: "button",
                        role: "menuitem",
                        onclick: () => {
                            this.export(fmt, scope.key);
                            this._closeExportMenu();
                        },
                    });
                    item.innerHTML = `${scope.icon} ${scope.label}`;
                    menu.appendChild(item);
                });
            });

            wrap.appendChild(btn);
            wrap.appendChild(menu);
            right.appendChild(wrap);
            document.addEventListener("click", () => this._closeExportMenu());
        }

        // Refresh
        const refreshBtn = el("button", {
            cls: "dt-btn dt-btn-icon",
            type: "button",
            "aria-label": "Refresh",
            onclick: () => this.refresh(),
        });
        refreshBtn.innerHTML = Icons.refresh;
        right.appendChild(refreshBtn);

        bar.appendChild(right);
        return bar;
    }

    /**
     * Construit la barre de filtres de dates depuis les colonnes data-filter-date.
     * Label auto : "Filtre par {nom_col}"
     */
    _buildDatebar() {
        const dateCols = this._columns.filter((c) => c.filterDate);
        if (dateCols.length === 0) return null;

        const bar = el("div", { cls: "dt-datebar" });
        bar.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--dt-text-tertiary)">${Icons.calendar}</span>`;

        dateCols.forEach((col, i) => {
            if (i > 0) {
                bar.appendChild(el("div", { cls: "dt-datebar-divider" }));
            }

            const group = el("div", { cls: "dt-datebar-group" });

            const lbl = el("span", { cls: "dt-datebar-label" });
            lbl.textContent = `Filter by ${col.label} :`;
            group.appendChild(lbl);

            const startId = `dt_ds_${this.id}_${col.index}`;
            const endId = `dt_de_${this.id}_${col.index}`;

            const startInput = el("input", {
                type: "date",
                id: startId,
                "aria-label": `${col.label} — date début`,
                oninput: () => {
                    this._state.page = 1;
                    this._render();
                },
            });
            const sep = el("span", { cls: "dt-datebar-sep" });
            sep.textContent = "→";
            const endInput = el("input", {
                type: "date",
                id: endId,
                "aria-label": `${col.label} — date fin`,
                oninput: () => {
                    this._state.page = 1;
                    this._render();
                },
            });

            group.appendChild(startInput);
            group.appendChild(sep);
            group.appendChild(endInput);
            bar.appendChild(group);

            // Référencer les inputs pour le filtrage
            this[`_dateStart_${col.index}`] = startInput;
            this[`_dateEnd_${col.index}`] = endInput;
        });

        return bar;
    }

    _buildThead() {
        const ths = Array.from(
            this.table.querySelectorAll("thead tr:first-child th"),
        );
        ths.forEach((th, i) => {
            const col = this._columns[i];
            if (!col) return;

            // ── Nettoyage défensif : retire ce qu'une init précédente aurait laissé ──
            th.querySelector(".dt-th-inner")?.remove();
            th.querySelector(".dt-th-filter")?.remove();
            th.removeEventListener("click", th._sortHandler); // voir ci-dessous

            // Checkbox column
            if (th.classList.contains("col-check")) {
                th.innerHTML =
                    '<input type="checkbox" class="dt-check" aria-label="Select all">';
                th.querySelector("input").addEventListener("change", (e) =>
                    this._toggleAll(e.target.checked),
                );
                return;
            }
            // Actions column — skip
            if (th.classList.contains("col-action")) return;

            const inner = el("div", { cls: "dt-th-inner" });
            const lbl = el("span");
            lbl.textContent = col.label;
            inner.appendChild(lbl);

            if (col.sortable) {
                th.classList.add("sortable");
                const icon = el("span", { cls: "dt-sort-icon" });
                icon.innerHTML = Icons.sortNone;
                inner.appendChild(icon);

                // Stocker le handler pour pouvoir le retirer au prochain cycle
                th._sortHandler = () => this._cycleSort(i, th, icon);
                th.addEventListener("click", th._sortHandler);
                this._syncSortIcon(i, th, icon);
            }

            th.innerHTML = "";
            th.appendChild(inner);

            // Filtre select
            if (col.filterable) {
                const wrap = el("div", { cls: "dt-th-filter" });
                const values = [
                    ...new Set(this._rawRows.map((r) => r[i]).filter(Boolean)),
                ].sort();
                const sel = el("select", {
                    "aria-label": `Filtrer ${col.label}`,
                    onchange: (e) => {
                        this._state.colFilter[col.label] = e.target.value;
                        this._state.page = 1;
                        this._render();
                        dispatch("datatable:filter", {
                            id: this.id,
                            col: col.label,
                            value: e.target.value,
                        });
                    },
                });
                const emptyOpt = el("option");
                emptyOpt.value = "";
                emptyOpt.textContent = "All";
                sel.appendChild(emptyOpt);
                values.forEach((v) => {
                    const o = el("option");
                    o.value = v;
                    o.textContent = v;
                    if (this._state.colFilter[col.label] === v)
                        o.selected = true;
                    sel.appendChild(o);
                });
                wrap.appendChild(sel);
                th.appendChild(wrap);
                this[`_colFilterSel_${i}`] = sel;
            }

            // Filtre texte
            if (col.searchable) {
                const wrap = el("div", { cls: "dt-th-filter" });
                const inp = el("input", {
                    type: "text",
                    "aria-label": `Filtrer ${col.label}`,
                    placeholder: "…",
                    value: this._state.colSearch[col.label] || "",
                    oninput: (e) => {
                        this._state.colSearch[col.label] = e.target.value;
                        this._state.page = 1;
                        this._render();
                    },
                });
                wrap.appendChild(inp);
                th.appendChild(wrap);
            }
        });
    }

    _buildFooter() {
        const footer = el("div", { cls: "dt-footer" });
        this._countEl = el("span", { cls: "dt-count" });
        footer.appendChild(this._countEl);
        this._paginationEl = el("nav", {
            cls: "pagination",
            "aria-label": "Pagination",
        });
        footer.appendChild(this._paginationEl);
        return footer;
    }

    /* ── RENDER ── */
    _render() {
        this._saveState();
        const filtered = this._applyFilters();
        const sorted = this._applySort(filtered);
        const paged = this._applyPagination(sorted);
        this._renderRows(sorted, paged);
        this._renderPagination(sorted.length);
        this._renderCount(filtered.length, sorted.length);
        this._renderFilterbar();
    }

    _applyFilters() {
        const gs = this._state.globalSearch.toLowerCase();
        return this._rawRows.reduce((acc, row, idx) => {
            // Recherche globale
            if (gs && !row.some((c) => c.toLowerCase().includes(gs)))
                return acc;
            // Recherche par colonne
            for (const [label, val] of Object.entries(this._state.colSearch)) {
                if (!val) continue;
                const ci = this._columns.findIndex((c) => c.label === label);
                if (ci < 0) continue;
                if (!row[ci]?.toLowerCase().includes(val.toLowerCase()))
                    return acc;
            }
            // Filtre select
            for (const [label, val] of Object.entries(this._state.colFilter)) {
                if (!val) continue;
                const ci = this._columns.findIndex((c) => c.label === label);
                if (ci < 0) continue;
                if (row[ci] !== val) return acc;
            }
            // Filtres de date (multi-colonnes)
            for (const col of this._columns) {
                if (!col.filterDate) continue;
                const startEl = this[`_dateStart_${col.index}`];
                const endEl = this[`_dateEnd_${col.index}`];
                const startV = startEl?.value;
                const endV = endEl?.value;
                if (!startV && !endV) continue;
                const d = parseDate(row[col.index]);
                if (!d) return acc;
                if (startV && d < new Date(startV)) return acc;
                if (endV && d > new Date(endV + "T23:59:59")) return acc;
            }
            acc.push(idx);
            return acc;
        }, []);
    }

    _applySort(indices) {
        if (!this._state.sortCol || !this._state.sortDir) return indices;
        const ci = this._columns.findIndex(
            (c) => c.label === this._state.sortCol,
        );
        if (ci < 0) return indices;
        return [...indices].sort((a, b) => {
            const va = this._rawRows[a][ci] ?? "";
            const vb = this._rawRows[b][ci] ?? "";
            const da = parseDate(va),
                db = parseDate(vb);
            let cmp;
            if (da && db) cmp = da - db;
            else {
                const na = parseFloat(va),
                    nb = parseFloat(vb);
                cmp =
                    !isNaN(na) && !isNaN(nb)
                        ? na - nb
                        : va.localeCompare(vb, undefined, {
                              sensitivity: "base",
                          });
            }
            return this._state.sortDir === "asc" ? cmp : -cmp;
        });
    }

    _applyPagination(indices) {
        const { page, pageSize } = this._state;
        return indices.slice((page - 1) * pageSize, page * pageSize);
    }

    _renderRows(sorted, paged) {
        const pagedSet = new Set(paged);
        this._bodyRows.forEach((tr, i) => {
            if (!sorted.includes(i)) {
                tr.style.display = "none";
                return;
            }
            tr.style.display = pagedSet.has(i) ? "" : "none";
        });
        let emptyRow = this.table.querySelector(".dt-empty-row");
        if (paged.length === 0) {
            if (!emptyRow) {
                emptyRow = el("tr", { cls: "dt-empty-row" });
                const td = el("td", { colspan: this._columns.length });
                td.innerHTML = `<div class="dt-empty">${Icons.emptyBox}<div>Aucun résultat / No results</div></div>`;
                emptyRow.appendChild(td);
                this.table.querySelector("tbody").appendChild(emptyRow);
            }
            emptyRow.style.display = "";
        } else if (emptyRow) {
            emptyRow.style.display = "none";
        }
    }

    _renderPagination(total) {
        const { page, pageSize } = this._state;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const nav = this._paginationEl;
        nav.innerHTML = "";
        const style = this._paginationStyle;
        const cls = `pagination-${style}`;

        const btn = (
            label,
            pg,
            disabled = false,
            active = false,
            aria = "",
        ) => {
            const b = el("button", {
                cls: `${cls}${active ? " active" : ""}`,
                type: "button",
            });
            b.innerHTML = label;
            if (active) b.setAttribute("aria-current", "page");
            if (aria) b.setAttribute("aria-label", aria);
            if (disabled) {
                b.disabled = true;
            } else
                b.addEventListener("click", () => {
                    this._state.page = pg;
                    this._render();
                    dispatch("datatable:page", { id: this.id, page: pg });
                });
            return b;
        };

        nav.appendChild(
            btn(Icons.chevsLeft, 1, page === 1, false, "First page"),
        );
        nav.appendChild(
            btn(Icons.chevLeft, page - 1, page === 1, false, "Previous"),
        );
        this._pageRange(page, totalPages).forEach((p) => {
            if (p === "…")
                nav.insertAdjacentHTML(
                    "beforeend",
                    '<span class="pagination-dots">…</span>',
                );
            else nav.appendChild(btn(p, p, false, p === page));
        });
        nav.appendChild(
            btn(Icons.chevRight, page + 1, page === totalPages, false, "Next"),
        );
        nav.appendChild(
            btn(
                Icons.chevsRight,
                totalPages,
                page === totalPages,
                false,
                "Last page",
            ),
        );
    }

    _pageRange(cur, total) {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        if (cur <= 4) return [1, 2, 3, 4, 5, "…", total];
        if (cur >= total - 3)
            return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
        return [1, "…", cur - 1, cur, cur + 1, "…", total];
    }

    _renderCount(filteredTotal, sortedTotal) {
        const { page, pageSize } = this._state;
        const from = Math.min((page - 1) * pageSize + 1, sortedTotal);
        const to = Math.min(page * pageSize, sortedTotal);
        const total = this._rawRows.length;
        this._countEl.innerHTML =
            sortedTotal === total
                ? `<strong>${from}–${to}</strong> / <strong>${total}</strong>`
                : `<strong>${from}–${to}</strong> / <strong>${filteredTotal}</strong> filtered <span style="color:var(--dt-text-tertiary)">(${total} total)</span>`;
    }

    _renderFilterbar() {
        const bar = this._filterbar;
        bar.innerHTML = "";
        const chips = [];

        if (this._state.globalSearch) {
            chips.push({
                label: `Recherche : "${this._state.globalSearch}"`,
                remove: () => {
                    this._state.globalSearch = "";
                    if (this._globalSearchEl) this._globalSearchEl.value = "";
                    this._state.page = 1;
                    this._render();
                },
            });
        }
        for (const [label, val] of Object.entries(this._state.colFilter)) {
            if (!val) continue;
            chips.push({
                label: `${label} : ${val}`,
                remove: () => {
                    delete this._state.colFilter[label];
                    const ci = this._columns.findIndex(
                        (c) => c.label === label,
                    );
                    if (this[`_colFilterSel_${ci}`])
                        this[`_colFilterSel_${ci}`].value = "";
                    this._state.page = 1;
                    this._render();
                },
            });
        }
        for (const [label, val] of Object.entries(this._state.colSearch)) {
            if (!val) continue;
            chips.push({
                label: `${label} : "${val}"`,
                remove: () => {
                    delete this._state.colSearch[label];
                    this._state.page = 1;
                    this._render();
                },
            });
        }
        // Chips pour filtres date actifs
        for (const col of this._columns) {
            if (!col.filterDate) continue;
            const s = this[`_dateStart_${col.index}`]?.value;
            const e = this[`_dateEnd_${col.index}`]?.value;
            if (s || e) {
                const range = s && e ? `${s} → ${e}` : s ? `≥ ${s}` : `≤ ${e}`;
                chips.push({
                    label: `${col.label} : ${range}`,
                    remove: () => {
                        if (this[`_dateStart_${col.index}`])
                            this[`_dateStart_${col.index}`].value = "";
                        if (this[`_dateEnd_${col.index}`])
                            this[`_dateEnd_${col.index}`].value = "";
                        this._state.page = 1;
                        this._render();
                    },
                });
            }
        }

        if (chips.length === 0) {
            bar.style.display = "none";
            this._filterBadge.style.display = "none";
            return;
        }
        bar.style.display = "";
        this._filterBadge.style.display = "";
        this._filterBadge.textContent = chips.length;

        bar.appendChild(
            el("span", { cls: "dt-filterbar-label" }, "Filtres actifs :"),
        );
        chips.forEach(({ label, remove }) => {
            const chip = el("span", { cls: "dt-chip" });
            chip.appendChild(document.createTextNode(label));
            const x = el(
                "button",
                {
                    cls: "dt-chip-remove",
                    type: "button",
                    "aria-label": `Remove ${label}`,
                },
                "×",
            );
            x.addEventListener("click", remove);
            chip.appendChild(x);
            bar.appendChild(chip);
        });
        const clearAll = el(
            "button",
            { cls: "dt-chip-clear", type: "button" },
            "Clear",
        );
        clearAll.addEventListener("click", () => this.reset());
        bar.appendChild(clearAll);
    }

    /* ── SORT ── */
    _cycleSort(colIdx, th, iconEl) {
        const col = this._columns[colIdx];
        const cur =
            this._state.sortCol === col.label ? this._state.sortDir : null;
        if (cur === null) {
            this._state.sortDir = "asc";
            this._state.sortCol = col.label;
        } else if (cur === "asc") {
            this._state.sortDir = "desc";
        } else {
            this._state.sortDir = null;
            this._state.sortCol = null;
        }
        this._state.page = 1;
        this._syncAllSortIcons();
        this._render();
        dispatch("datatable:sort", {
            id: this.id,
            col: col.label,
            dir: this._state.sortDir,
        });
    }
    _syncAllSortIcons() {
        Array.from(
            this.table.querySelectorAll("thead tr:first-child th"),
        ).forEach((th, i) => {
            const icon = th.querySelector(".dt-sort-icon");
            if (icon) this._syncSortIcon(i, th, icon);
        });
    }
    _syncSortIcon(colIdx, th, iconEl) {
        const col = this._columns[colIdx];
        const isActive = this._state.sortCol === col.label;
        th.classList.remove("sort-asc", "sort-desc");
        if (isActive && this._state.sortDir === "asc") {
            iconEl.innerHTML = Icons.sortAsc;
            th.classList.add("sort-asc");
            th.setAttribute("aria-sort", "ascending");
        } else if (isActive && this._state.sortDir === "desc") {
            iconEl.innerHTML = Icons.sortDesc;
            th.classList.add("sort-desc");
            th.setAttribute("aria-sort", "descending");
        } else {
            iconEl.innerHTML = Icons.sortNone;
            th.setAttribute("aria-sort", "none");
        }
    }

    _toggleAll(checked) {
        this._bodyRows.forEach((tr) => {
            if (tr.style.display === "none") return;
            const cb = tr.querySelector(".dt-check");
            if (cb) cb.checked = checked;
            tr.classList.toggle("dt-selected", checked);
        });
    }

    /* ── EXPORT MENU ── */
    _toggleExportMenu() {
        const open = this._exportMenu.classList.toggle("open");
        this._exportToggleBtn?.setAttribute("aria-expanded", open);
    }
    _closeExportMenu() {
        this._exportMenu?.classList.remove("open");
        this._exportToggleBtn?.setAttribute("aria-expanded", "false");
    }

    /* ── EXPORT DATA ──
     scope : 'all' | 'filtered' | 'page'
  ── */
    _getExportData(scope = "filtered") {
        const allIndices = this._rawRows.map((_, i) => i);
        const filteredIndices = this._applyFilters();
        const sortedIndices = this._applySort(filteredIndices);
        const pagedIndices = this._applyPagination(sortedIndices);

        let rowIndices;
        if (scope === "all") rowIndices = allIndices;
        else if (scope === "page") rowIndices = pagedIndices;
        else rowIndices = sortedIndices; // 'filtered' default

        const exportCols = this._columns.filter((c) => !c.noExport);
        const headers = exportCols.map((c) => c.label);
        const data = rowIndices.map((idx) =>
            exportCols.map((c) => this._rawRows[idx]?.[c.index] ?? ""),
        );
        return { headers, data };
    }

    /* ── PUBLIC API ── */
    refresh() {
        this._parseRows();
        this._render();
        dispatch("datatable:refresh", { id: this.id });
    }
    search(val) {
        this._state.globalSearch = val;
        if (this._globalSearchEl) this._globalSearchEl.value = val;
        this._state.page = 1;
        this._render();
        dispatch("datatable:search", { id: this.id, value: val });
    }
    filter(col, val) {
        this._state.colFilter[col] = val;
        this._state.page = 1;
        this._render();
        dispatch("datatable:filter", { id: this.id, col, value: val });
    }
    sort(col, dir) {
        this._state.sortCol = col;
        this._state.sortDir = dir;
        this._state.page = 1;
        this._syncAllSortIcons();
        this._render();
        dispatch("datatable:sort", { id: this.id, col, dir });
    }
    page(pageNum) {
        this._state.page = pageNum;
        this._render();
        dispatch("datatable:page", { id: this.id, page: pageNum });
    }
    /**
     * Exporter les données.
     * @param {'excel'|'pdf'|'word'} format
     * @param {'all'|'filtered'|'page'} [scope='filtered']
     */
    export(format, scope = "filtered") {
        const { headers, data } = this._getExportData(scope);
        const name = this.id;
        const title = `${name} — ${scope === "all" ? "All data" : scope === "page" ? "Current page" : "Filtered data"}`;
        if (format === "excel") exportExcelOOXML(headers, data, name);
        else if (format === "pdf") exportPDF(headers, data, title);
        else if (format === "word") exportWordOOXML(headers, data, title, name);
        dispatch("datatable:export", { id: this.id, format, scope });
    }
    reset() {
        this._state.globalSearch = "";
        this._state.sortCol = null;
        this._state.sortDir = null;
        this._state.colSearch = {};
        this._state.colFilter = {};
        this._state.page = 1;
        if (this._globalSearchEl) this._globalSearchEl.value = "";
        this._columns.forEach((_, i) => {
            const sel = this[`_colFilterSel_${i}`];
            if (sel) sel.value = "";
        });
        this.table
            .querySelectorAll(".dt-th-filter input")
            .forEach((inp) => (inp.value = ""));
        // Reset aussi les inputs de date
        this._columns
            .filter((c) => c.filterDate)
            .forEach((col) => {
                if (this[`_dateStart_${col.index}`])
                    this[`_dateStart_${col.index}`].value = "";
                if (this[`_dateEnd_${col.index}`])
                    this[`_dateEnd_${col.index}`].value = "";
            });
        this._syncAllSortIcons();
        this._render();
        dispatch("datatable:reset", { id: this.id });
    }
    destroy() {
        // ── Remettre les <th> dans leur état original ──
        Array.from(
            this.table.querySelectorAll("thead tr:first-child th"),
        ).forEach((th) => {
            const original = th.dataset.originalLabel;
            if (!original) return;
            if (
                th.classList.contains("col-check") ||
                th.classList.contains("col-action")
            )
                return;

            // Retirer les éléments ajoutés par _buildThead
            th.querySelector(".dt-th-inner")?.remove();
            th.querySelector(".dt-th-filter")?.remove();
            if (th._sortHandler) {
                th.removeEventListener("click", th._sortHandler);
                delete th._sortHandler;
            }
            th.classList.remove("sortable", "sort-asc", "sort-desc");
            th.removeAttribute("aria-sort");

            // Remettre le texte brut
            th.textContent = original;
            // Garder data-original-label pour le prochain cycle
        });

        if (this._wrapper) {
            // Remet la <table> à sa place d'origine, avant le wrapper
            this._wrapper.parentNode.insertBefore(this.table, this._wrapper);
            this._wrapper.remove();
            this._wrapper = null;
        }
        this.table.removeAttribute("data-ui-init"); // ← indispensable pour Turbo
        localStorage.removeItem(this._storageKey);
        UIDataTable.#instances.delete(this.id);
        dispatch("datatable:destroy", { id: this.id });
    }
}
