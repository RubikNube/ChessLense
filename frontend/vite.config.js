import { env } from "node:process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function normalizeBasePath(value) {
  if (typeof value !== "string") {
    return "/";
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue === "/") {
    return "/";
  }

  return `/${trimmedValue.replace(/^\/+|\/+$/g, "")}/`;
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: normalizeBasePath(env.VITE_BASE_PATH),
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
