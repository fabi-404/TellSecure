import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  boolean,
  uuid,
  jsonb
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "@auth/core/adapters";

// 1. Tenants Table
export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  plan: text("plan").default("free"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow()
});

// 2. Users Table (Modified with tenantId)
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
});

// 3. Auth.js Tables
export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
);

// 4. Application Data
export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  reportKey: text("report_key").notNull(), // Public 10-char ID
  passwordHash: text("password_hash").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull(),
  status: text("status").default("RECEIVED").notNull(),
  description: jsonb("description").notNull(), // Stores the rich JSON
  isEncrypted: boolean("is_encrypted").default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});