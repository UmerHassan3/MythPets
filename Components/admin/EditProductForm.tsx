"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/Components/ui/field";
import { editproductSchema } from "@/validation";
import { updateProduct } from "@/lib/actions/admin-actions/product";

/**
 * `price`, `salesprice` and `stock` use `z.coerce.number()`, so the schema's
 * input (what the number inputs hand over) and output (what the handler
 * receives) are different types. Keep both.
 */
type EditProductInput = z.input<typeof editproductSchema>;
type EditProductValues = z.output<typeof editproductSchema>;

type EditProductFormProps = {
  productId: string;
  /**
   * Current values, so the form opens populated rather than blank — otherwise
   * saving would wipe fields the user never touched. Prices are strings
   * because drizzle maps `numeric` columns to string.
   */
  product: {
    name: string;
    price: string;
    salesprice: string;
    stock: number;
  };
  /** Lets a dialog close itself once the update succeeds. */
  onUpdated?: () => void;
};

export default function EditProductForm({
  productId,
  product,
  onUpdated,
}: EditProductFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditProductInput, unknown, EditProductValues>({
    resolver: zodResolver(editproductSchema),
    defaultValues: {
      name: product.name,
      price: Number(product.price),
      salesprice: Number(product.salesprice),
      stock: product.stock,
    },
  });

  const onSubmit = async (values: EditProductValues) => {
    const result = await updateProduct({
      id: productId,
      name: values.name,
      // `numeric` columns are strings in drizzle; toFixed matches scale: 2 and
      // avoids float artifacts like 19.989999999999998.
      price: values.price.toFixed(2),
      salesprice: values.salesprice.toFixed(2),
      stock: values.stock,
    });

    if (result.success) {
      toast.success(result.message);
      onUpdated?.();
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="edit-product-name">Product name</FieldLabel>
          <Input
            id="edit-product-name"
            placeholder="Frost Dragon"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="edit-product-price">Price</FieldLabel>
            <Input
              id="edit-product-price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              aria-invalid={!!errors.price}
              {...register("price")}
            />
            <FieldError errors={[errors.price]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-product-salesprice">Sale price</FieldLabel>
            <Input
              id="edit-product-salesprice"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              aria-invalid={!!errors.salesprice}
              {...register("salesprice")}
            />
            <FieldError errors={[errors.salesprice]} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="edit-product-stock">Stock</FieldLabel>
          <Input
            id="edit-product-stock"
            type="number"
            min="0"
            step="1"
            aria-invalid={!!errors.stock}
            {...register("stock")}
          />
          <FieldDescription>
            Sale price must be less than or equal to the regular price.
          </FieldDescription>
          <FieldError errors={[errors.stock]} />
        </Field>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save changes"}
        </Button>
      </FieldGroup>
    </form>
  );
}
