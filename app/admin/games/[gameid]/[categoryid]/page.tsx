import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { Package } from "lucide-react";

import { db, withRetry } from "@/drizzle";
import { categories, games, products } from "@/Database/schema";
import ProductDialogue from "@/Components/admin/ProductDialogue";
import ProductsTable from "@/Components/admin/ProductsTable";
import PageHeader from "@/Components/admin/PageHeader";
import Breadcrumbs from "@/Components/admin/Breadcrumbs";
import EmptyState from "@/Components/admin/EmptyState";

/** Postgres throws on a malformed uuid, so reject it before querying. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CategoryDetailPage = async ({
  params,
}: PageProps<"/admin/games/[gameid]/[categoryid]">) => {
  const { gameid, categoryid } = await params;

  if (!UUID_PATTERN.test(gameid) || !UUID_PATTERN.test(categoryid)) {
    notFound();
  }

  // One joined lookup confirms the category exists *and* belongs to this game,
  // and returns both names for the breadcrumb — instead of two queries.
  const [context, productRows] = await Promise.all([
    withRetry(() =>
      db
        .select({ gameName: games.name, categoryName: categories.name })
        .from(categories)
        .innerJoin(games, eq(games.id, categories.gameId))
        .where(and(eq(categories.id, categoryid), eq(categories.gameId, gameid)))
        .limit(1),
    ),
    withRetry(() =>
      db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          salesprice: products.salesprice,
          image: products.image,
          stock: products.stock,
          isFeatured: products.isFeatured,
          isActive: products.isActive,
        })
        .from(products)
        .where(
          and(
            eq(products.categoryId, categoryid),
            eq(products.gameId, gameid),
          ),
        )
        .orderBy(asc(products.name)),
    ),
  ]);

  if (context.length === 0) {
    notFound();
  }

  const { gameName, categoryName } = context[0];

  const addProductButton = (
    <ProductDialogue gameId={gameid} categoryId={categoryid} />
  );

  return (
    <>
      <PageHeader
        title={categoryName}
        description={
          productRows.length === 1
            ? "1 product"
            : `${productRows.length} products in this category`
        }
        actions={addProductButton}
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Games", href: "/admin/games" },
              { label: gameName, href: `/admin/games/${gameid}` },
              { label: categoryName },
            ]}
          />
        }
      />

      {productRows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Products are the items customers buy. Add your first one to this category."
          action={addProductButton}
        />
      ) : (
        <ProductsTable products={productRows} />
      )}
    </>
  );
};

export default CategoryDetailPage;
