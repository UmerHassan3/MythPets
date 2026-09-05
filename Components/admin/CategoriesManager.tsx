"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronRight, FolderTree, Plus } from "lucide-react";

import { CategorySchema } from "@/validation";
import {
  createCategory,
  deleteCategory,
} from "@/lib/actions/admin-actions/category";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Badge } from "@/Components/ui/badge";
import { Field, FieldError, FieldLabel } from "@/Components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";
import EmptyState from "./EmptyState";
import DeleteButton from "./DeleteButton";

export type CategoryRow = {
  id: string;
  name: string;
  isActive: boolean;
  productCount: number;
};

type CategoryValues = z.infer<typeof CategorySchema>;

type CategoriesManagerProps = {
  gameId: string;
  categories: CategoryRow[];
};

/**
 * Categories always belong to the game in the current route, so `gameId` comes
 * from the URL rather than a picker — one less control and one less query.
 */
const CategoriesManager = ({ gameId, categories }: CategoriesManagerProps) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryValues>({
    resolver: zodResolver(CategorySchema),
    defaultValues: { name: "" },
  });

  const onSubmit = (values: CategoryValues) => {
    startTransition(async () => {
      const result = await createCategory({ name: values.name, gameid: gameId });

      if (result.success) {
        toast.success(result.message);
        reset();
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const busy = isPending || isSubmitting;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground">
            {categories.length === 1
              ? "1 category"
              : `${categories.length} categories`}
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex items-start gap-2"
        >
          <Field className="w-56">
            <FieldLabel htmlFor="category-name" className="sr-only">
              Category name
            </FieldLabel>
            <Input
              id="category-name"
              placeholder="New category name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>

          <Button type="submit" disabled={busy}>
            <Plus className="size-4" />
            {busy ? "Adding..." : "Add"}
          </Button>
        </form>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories yet"
          description="Categories group the products inside this game — for example Regular Pets, Neon Pets, or Mega Pets."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[130px]">Products</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[60px] text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id} className="group">
                    <TableCell>
                      <Link
                        href={`/admin/games/${gameId}/${category.id}`}
                        className="inline-flex items-center gap-1 font-medium outline-none hover:underline focus-visible:underline"
                      >
                        {category.name}
                        <ChevronRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    </TableCell>

                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {category.productCount}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={category.isActive ? "default" : "secondary"}
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <DeleteButton
                        action={deleteCategory}
                        id={category.id}
                        label={category.name}
                        description="Categories that still have products cannot be deleted."
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </section>
  );
};

export default CategoriesManager;
