import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/proxy": {
        target: "https://example.com",
        changeOrigin: true,
        rewrite: () => "",
        configure: (proxy, _options) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            const url = new URL(req.url!, `http://${req.headers.host}`);
            const target = url.searchParams.get("url");
            if (target) {
              const parsed = new URL(target);
              proxyReq.setHeader("host", parsed.host);
              (proxy as any).options.target = parsed.origin;
              proxyReq.path = parsed.pathname + parsed.search;
            }
          });
        },
      },
    },
  },
});
