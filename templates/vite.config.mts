import { defineConfig } from "vite";
import ClarityPlugin from "@fracipolla/clarity/vite-plugin";

export default defineConfig({
  plugins: [ClarityPlugin()],
  optimizeDeps: {
    exclude: ['@fracipolla/clarity']
  }
});
