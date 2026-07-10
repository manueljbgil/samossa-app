import {
  users,
  ratings,
  places,
  type User,
  type InsertUser,
  type InsertPlace,
  type Rating,
  type PlaceWithStats,
  type RatingWithPlace,
  type RatingWithUser,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and } from "drizzle-orm";
import { env } from "./env";

const databaseFile = env.databaseFile;
const sqlite = new Database(databaseFile);
sqlite.pragma("journal_mode = WAL");
export const db = drizzle(sqlite);

// --- Bootstrap tables (no migrations needed for prototype) ---
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    display_name TEXT NOT NULL,
    google_id TEXT UNIQUE,
    email TEXT
  );
  CREATE TABLE IF NOT EXISTS places (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    area TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    description TEXT NOT NULL,
    labels TEXT,
    latitude REAL,
    longitude REAL,
    map_x REAL,
    map_y REAL
  );
  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    place_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    note TEXT,
    updated_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS ratings_user_place_idx ON ratings(user_id, place_id);
`);

// Migration: Add google_id and email columns if they don't exist
try {
  sqlite.prepare("ALTER TABLE users ADD COLUMN google_id TEXT").run();
} catch (e: any) {
  if (!e.message?.includes("duplicate column name")) throw e;
}
try {
  sqlite.prepare("ALTER TABLE users ADD COLUMN email TEXT").run();
} catch (e: any) {
  if (!e.message?.includes("duplicate column name")) throw e;
}
try {
  sqlite.prepare("ALTER TABLE places ADD COLUMN labels TEXT").run();
} catch (e: any) {
  if (!e.message?.includes("duplicate column name")) throw e;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createPlace(place: InsertPlace): Promise<InsertPlace & { id: number }>;
  createUserFromGoogle(
    googleId: string,
    email: string,
    displayName: string,
  ): Promise<User>;
  listPlaces(currentUserId?: number): Promise<PlaceWithStats[]>;
  getPlace(
    id: number,
    currentUserId?: number,
  ): Promise<PlaceWithStats | undefined>;
  upsertRating(
    userId: number,
    placeId: number,
    score: number,
    note?: string | null,
  ): Promise<Rating>;
  listRatingsByUser(userId: number): Promise<RatingWithPlace[]>;
  listRatingsForPlace(placeId: number): Promise<RatingWithUser[]>;
  seedPlaces(items: InsertPlace[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number) {
    return db.select().from(users).where(eq(users.id, id)).get();
  }
  async getUserByUsername(username: string) {
    return db.select().from(users).where(eq(users.username, username)).get();
  }
  async getUserByGoogleId(googleId: string) {
    return db.select().from(users).where(eq(users.googleId, googleId)).get();
  }
  async createUser(insertUser: InsertUser) {
    return db.insert(users).values(insertUser).returning().get();
  }
  async createPlace(place: InsertPlace) {
    const normalizedPlace = {
      ...place,
      city: place.city ?? "",
      address: place.address ?? "",
      labels: place.labels ?? undefined,
      latitude: place.latitude ?? undefined,
      longitude: place.longitude ?? undefined,
      mapX: place.mapX ?? undefined,
      mapY: place.mapY ?? undefined,
    };

    return db.insert(places).values(normalizedPlace).returning().get();
  }
  async createUserFromGoogle(
    googleId: string,
    email: string,
    displayName: string,
  ) {
    return db
      .insert(users)
      .values({ googleId, email, displayName })
      .returning()
      .get();
  }

  private statsForPlaces(currentUserId?: number) {
    // Returns rows: id, name,..., averageRating, ratingCount, myRating
    const rows = sqlite
      .prepare(
        `SELECT p.*,
                COALESCE(AVG(r.score), 0) AS averageRating,
                COUNT(r.id) AS ratingCount,
                (SELECT score FROM ratings WHERE place_id = p.id AND user_id = ?) AS myRating
         FROM places p
         LEFT JOIN ratings r ON r.place_id = p.id
         GROUP BY p.id
         ORDER BY p.name ASC`,
      )
      .all(currentUserId ?? -1) as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      area: r.area,
      city: r.city,
      address: r.address,
      description: r.description,
      labels: r.labels,
      latitude: r.latitude,
      longitude: r.longitude,
      mapX: r.map_x,
      mapY: r.map_y,
      averageRating: Number(r.averageRating) || 0,
      ratingCount: Number(r.ratingCount) || 0,
      myRating:
        r.myRating === null || r.myRating === undefined
          ? null
          : Number(r.myRating),
    })) as PlaceWithStats[];
  }

  async listPlaces(currentUserId?: number) {
    return this.statsForPlaces(currentUserId);
  }

  async getPlace(id: number, currentUserId?: number) {
    return this.statsForPlaces(currentUserId).find((p) => p.id === id);
  }

  async upsertRating(
    userId: number,
    placeId: number,
    score: number,
    note?: string | null,
  ) {
    const existing = db
      .select()
      .from(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.placeId, placeId)))
      .get();
    const now = Date.now();
    if (existing) {
      return db
        .update(ratings)
        .set({ score, note: note ?? null, updatedAt: now })
        .where(eq(ratings.id, existing.id))
        .returning()
        .get();
    }
    return db
      .insert(ratings)
      .values({ userId, placeId, score, note: note ?? null, updatedAt: now })
      .returning()
      .get();
  }

  async listRatingsByUser(userId: number) {
    const rows = sqlite
      .prepare(
        `SELECT r.id, r.user_id as userId, r.place_id as placeId, r.score, r.note, r.updated_at as updatedAt,
                p.id as p_id, p.name as p_name, p.kind as p_kind, p.area as p_area,
                p.city as p_city, p.address as p_address, p.description as p_description,
                p.latitude as p_latitude, p.longitude as p_longitude,
                p.map_x as p_mapX, p.map_y as p_mapY
         FROM ratings r JOIN places p ON p.id = r.place_id
         WHERE r.user_id = ?
         ORDER BY r.updated_at DESC`,
      )
      .all(userId) as any[];
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      placeId: r.placeId,
      score: r.score,
      note: r.note,
      updatedAt: r.updatedAt,
      place: {
        id: r.p_id,
        name: r.p_name,
        kind: r.p_kind,
        area: r.p_area,
        city: r.p_city,
        address: r.p_address,
        description: r.p_description,
        latitude: r.p_latitude,
        longitude: r.p_longitude,
        mapX: r.p_mapX,
        mapY: r.p_mapY,
      },
    })) as RatingWithPlace[];
  }

  async listRatingsForPlace(placeId: number) {
    const rows = sqlite
      .prepare(
        `SELECT r.id, r.user_id as userId, r.place_id as placeId, r.score, r.note, r.updated_at as updatedAt,
                u.id as u_id, u.username as u_username, u.display_name as u_displayName
         FROM ratings r JOIN users u ON u.id = r.user_id
         WHERE r.place_id = ?
         ORDER BY r.updated_at DESC`,
      )
      .all(placeId) as any[];
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      placeId: r.placeId,
      score: r.score,
      note: r.note,
      updatedAt: r.updatedAt,
      user: {
        id: r.u_id,
        username: r.u_username,
        displayName: r.u_displayName,
      },
    })) as RatingWithUser[];
  }

  async seedPlaces(items: InsertPlace[]) {
    const count = sqlite.prepare(`SELECT COUNT(*) as c FROM places`).get() as {
      c: number;
    };
    if (count.c > 0) return;
    const insert = sqlite.prepare(
      `INSERT INTO places (name, kind, area, city, address, description, latitude, longitude, map_x, map_y) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const tx = sqlite.transaction((rows: InsertPlace[]) => {
      for (const r of rows) {
        insert.run(
          r.name,
          r.kind,
          r.area,
          r.city,
          r.address,
          r.description,
          r.latitude,
          r.longitude,
          r.mapX ?? null,
          r.mapY ?? null,
        );
      }
    });
    tx(items);
  }
}

export const storage = new DatabaseStorage();
