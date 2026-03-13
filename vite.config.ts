import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { buildSync } from "esbuild";
import Info from "unplugin-info/vite";
import { defineConfig, loadEnv, type PluginOption } from "vite";
import { analyzer } from "vite-bundle-analyzer";
import { createHtmlPlugin } from "vite-plugin-html";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd());
    const shouldAnalyze = process.env.ANALYZE === "true";

    // 【关键修改】设置基础路径为仓库名
    // 如果你的仓库名是 Cent，这里就是 '/Cent/'
    // 如果你把仓库改名为 my-account，这里就要改成 '/my-account/'
    const baseRoute = '/Cent/'; 

    const plugins: PluginOption[] = [
        Info(),
        createHtmlPlugin({
            inject: {
                data: {
                    VITE_GTAG_SCRIPT: env.VITE_GTAG_SCRIPT || "",
                    injectPresetScript: buildSync({
                        entryPoints: ["src/inline/load-preset.ts"],
                        bundle: true,
                        minify: true,
                        write: false,
                        format: "iife",
                    }).outputFiles[0].text,
                },
            },
        }),
        react(),
        svgr(),
        tailwindcss(),
        VitePWA({
            strategies: "injectManifest",
            srcDir: "src",
            filename: "sw.ts",
            registerType: "autoUpdate",
            injectRegister: "auto",
            includeAssets: ["favicon.ico", "apple-touch-icon.png"],
            manifest: {
                name: "Cent - 日计",
                short_name: "Cent",
                description: "Accounting your life - 记录每一天",
                theme_color: "#ffffff",
                icons: [
                    { src: "icon.png", sizes: "192x192", type: "image/png" },
                    { src: "icon.png", sizes: "512x512", type: "image/png" },
                ],
                // PWA 在子路径下工作时，scope 通常也需要调整，VitePWA 插件通常会自动处理 base，
                // 但如果遇到 PWA 安装问题，可能需要手动指定 scope: baseRoute
                scope: baseRoute, 
                protocol_handlers: [
                    {
                        protocol: "cent-accounting",
                        url: "/add-bills?text=%s",
                        client_mode: "focus-existing",
                    } as any,
                ],
                launch_handler: {
                    client_mode: ["navigate-existing", "auto"],
                },
            },
        }),
    ];

    if (shouldAnalyze) {
        plugins.push(analyzer());
    }

    return {
        // 【核心配置】启用 base 路径，解决 GitHub Pages 子目录部署白屏问题
        base: baseRoute,
        
        plugins,
        resolve: {
            alias: {
                "@": resolve("./src"),
            },
        },
        worker: {
            format: "es",
        },
        // 注意：server.proxy 仅在本地开发 (npm run dev) 时生效。
        // 部署到 GitHub Pages 后，此配置不会起作用，API 请求需要指向真实后端或使用其他方案。
        server: {
            proxy: {
                "/google-api": {
                    target: "https://generativelanguage.googleapis.com",
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/google-api/, ""),
                },
            },
        },
    };
});
