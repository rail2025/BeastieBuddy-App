import { defineConfig } from "vite";

// @ts-expect-error process is a Node.js global
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
    clearScreen: false,

    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                protocol: "ws",
                host,
                port: 1421,
            }
            : undefined,
        watch: {
            ignored: ["**/src-tauri/**"],
        },
    },

    build: {
        rollupOptions: {
            input: {
                main: "index.html",
                map: "map.html",
                settings: "settings.html",
                about: "about.html",
            },
        },
    },
}));