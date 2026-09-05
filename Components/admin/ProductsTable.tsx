import Image from "next/image";
import { ImageOff } from "lucide-react";

import { Badge } from "@/Components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";
import { deleteProduct } from "@/lib/actions/admin-actions/product";
import EditProductDialog from "./EditProductDialog";
import DeleteButton from "./DeleteButton";

export type ProductRow = {
  id: string;
  name: string;
  /** `numeric` columns come back as strings to preserve decimal precision. */
  price: string;
  salesprice: string;
  image: string;
  stock: number;
  isFeatured: boolean;
  isActive: boolean;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Prices are strings from the database, so parse once at the render boundary. */
const formatPrice = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? currency.format(parsed) : value;
};

/**
 * Server Component — a read-only table ships no JavaScript. Row actions live in
 * their own client components so interactivity stays scoped.
 */
const ProductsTable = ({ products }: { products: ProductRow[] }) => (
  <div className="overflow-hidden rounded-xl border">
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[60px]">
              <span className="sr-only">Image</span>
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-[110px] text-right">Price</TableHead>
            <TableHead className="w-[110px] text-right">Sale</TableHead>
            <TableHead className="w-[90px] text-right">Stock</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead className="w-[100px] text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {products.map((product) => {
            const onSale = Number(product.salesprice) < Number(product.price);

            return (
              <TableRow key={product.id}>
                <TableCell>
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt=""
                      width={40}
                      height={40}
                      unoptimized
                      className="size-10 rounded-lg object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted ring-1 ring-border">
                      <ImageOff className="size-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>

                <TableCell className="font-medium">{product.name}</TableCell>

                <TableCell className="text-right tabular-nums">
                  <span className={onSale ? "text-muted-foreground line-through" : undefined}>
                    {formatPrice(product.price)}
                  </span>
                </TableCell>

                <TableCell className="text-right tabular-nums">
                  {onSale ? (
                    formatPrice(product.salesprice)
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="text-right tabular-nums">
                  {product.stock === 0 ? (
                    <span className="text-destructive">0</span>
                  ) : (
                    product.stock
                  )}
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={product.isActive ? "default" : "secondary"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {product.isFeatured ? (
                      <Badge variant="outline">Featured</Badge>
                    ) : null}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center justify-end gap-0.5">
                    <EditProductDialog
                      productId={product.id}
                      product={{
                        name: product.name,
                        price: product.price,
                        salesprice: product.salesprice,
                        stock: product.stock,
                      }}
                    />
                    <DeleteButton
                      action={deleteProduct}
                      id={product.id}
                      label={product.name}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  </div>
);

export default ProductsTable;
