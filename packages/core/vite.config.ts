import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
    server: {
        port: 3000,
    },
    build: {
        outDir: "dist",
        cssCodeSplit: false,
        lib: {
            entry: path.resolve(__dirname, "src/js/index.js"),
            name: "SethrenseiUI",
            formats: ["es", "umd"],

            fileName: (format) => {
                if (format === "es") {
                    return "sethrensei-ui.js";
                }

                return "sethrensei-ui.umd.js";
            },
        },
        rollupOptions: {
            output: {
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name?.endsWith(".css")) {
                        return "sethrensei-ui.min.css";
                    }

                    return assetInfo.name ?? "[name].[ext]";
                },
            },
        },
        minify: "esbuild",
    },
});
