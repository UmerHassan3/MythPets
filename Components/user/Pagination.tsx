import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
  /** Route the page number is appended to, e.g. "/reviews". */
  basePath: string;
  /**
   * Extra params to carry across pages — a search term, say. Without this,
   * paging through filtered results would silently drop the filter.
   */
  query?: Record<string, string>;
};

/**
 * Server Component — links rather than click handlers, so pagination costs no
 * JavaScript, works without it, and each page is a real shareable URL.
 */
const Pagination = ({ page, totalPages, basePath, query }: PaginationProps) => {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams(query);
    // Page 1 is the canonical URL, so it carries no page param.
    if (target > 1) params.set("page", String(target));

    const search = params.toString();
    return search ? `${basePath}?${search}` : basePath;
  };

  // A window around the current page, so 200 pages don't render 200 links.
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, Math.max(page + 2, 5));
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const arrow =
    "flex size-9 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  return (
    <nav
      aria-label="Reviews pagination"
      className="flex items-center justify-center gap-1.5"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} aria-label="Previous page" className={arrow}>
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span aria-hidden className={cn(arrow, "pointer-events-none opacity-40")}>
          <ChevronLeft className="size-4" />
        </span>
      )}

      {pages.map((target) => (
        <Link
          key={target}
          href={href(target)}
          aria-current={target === page ? "page" : undefined}
          className={cn(
            "flex size-9 items-center justify-center rounded-lg border text-sm tabular-nums transition-colors",
            target === page
              ? "border-foreground bg-foreground font-medium text-background"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {target}
        </Link>
      ))}

      {page < totalPages ? (
        <Link href={href(page + 1)} aria-label="Next page" className={arrow}>
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span aria-hidden className={cn(arrow, "pointer-events-none opacity-40")}>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
};

export default Pagination;
