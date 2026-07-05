"use client";

import { type ReactNode, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * Dashboard widget (docs/DESIGN_LANGUAGE.md 7.2). A surface card with a hairline
 * title bar, an optional overflow menu, and a drag handle. Reused by creator
 * analytics and investor dashboards. Reorder is wired here with @dnd-kit; resize
 * is a later addition on top of the same board.
 */

interface WidgetShellProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Props from the sortable hook, spread onto the drag handle. */
  dragHandleProps?: Record<string, unknown>;
}

export function DashboardWidget({
  title,
  actions,
  children,
  className,
  dragHandleProps,
}: WidgetShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface",
        className,
      )}
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        {dragHandleProps && (
          <button
            type="button"
            aria-label="Drag to reorder"
            className="tap-target focus-ring -ml-1 cursor-grab text-text-faint hover:text-text-mute active:cursor-grabbing"
            {...dragHandleProps}
          >
            <GripVertical size={15} />
          </button>
        )}
        <h3 className="t-h3 flex-1 truncate text-[0.9375rem]">{title}</h3>
        {actions && (
          <div className="relative">
            <button
              type="button"
              aria-label="Widget options"
              onClick={() => setMenuOpen((o) => !o)}
              onBlur={() => setMenuOpen(false)}
              className="tap-target focus-ring text-text-faint hover:text-text-mute"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div className="menu-pop absolute right-0 z-20 mt-1 min-w-40 rounded-[var(--radius-card)] border border-border bg-surface p-1 shadow-[var(--shadow-card)]">
                {actions}
              </div>
            )}
          </div>
        )}
      </header>
      <div className="min-h-0 flex-1 p-4">{children}</div>
    </section>
  );
}

interface SortableWidgetProps {
  id: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A DashboardWidget that participates in a DashboardBoard's drag-reorder. */
export function SortableWidget({ id, title, actions, children, className }: SortableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
        opacity: isDragging ? 0.85 : 1,
      }}
    >
      <DashboardWidget
        title={title}
        actions={actions}
        className={className}
        dragHandleProps={{ ...attributes, ...listeners }}
      >
        {children}
      </DashboardWidget>
    </div>
  );
}

interface DashboardBoardProps {
  ids: string[];
  onReorder: (ids: string[]) => void;
  children: ReactNode;
  className?: string;
}

/** Grid of sortable widgets. Pass `SortableWidget` children whose ids match `ids`. */
export function DashboardBoard({ ids, onReorder, children, className }: DashboardBoardProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    onReorder(arrayMove(ids, from, to));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>{children}</div>
      </SortableContext>
    </DndContext>
  );
}
