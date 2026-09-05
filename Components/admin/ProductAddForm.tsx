"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Switch } from "@/Components/ui/switch";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/Components/ui/field";
import ImageUpload from "@/Components/ImageUpload";
import { productSchema } from "@/validation";
import { toast } from "sonner";
import { addProduct } from "@/lib/actions/admin-actions/product";

/**
 * `price`, `salesprice` and `stock` use `z.coerce.number()`, so the schema's
 * input (what the number inputs hand over) and output (what the handler
 * receives) are different types. Keep both.
 */
type ProductFormInput = z.input<typeof productSchema>;
type ProductFormValues = z.output<typeof productSchema>;

type ProductFormProps = {
  /** Both come from the route — this form always lives under a category. */
  gameId: string;
  categoryId: string;
  /** Lets the dialog close itself once a product is created. */
  onCreated?: () => void;
};

export default function ProductAddForm({
  gameId,
  categoryId,
  onCreated,
}: ProductFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      gameId,
      categoryId,
      name: "",
      price: 0,
      salesprice: 0,
      image: "",
      stock: 0,
      isFeatured: false,
      isActive: true,
    },
  });

  const onSubmit = async (values: ProductFormValues) => {
    const result = await addProduct({
      gameId: values.gameId,
      categoryId: values.categoryId,
      name: values.name,
      // `numeric` columns are strings in drizzle; toFixed matches scale: 2 and
      // avoids float artifacts like 19.989999999999998.
      price: values.price.toFixed(2),
      salesprice: values.salesprice.toFixed(2),
      image: values.image,
      stock: values.stock,
      isFeatured: values.isFeatured,
      isActive: values.isActive,
    });

    if (result.success) {
      toast.success(result.message);
      reset();
      onCreated?.();
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        {/* gameId and categoryId are fixed by the route, not user-editable. */}
        <input type="hidden" {...register("gameId")} />
        <input type="hidden" {...register("categoryId")} />

        <Field>
          <FieldLabel htmlFor="product-name">Product name</FieldLabel>
          <Input
            id="product-name"
            placeholder="Frost Dragon"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        {/* Paired so the dialog stays short — three stacked number inputs is
            most of what made it too tall. */}
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="product-price">Price</FieldLabel>
            <Input
              id="product-price"
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
            <FieldLabel htmlFor="product-salesprice">Sale price</FieldLabel>
            <Input
              id="product-salesprice"
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
          <FieldLabel htmlFor="product-stock">Stock</FieldLabel>
          <Input
            id="product-stock"
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

        <Field>
          <FieldLabel>Product image</FieldLabel>
          {/* Registered so the schema can validate it; the value is written by
              the uploader rather than typed. */}
          <input type="hidden" {...register("image")} />
          <ImageUpload
            folder="/products"
            onUpload={(uploaded) =>
              setValue("image", uploaded.url, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            onClear={() =>
              setValue("image", "", { shouldValidate: true, shouldDirty: true })
            }
          />
          <FieldError errors={[errors.image]} />
        </Field>

        {/* Switch is controlled, so it needs Controller rather than register. */}
        <Field orientation="horizontal">
          <FieldLabel htmlFor="product-featured">
            Featured product
            <FieldDescription>
              Show this product in featured listings.
            </FieldDescription>
          </FieldLabel>
          <Controller
            control={control}
            name="isFeatured"
            render={({ field }) => (
              <Switch
                id="product-featured"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </Field>

        <Field orientation="horizontal">
          <FieldLabel htmlFor="product-active">
            Active
            <FieldDescription>
              Whether customers can see this product.
            </FieldDescription>
          </FieldLabel>
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <Switch
                id="product-active"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </Field>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create product"}
        </Button>
      </FieldGroup>
    </form>
  );
}
