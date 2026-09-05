"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

import { Input } from "@/Components/ui/input";

type ProductSearchProps = {
  /** Current query from the URL, so the input survives a reload or back nav. */
  initialQuery: string;
  placeholder?: string;
};

const DEBOUNCE_MS = 350;

/**
 * Client island: it owns the input and pushes the term into the URL, where the
 * server page reads it. Keeping the query in the URL rather than component
 * state means results are shareable, survive refresh, and work with back/forward.
 */
const ProductSearch = ({ initialQuery, placeholder }: ProductSearchProps) => {
  const [value, setValue] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  // Skip the navigation that would otherwise fire on first render.
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    // Debounced so typing doesn't fire a query per keystroke.
    const timer = setTimeout(() => {
      const trimmed = value.trim();
      // Always drop back to page 1 — page 4 of the old result set is
      // meaningless for a new search.
      const href = trimmed
        ? `${pathname}?q=${encodeURIComponent(trimmed)}`
        : pathname;

      startTransition(() => router.replace(href, { scroll: false }));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, pathname, router]);

  return (
    <div className="relative">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />

      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? "Search products…"}
        aria-label="Search products"
        className="pl-9"
      />

      <div className="absolute top-1/2 right-3 -translate-y-1/2">
        {isPending ? (
          <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" />
        ) : value ? (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label="Clear search"
            className="rounded text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default ProductSearch;
