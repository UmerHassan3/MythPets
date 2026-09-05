import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

export type Crumb = {
  label: string;
  /** Omit on the final crumb — the current page is not a link. */
  href?: string;
};

/**
 * The admin nests three levels deep (games → game → category), so the trail is
 * what tells you where you are. Server Component.
 */
const Breadcrumbs = ({ items }: { items: Crumb[] }) => (
  <nav aria-label="Breadcrumb">
    <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <Fragment key={`${item.label}-${index}`}>
            <li className="min-w-0">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="rounded transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="truncate font-medium text-foreground"
                >
                  {item.label}
                </span>
              )}
            </li>

            {!isLast ? (
              <li aria-hidden className="flex items-center">
                <ChevronRight className="size-3.5 opacity-60" />
              </li>
            ) : null}
          </Fragment>
        );
      })}
    </ol>
  </nav>
);

export default Breadcrumbs;
