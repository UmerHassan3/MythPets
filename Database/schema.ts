import { boolean, check, index, integer, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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

/* =========================================================
   CART
   One row per product a signed-in user is holding.
========================================================= */

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    quantity: integer("quantity").notNull().default(1),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Adding the same product twice increments the quantity instead of
    // creating a second row. Also indexes user_id via the leftmost column,
    // so no separate index is needed for "this user's cart".
    unique("cart_items_user_product_unique").on(table.userId, table.productId),

    // Postgres does not index foreign keys automatically; without this,
    // deleting a product scans the whole cart table.
    index("cart_items_product_id_idx").on(table.productId),

    check("cart_items_quantity_positive", sql`${table.quantity} > 0`),
  ],
);

/* =========================================================
   ORDERS
   The Roblox username is captured at checkout — it is how the
   trade actually gets delivered.
========================================================= */

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "delivered",
  "cancelled",
] as const;

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Kept on delete so order history survives an account being removed.
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // Snapshots: an order must still make sense if the account is gone.
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),

    // How we find the buyer in-game to hand the pets over.
    robloxUsername: text("roblox_username").notNull(),

    status: text("status").notNull().default("pending"),

    // Money is numeric, never float — exact decimal arithmetic.
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),

    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("orders_user_id_idx").on(table.userId),
    // The admin list filters by status and sorts newest-first.
    index("orders_status_created_at_idx").on(table.status, table.createdAt),
    check(
      "orders_status_valid",
      sql`${table.status} in ('pending', 'paid', 'delivered', 'cancelled')`,
    ),
  ],
);

/* =========================================================
   ORDER ITEMS
   Line items snapshot name and price at purchase time, so an
   order never changes because a product was edited or deleted.
========================================================= */

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    // Nullable: deleting a product must not erase what someone bought.
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),

    productName: text("product_name").notNull(),

    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),

    quantity: integer("quantity").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    index("order_items_product_id_idx").on(table.productId),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
  ],
);
