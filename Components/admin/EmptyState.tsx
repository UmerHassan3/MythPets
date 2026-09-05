import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Usually the same primary action as the page header. */
  action?: ReactNode;
};

/**
 * Shared "nothing here yet" panel. An empty table with a bare sentence reads as
 * a bug; this reads as a state. Server Component.
 */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
    <div className="flex size-11 items-center justify-center rounded-full bg-muted">
      <Icon className="size-5 text-muted-foreground" />
    </div>

    <div className="space-y-1">
      <p className="font-medium">{title}</p>
      <p className="mx-auto max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
    </div>

    {action ? <div className="pt-1">{action}</div> : null}
  </div>
);

export default EmptyState;
