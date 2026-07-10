type AppEnvironment = "development" | "production";

function normalizeEnvironment(value: string | undefined): AppEnvironment {
  if (value === "production") {
    return "production";
  }
  return "development";
}

const appEnvironment = normalizeEnvironment(process.env.APP_ENV);

export const env = {
  appEnvironment,
  isProduction: appEnvironment === "production",
  port: Number.parseInt(process.env.PORT ?? "3000", 10),
  databaseFile:
    process.env.DATABASE_FILE ??
    (appEnvironment === "production" ? "data.prod.db" : "data.dev.db"),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
};
