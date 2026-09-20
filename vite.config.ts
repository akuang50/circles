import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const port = 4733;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "spa-github-pages-404",
      closeBundle() {
        const index = path.resolve(rootDir, "dist/index.html");
        if (fs.existsSync(index)) {
          fs.copyFileSync(index, path.resolve(rootDir, "dist/404.html"));
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    host: "0.0.0.0",
    port,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port,
    strictPort: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
