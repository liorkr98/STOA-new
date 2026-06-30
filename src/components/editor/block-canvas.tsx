"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVertical, Trash } from "@phosphor-icons/react";
import { cn } from "@/lib/design/cn";
import type { EditorBlock } from "@/lib/editor/types";
import { BLOCK_META } from "@/lib/editor/types";
import { BlockEditor } from "@/components/editor/block-editor";

function SortableBlock({
  block,
  onChange,
  onRemove,
}: {
  block: EditorBlock;
  onChange: (content: EditorBlock["content"]) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group glass relative rounded-[var(--radius-card)] p-4 transition-[border-color,opacity]",
        isDragging && "z-10 opacity-90 ring-1 ring-accent/40",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab rounded p-1 text-text-faint hover:bg-surface-2 hover:text-text active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <DotsSixVertical size={18} />
          </button>
          <span className="t-eyebrow">{BLOCK_META[block.type].label}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-text-faint opacity-0 transition-opacity hover:text-[var(--down)] group-hover:opacity-100"
          aria-label="Remove block"
        >
          <Trash size={16} />
        </button>
      </div>
      <BlockEditor block={block} onChange={onChange} />
    </div>
  );
}

export function BlockCanvas({
  blocks,
  onChange,
}: {
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = [...blocks];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onChange(next);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-4">
          {blocks.map((block) => (
            <SortableBlock
              key={block.id}
              block={block}
              onChange={(content) =>
                onChange(blocks.map((b) => (b.id === block.id ? { ...b, content } : b)))
              }
              onRemove={() => onChange(blocks.filter((b) => b.id !== block.id))}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
