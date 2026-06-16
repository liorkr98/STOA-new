import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-border bg-surface px-6 py-16 text-center">
      {icon && <div className="text-text-faint">{icon}</div>}
      <h3 className="t-h3">{title}</h3>
      {body && <p className="t-body mx-auto text-center">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
