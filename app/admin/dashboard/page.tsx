import Link from "next/link";
import { sql } from "drizzle-orm";
import {
  ArrowUpRight,
  FolderTree,
  Gamepad2,
  Package,
  Users,
} from "lucide-react";

import { db, withRetry } from "@/drizzle";
import PageHeader from "@/Components/admin/PageHeader";
import { Card, CardContent } from "@/Components/ui/card";

type Totals = {
  games: number;
  categories: number;
  products: number;
  users: number;
};

const STATS = [
  {
    key: "games",
    label: "Games",
    icon: Gamepad2,
    href: "/admin/games",
    hint: "Manage games",
  },
  {
    key: "categories",
    label: "Categories",
    icon: FolderTree,
    href: "/admin/games",
    hint: "Grouped under games",
  },
  {
    key: "products",
    label: "Products",
    icon: Package,
    href: "/admin/games",
    hint: "Across all categories",
  },
  {
    key: "users",
    label: "Users",
    icon: Users,
    // No admin screen for users yet, so this tile is not a link.
    href: undefined,
    hint: "Registered accounts",
  },
] as const satisfies ReadonlyArray<{
  key: keyof Totals;
  label: string;
  icon: typeof Users;
  href?: string;
  hint: string;
}>;

const DashboardPage = async () => {
  // One query, one connection, one round-trip. Four separate `count()` queries
  // would each take a pool connection and pay their own TLS handshake, which
  // dominates the cost on a slow link. Counting happens in the database, so no
  // rows cross the wire either.
  const { rows } = await withRetry(() =>
    db.execute<Totals>(sql`
      select
        (select count(*)::int from "games")      as games,
        (select count(*)::int from "categories") as categories,
        (select count(*)::int from "products")   as products,
        (select count(*)::int from "users")      as users
    `),
  );

  const totals = rows[0];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="An overview of your catalogue and customers."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map(({ key, label, icon: Icon, href, hint }) => {
          const card = (
            <Card className="h-full transition-colors group-hover:border-foreground/20 group-hover:bg-muted/40">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  {href ? (
                    <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  ) : null}
                </div>

                <div className="space-y-1">
                  <p className="font-heading text-3xl font-semibold tabular-nums tracking-tight">
                    {totals[key]}
                  </p>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
              </CardContent>
            </Card>
          );

          return href ? (
            <Link
              key={key}
              href={href}
              className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {card}
            </Link>
          ) : (
            <div key={key} className="group">
              {card}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default DashboardPage;
