import { boolean, integer, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),

  email: text("email").notNull().unique(),

  password: text("password").notNull(),

  role: text("role").notNull().default("user")
});

export const games = pgTable("games", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),

  image: text("image"),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


/* =========================================================
   CATEGORIES
   Example for Adopt Me:
   - Regular Pets
   - Neon Pets
   - Mega Pets
   - High Tier Pets
========================================================= */

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),

  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, {
      onDelete: "cascade",
    }),

  name: text("name").notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


/* =========================================================
   PRODUCTS
   Example:
   - Frost Dragon
   - Shadow Dragon
   - Neon Cow
   - Mega Unicorn
========================================================= */

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),

  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, {
      onDelete: "cascade",
    }),

  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, {
      onDelete: "restrict",
    }),

  name: text("name").notNull(),

  price: numeric("price", {
    precision: 10,
    scale: 2,
  }).notNull(),

  salesprice: numeric("sales_price", {
    precision: 10,
    scale: 2,
  }).notNull(),


  image: text("image").notNull(),

  stock: integer("stock").default(0).notNull(),

  isFeatured: boolean("is_featured").default(false).notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Game the user is reviewing
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),

    // User who submitted the review
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userName:text("user_name").notNull(),
    gameName:text("game_name").notNull(),
    rating: integer("rating").notNull(),

    comment: text("comment"),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("reviews_user_product_unique").on(
      table.userId
    ),
  ]
);