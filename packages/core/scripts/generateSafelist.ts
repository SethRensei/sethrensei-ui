import fs from "node:fs";
import path from "node:path";

const palettes = ["primary", "success", "destructive"];

const shades = [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
];

const utilities = ["bg", "text", "border", "ring"];

const variants = [
    "",
    "hover:",
    "focus:",
    "dark:",
    "ui-active:",
    "ui-disabled:",
    "ui-loading:",
    "ui-error:",
    "ui-open:",
];

const classes: string[] = [];

for (const variant of variants) {
    for (const utility of utilities) {
        for (const palette of palettes) {
            for (const shade of shades) {
                classes.push(`${variant}${utility}-${palette}-${shade}`);
            }
        }
    }
}

/*
|--------------------------------------------------------------------------
| GENERATE VIRTUAL CSS
|--------------------------------------------------------------------------
*/

const content = `
@source inline("${classes.join(" ")}");
`;

const outputPath = path.resolve(
    process.cwd(),
    "src/css/generated/safelist.css",
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

fs.writeFileSync(outputPath, content);

console.log("Safelist generated:", classes.length, "classes");
