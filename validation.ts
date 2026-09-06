import {z} from "zod";

export const SignInSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

export const SignUpSchema = z.object({
  name: z.string().min(3, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

export const GameSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters long" }),
  image: z.url({ message: "Image must be a valid URL" }),
});

export const CategorySchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters long" }),
});

export const productSchema = z
  .object({
    gameId: z.string().uuid("Please select a game"),

    categoryId: z.string().uuid("Please select a category"),

    name: z
      .string()
      .min(2, "Product name must be at least 2 characters")
      .max(100, "Product name is too long"),

    price: z.coerce
      .number()
      .positive("Price must be greater than 0"),

    salesprice: z.coerce
      .number()
      .positive("Sale price must be greater than 0"),

    image: z
      .string()
      .url("Please upload a product image"),

    stock: z.coerce
      .number()
      .int("Stock must be a whole number")
      .min(0, "Stock cannot be negative"),

    isFeatured: z.boolean(),

    isActive: z.boolean(),
  })
  .refine(
    (data) => data.salesprice <= data.price,
    {
      message: "Sale price cannot be greater than regular price",
      path: ["salesprice"],
    }
  );


  export const editproductSchema = z
  .object({
    name: z
      .string()
      .min(2, "Product name must be at least 2 characters")
      .max(100, "Product name is too long"),

    price: z.coerce
      .number()
      .positive("Price must be greater than 0"),

    salesprice: z.coerce
      .number()
      .positive("Sale price must be greater than 0"),

    stock: z.coerce
      .number()
      .int("Stock must be a whole number")
      .min(0, "Stock cannot be negative"),
  })
  .refine(
    (data) => data.salesprice <= data.price,
    {
      message: "Sale price cannot be greater than regular price",
      path: ["salesprice"],
    }
  );
/** Explicit pattern so the email shape is enforced consistently, not just by zod's built-in check. */
export const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export const ContactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name")
    .max(80, "Name is too long"),

  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .regex(EMAIL_PATTERN, "Please enter a valid email address"),

  subject: z
    .string()
    .trim()
    .min(3, "Please add a short subject")
    .max(120, "Subject is too long"),

  message: z
    .string()
    .trim()
    .min(10, "Please give us a little more detail")
    .max(2000, "Message is too long"),
});

/**
 * Roblox usernames: 3–20 characters, letters/digits/underscore, at most one
 * underscore, and never leading or trailing. Matches Roblox's own rules so a
 * typo is caught before the order is placed rather than at delivery time.
 */
export const ROBLOX_USERNAME_PATTERN = /^(?!_)(?!.*_.*_)[A-Za-z0-9_]{3,20}(?<!_)$/;

export const CheckoutSchema = z.object({
  robloxUsername: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be 20 characters or fewer")
    .regex(
      ROBLOX_USERNAME_PATTERN,
      "Enter a valid Roblox username (letters, digits, one underscore)",
    ),
});
