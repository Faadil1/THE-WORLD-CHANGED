import { defineConfig } from "vite";

export default defineConfig({
  root: "experience",
  base: "./",
  build: { outDir: "../dist", emptyOutDir: true },
  server: { host: true },
  test: {
    root: ".",
    include: ["simulation/test/**/*.test.ts", "live/test/**/*.test.ts", "experience/test/**/*.test.ts"],
  },
} as Parameters<typeof defineConfig>[0]);
