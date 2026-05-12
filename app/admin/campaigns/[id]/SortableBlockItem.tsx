"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type Block = { type: string; props: Record<string, unknown> };

export const BLOCK_ICON: Record<string, string> = {
  nav: "🔝", hero: "🎯", benefits: "✨", unitPicker: "🛏",
  offer: "💰", faq: "❓", footer: "🔚", stickyCta: "📌",
};

interface Props {
  id: string;
  block: Block;
  selected: boolean;
  hovered: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function SortableBlockItem({ id, block, selected, hovered, onSelect, onDuplicate, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "transform 150ms ease",
        opacity: isDragging ? 0.4 : 1,
        display: "flex", alignItems: "center", gap: 6, padding: "7px 6px",
        borderRadius: 7, cursor: "pointer", marginBottom: 2,
        background: selected ? "rgba(166,124,255,0.15)" : hovered ? "rgba(255,255,255,0.04)" : "transparent",
        border: `1px solid ${selected ? "rgba(166,124,255,0.4)" : "transparent"}`,
      }}
      onClick={onSelect}
    >
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        title="Arrastar para reordenar"
        style={{ cursor: isDragging ? "grabbing" : "grab", color: "#3A3850", fontSize: 12, padding: "0 2px", flexShrink: 0, lineHeight: 1 }}
      >
        ⠿
      </div>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{BLOCK_ICON[block.type] ?? "📦"}</span>
      <span style={{ fontSize: 12, color: selected ? "#A67CFF" : "#F0EEF8", fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {block.type}
      </span>
      <div style={{ display: "flex", gap: 1, flexShrink: 0 }}>
        <IconBtn onClick={(e) => { e.stopPropagation(); onDuplicate(); }} title="Duplicar">⧉</IconBtn>
        <IconBtn onClick={(e) => { e.stopPropagation(); onDelete(); }} danger title="Deletar">✕</IconBtn>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, danger, title }: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button onClick={onClick} title={title} style={{
      background: "none", border: "none", cursor: "pointer",
      color: danger ? "#E05260" : "#55526A", fontSize: 11, padding: "2px 4px", borderRadius: 3,
    }}>
      {children}
    </button>
  );
}
