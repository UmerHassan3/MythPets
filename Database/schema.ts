import { boolean, check, index, integer, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),

  email: text("email").notNull().unique(),

  // Nullable: an account created through Google has no password. A null here
  // means "this account cannot be signed into with a password", which the
  // credentials provider enforces rather than treating as an empty string.
  password: text("password"),

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
  // Created, customer has not sent funds yet.
  "pending",
  // Transaction submitted but on-chain verification has not passed yet.
  "processing",
  // Verified on-chain.
  "paid",
  // Pets handed over in-game.
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

    // Which wallet the customer was told to pay. Nullable FK so deleting a
    // method never deletes orders; the snapshots below keep the record intact.
    paymentMethodId: uuid("payment_method_id").references(
      () => paymentMethods.id,
      { onDelete: "set null" },
    ),
    paymentMethodCode: text("payment_method_code"),
    paymentMethodName: text("payment_method_name"),
    paymentNetwork: text("payment_network"),
    paymentAddress: text("payment_address"),

    // The exact amount to send, in the payment asset, locked when the order is
    // created. Quoted once so a moving market cannot invalidate a payment the
    // customer already made.
    paymentAmount: numeric("payment_amount", { precision: 20, scale: 8 }),
    paymentAsset: text("payment_asset"),

    // A locked rate is a promise about a price, so it expires. Without this an
    // order quoted today stays payable at today's rate indefinitely.
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    // Caps how many transaction hashes can be thrown at one order, so a
    // guessing attempt cannot run indefinitely or burn the explorer quota.
    verificationAttempts: integer("verification_attempts").default(0).notNull(),

    // Stock is held from the moment an order is created. This makes putting it
    // back idempotent: a sweep and an admin cancel must not both return it.
    stockReleased: boolean("stock_released").default(false).notNull(),

    // The on-chain reference. Unique so one transaction cannot be claimed
    // against several orders.
    txHash: text("tx_hash"),

    // What the chain actually reported, kept for auditing a disputed order.
    verifiedAmount: numeric("verified_amount", { precision: 20, scale: 8 }),
    verificationNote: text("verification_note"),

    paidAt: timestamp("paid_at", { withTimezone: true }),

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
    index("orders_payment_method_id_idx").on(table.paymentMethodId),
    // Drives the sweep that expires abandoned orders and returns their stock.
    index("orders_expiry_idx").on(table.status, table.expiresAt),
    // Replay protection: the same transaction cannot pay for two orders.
    unique("orders_tx_hash_unique").on(table.txHash),
    check(
      "orders_status_valid",
      sql`${table.status} in ('pending', 'processing', 'paid', 'delivered', 'cancelled')`,
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

/* =========================================================
   PAYMENT METHODS
   Admin-managed wallets. Stored rather than hardcoded so an
   address can be rotated without a deploy.
========================================================= */

export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Drives which chain verifier runs, so it must match a known verifier.
    code: text("code").notNull().unique(),

    name: text("name").notNull(),

    network: text("network").notNull(),

    address: text("address").notNull(),

    note: text("note"),

    isActive: boolean("is_active").default(true).notNull(),

    sortOrder: integer("sort_order").default(0).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("payment_methods_active_sort_idx").on(table.isActive, table.sortOrder),
  ],
);

/* =========================================================
   PASSWORD RESET TOKENS
   Short-lived, single-use proof that somebody controls the
   mailbox on an account.
========================================================= */

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /**
     * SHA-256 of the token, never the token itself.
     *
     * The raw value exists only in the email we send. Storing it here would
     * mean a database leak handed over a working reset link for every account
     * with one outstanding — the same reason passwords are not stored either.
     *
     * SHA-256 rather than bcrypt because the input is 256 bits of CSPRNG
     * output: there is nothing to brute-force, so a slow KDF buys nothing.
     */
    tokenHash: text("token_hash").notNull().unique(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    /** Set the moment it is redeemed, so a link cannot be replayed. */
    usedAt: timestamp("used_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Requesting a new link invalidates the previous ones for that account.
    index("password_reset_tokens_user_id_idx").on(table.userId),
    // Drives the sweep that clears expired rows.
    index("password_reset_tokens_expires_at_idx").on(table.expiresAt),
  ],
);
