import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Primary action(s) for the page, right-aligned on wide screens. */
  actions?: ReactNode;
  /** Breadcrumb trail rendered above the title. */
  breadcrumbs?: ReactNode;
};

/**
 * Every admin page opens the same way, so the layout lives in one place rather
 * than being re-typed per page. Server Component — ships no JavaScript.
 */
const PageHeader = ({
  title,
  description,
  actions,
  breadcrumbs,
}: PageHeaderProps) => (
  <header className="space-y-4 border-b pb-6">
    {breadcrumbs}

    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  </header>
);

export default PageHeader;
