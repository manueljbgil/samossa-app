import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "node:http";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { storage } from "./storage";
import { seedPlaces } from "./seed";
import {
  insertUserSchema,
  loginSchema,
  insertPlaceSchema,
  insertRatingSchema,
} from "@shared/schema";
import { env } from "./env";

// --- Prototype session store ---
// In-memory token -> userId map. Tokens are returned to the client which stores
// them only in React state (no cookies/localStorage). The token is sent in the
// `Authorization: Bearer <token>` header on each request. This is intentionally
// lightweight — NOT a production auth scheme.
const sessions = new Map<string, number>();

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

function getUserIdFromAuth(req: Request): number | null {
  const h = req.header("authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  return sessions.get(m[1]) ?? null;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).json({ error: "auth required" });
  (req as any).userId = userId;
  next();
}

// Initialize Google OAuth client
const googleClient = new OAuth2Client(env.googleClientId);
console.log(
  "[Startup] Google OAuth client initialized with GOOGLE_CLIENT_ID:",
  !!env.googleClientId,
);

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Seed sample places once on first boot.
  await storage.seedPlaces(seedPlaces);

  // --- Auth ---
  app.post("/api/auth/register", async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.message });
    const existing = await storage.getUserByUsername(parsed.data.username);
    if (existing) return res.status(409).json({ error: "username taken" });
    const user = await storage.createUser(parsed.data);
    const token = makeToken();
    sessions.set(token, user.id);
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.message });
    const user = await storage.getUserByUsername(parsed.data.username);
    if (!user || user.password !== parsed.data.password) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    const token = makeToken();
    sessions.set(token, user.id);
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    const h = req.header("authorization");
    const m = h?.match(/^Bearer\s+(.+)$/i);
    if (m) sessions.delete(m[1]);
    res.json({ ok: true });
  });

  app.post("/api/auth/google-callback", async (req, res) => {
    try {
      // Log environment validation
      const clientId = env.googleClientId;
      console.log("[Google Auth] Starting verification process");
      console.log("[Google Auth] GOOGLE_CLIENT_ID configured:", !!clientId);

      const { idToken } = req.body;
      if (!idToken) {
        console.error("[Google Auth] No idToken in request body");
        return res.status(400).json({ error: "idToken required" });
      }

      console.log("[Google Auth] idToken received, length:", idToken.length);
      console.log(
        "[Google Auth] Token format check:",
        idToken.split(".").length === 3
          ? "valid JWT format"
          : "invalid JWT format",
      );

      if (!clientId) {
        console.error(
          "[Google Auth] GOOGLE_CLIENT_ID environment variable not set!",
        );
        return res
          .status(500)
          .json({ error: "server config error: missing GOOGLE_CLIENT_ID" });
      }

      console.log("[Google Auth] Attempting to verify token");

      let ticket;
      try {
        ticket = await googleClient.verifyIdToken({
          idToken,
        });
        console.log("[Google Auth] Token verified successfully");
      } catch (verifyErr) {
        console.error("[Google Auth] Token verification failed");
        console.error(
          "[Google Auth] Error type:",
          verifyErr instanceof Error
            ? verifyErr.constructor.name
            : typeof verifyErr,
        );
        console.error(
          "[Google Auth] Error message:",
          verifyErr instanceof Error ? verifyErr.message : String(verifyErr),
        );
        if (verifyErr instanceof Error && verifyErr.stack) {
          console.error("[Google Auth] Error stack:", verifyErr.stack);
        }
        throw verifyErr;
      }

      const payload = ticket.getPayload();
      console.log("[Google Auth] Payload retrieved, has sub:", !!payload?.sub);

      if (!payload || !payload.sub) {
        console.error("[Google Auth] Invalid payload: missing sub");
        return res.status(400).json({ error: "invalid token" });
      }

      const googleId = payload.sub;
      const email = payload.email || "";
      const displayName = payload.name || email.split("@")[0];

      console.log(
        "[Google Auth] Extracted user info - googleId:",
        googleId.substring(0, 10) + "...",
        "email:",
        email,
      );

      // Check if user already exists
      let user = await storage.getUserByGoogleId(googleId);

      // If not, create new user
      if (!user) {
        console.log("[Google Auth] Creating new user from Google profile");
        user = await storage.createUserFromGoogle(googleId, email, displayName);
      } else {
        console.log("[Google Auth] Existing user found, id:", user.id);
      }

      const token = makeToken();
      sessions.set(token, user.id);
      console.log("[Google Auth] Session created for user:", user.id);

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
        },
      });
    } catch (err) {
      console.error("[Google Auth] Authentication failed with error:");
      console.error(
        "[Google Auth] Error type:",
        err instanceof Error ? err.constructor.name : typeof err,
      );
      console.error(
        "[Google Auth] Error message:",
        err instanceof Error ? err.message : String(err),
      );
      if (err instanceof Error && err.stack) {
        console.error("[Google Auth] Error stack:", err.stack);
      }
      console.error(
        "[Google Auth] Full error object:",
        JSON.stringify(err, null, 2),
      );
      res.status(401).json({ error: "auth failed" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const uid = getUserIdFromAuth(req);
    if (!uid) return res.json({ user: null });
    const user = await storage.getUser(uid);
    if (!user) return res.json({ user: null });
    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
    });
  });

  // --- Places ---
  app.get("/api/places", async (req, res) => {
    const uid = getUserIdFromAuth(req) ?? undefined;
    res.json(await storage.listPlaces(uid));
  });

  app.post("/api/places", requireAuth, async (req, res) => {
    const parsed = insertPlaceSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.message });

    const place = await storage.createPlace({
      ...parsed.data,
      labels: parsed.data.labels?.trim() || null,
      area: parsed.data.area?.trim() ?? "",
      city: parsed.data.city?.trim() ?? "",
      address: parsed.data.address?.trim() ?? "",
    });
    res.status(201).json(place);
  });

  app.get("/api/places/:id", async (req, res) => {
    const uid = getUserIdFromAuth(req) ?? undefined;
    const id = Number(req.params.id);
    const p = await storage.getPlace(id, uid);
    if (!p) return res.status(404).json({ error: "not found" });
    res.json(p);
  });

  app.get("/api/places/:id/ratings", async (req, res) => {
    const id = Number(req.params.id);
    res.json(await storage.listRatingsForPlace(id));
  });

  // --- Ratings ---
  app.post("/api/ratings", requireAuth, async (req, res) => {
    const parsed = insertRatingSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.message });
    const userId = (req as any).userId as number;
    const r = await storage.upsertRating(
      userId,
      parsed.data.placeId,
      parsed.data.score,
      parsed.data.note ?? null,
    );
    res.json(r);
  });

  app.get("/api/me/ratings", requireAuth, async (req, res) => {
    const userId = (req as any).userId as number;
    res.json(await storage.listRatingsByUser(userId));
  });

  return httpServer;
}
