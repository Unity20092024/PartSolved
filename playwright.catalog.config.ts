import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: "http://127.0.0.1:3100" },
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://127.0.0.1:3100",
    env: {
      BLOG_ADMIN_ORIGIN: "http://127.0.0.1:3100",
      CATALOG_ADMIN_ORIGIN: "http://127.0.0.1:3100",
      CATALOG_ENABLED: "false",
      CATALOG_WRITES_ENABLED: "false",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
