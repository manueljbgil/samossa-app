import "dotenv/config";
import { serveStatic } from "./static";
import { createApiApp, log } from "./app";
import { env } from "./env";

(async () => {
  const { app, httpServer } = await createApiApp();

  // Serve frontend only when explicitly enabled.
  if (env.isProduction && env.serveClient) {
    serveStatic(app);
  } else if (!env.isProduction) {
    // In development, run Vite unless API-only mode is requested.
    if (!env.serveClient) {
      log("SERVE_CLIENT=false, running API without Vite frontend", "server");
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }
  } else {
    log("SERVE_CLIENT=false, running API without static frontend", "server");
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 3000 if not specified.
  // It is the only port that is not firewalled.
  const port = env.port;
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
