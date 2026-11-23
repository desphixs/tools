import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "desphixs-tools",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-22",
    compatibilityFlags: ["nodejs_compat", "nodejs_compat_populate_process_env"],
    domains: ["tools.desphixs.com"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      DATABASE_URL: bindings.secret(),
      BETTER_AUTH_SECRET: bindings.secret(),
      BETTER_AUTH_URL: bindings.secret(),
      GOOGLE_CLIENT_ID: bindings.secret(),
      GOOGLE_CLIENT_SECRET: bindings.secret(),
      RESEND_API_KEY: bindings.secret(),
      EMAIL_FROM: bindings.secret(),
    },
  }),
});
