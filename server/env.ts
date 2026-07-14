type AppEnvironment = "development" | "production";

function normalizeEnvironment(value: string | undefined): AppEnvironment {
  if (value === "production") {
    return "production";
  }
  return "development";
}

const appEnvironment = normalizeEnvironment(process.env.APP_ENV);

function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export const env = {
  appEnvironment,
  isProduction: appEnvironment === "production",
  port: Number.parseInt(process.env.PORT ?? "3000", 10),
  serveClient: process.env.SERVE_CLIENT !== "false",
  corsAllowedOrigins: parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS),
  databaseFile:
    process.env.DATABASE_FILE ??
    (appEnvironment === "production" ? "data.prod.db" : "data.dev.db"),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
};
