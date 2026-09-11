import { defineConfig } from "vite";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["firebase-rules/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
