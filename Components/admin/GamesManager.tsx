"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronRight, Gamepad2, ImageOff, Plus } from "lucide-react";

import { GameSchema } from "@/validation";
import { createGame, deleteGame } from "@/lib/actions/admin-actions/games";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Badge } from "@/Components/ui/badge";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/Components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/Components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";
import PageHeader from "./PageHeader";
import EmptyState from "./EmptyState";
import DeleteButton from "./DeleteButton";

/** Only the columns the table renders — see the note in the page component. */
export type GameRow = {
  id: string;
  name: string;
  image: string | null;
  isActive: boolean;
  categoryCount: number;
};

type GameValues = z.infer<typeof GameSchema>;

const GamesManager = ({ games }: { games: GameRow[] }) => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GameValues>({
    resolver: zodResolver(GameSchema),
    defaultValues: { name: "", image: "" },
  });

  const onSubmit = (values: GameValues) => {
    startTransition(async () => {
      const result = await createGame(values);

      if (result.success) {
        toast.success(result.message);
        reset();
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const busy = isPending || isSubmitting;

  /**
   * Temporarily hidden at the client's request.
   *
   * Flip to `true` to bring the button back — the dialog, its form and the
   * `createGame` action are all left intact, so nothing else needs changing.
   */
  const SHOW_ADD_GAME = false;

  const addGameButton = (
    <DialogTrigger render={<Button />}>
      <Plus className="size-4" />
      Add game
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <PageHeader
        title="Games"
        description={
          games.length === 1 ? "1 game" : `${games.length} games in the catalogue`
        }
        actions={SHOW_ADD_GAME ? addGameButton : undefined}
      />

      {games.length === 0 ? (
        <EmptyState
          icon={Gamepad2}
          title="No games yet"
          description={
            SHOW_ADD_GAME
              ? "Games sit at the top of your catalogue. Add one, then give it categories and products."
              : // Without the button, telling somebody to "add one" points at
                // a control that is not on screen.
                "Games sit at the top of your catalogue. None have been added yet."
          }
          action={SHOW_ADD_GAME ? addGameButton : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[60px]">
                    <span className="sr-only">Image</span>
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[130px]">Categories</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[60px] text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {games.map((game) => (
                  <TableRow key={game.id} className="group">
                    <TableCell>
                      {game.image ? (
                        <Image
                          src={game.image}
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

                    <TableCell>
                      <Link
                        href={`/admin/games/${game.id}`}
                        className="inline-flex items-center gap-1 font-medium outline-none hover:underline focus-visible:underline"
                      >
                        {game.name}
                        <ChevronRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    </TableCell>

                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {game.categoryCount}
                    </TableCell>

                    <TableCell>
                      <Badge variant={game.isActive ? "default" : "secondary"}>
                        {game.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <DeleteButton
                        action={deleteGame}
                        id={game.id}
                        label={game.name}
                        description="Deleting a game also deletes its categories and products."
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add game</DialogTitle>
            <DialogDescription>
              Create a game that categories and products can belong to.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="game-name">Name</FieldLabel>
              <Input
                id="game-name"
                placeholder="Adopt Me"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="game-image">Image URL</FieldLabel>
              <Input
                id="game-image"
                placeholder="https://example.com/adopt-me.png"
                aria-invalid={!!errors.image}
                {...register("image")}
              />
              <FieldError errors={[errors.image]} />
            </Field>
          </FieldGroup>

          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating..." : "Create game"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GamesManager;
