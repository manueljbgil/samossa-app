import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { z } from "zod";

// Users — prototype auth: plain credentials, no hashing.
// Supports both username/password and Google OAuth.
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").unique(),
  password: text("password"),
  displayName: text("display_name").notNull(),
  googleId: text("google_id").unique(),
  email: text("email"),
});

// Places that sell samosas.
export const places = sqliteTable("places", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // bar | café | restaurant | bakery | tasca
  area: text("area").notNull(), // neighbourhood
  city: text("city").notNull(),
  address: text("address").notNull(),
  description: text("description").notNull(),
  labels: text("labels"),
  // Geographic coordinates: longitude, latitude (WGS84 / EPSG:4326)
  latitude: real("latitude"),
  longitude: real("longitude"),
  // Legacy: Normalized coordinates for the stylized prototype map
  mapX: real("map_x"),
  mapY: real("map_y"),
});

// One rating per (user, place); user can update their rating.
export const ratings = sqliteTable(
  "ratings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    placeId: integer("place_id").notNull(),
    score: integer("score").notNull(), // 0–5
    note: text("note"),
    updatedAt: integer("updated_at").notNull(), // ms epoch
  },
  (t) => ({
    userPlaceIdx: uniqueIndex("ratings_user_place_idx").on(t.userId, t.placeId),
  }),
);

export const insertUserSchema = z.object({
  username: z.string().min(2),
  password: z.string().min(3),
  displayName: z.string().min(1),
});

export const loginSchema = z.object({
  username: z.string().min(2),
  password: z.string().min(3),
});

export const insertPlaceSchema = z.object({
  name: z.string().trim().min(2),
  kind: z.string().trim().min(1),
  area: z.string().trim().min(1),
  city: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  description: z.string().trim(),
  labels: z.string().trim().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  mapX: z.number().optional().nullable(),
  mapY: z.number().optional().nullable(),
});

export const insertRatingSchema = z.object({
  placeId: z.number().int().positive(),
  score: z.number().int().min(0).max(5),
  note: z.string().max(500).optional().nullable(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Place = typeof places.$inferSelect;
export type InsertPlace = z.infer<typeof insertPlaceSchema>;
export type Rating = typeof ratings.$inferSelect;
export type InsertRating = z.infer<typeof insertRatingSchema>;

// API DTOs
export type PublicUser = Pick<User, "id" | "username" | "displayName">;
export type PlaceWithStats = Place & {
  averageRating: number;
  ratingCount: number;
  myRating?: number | null;
};
export type RatingWithPlace = Rating & { place: Place };
export type RatingWithUser = Rating & { user: PublicUser };
