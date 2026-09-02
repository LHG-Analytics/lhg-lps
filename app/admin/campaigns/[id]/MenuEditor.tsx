"use client";
import { useState } from "react";
import type { MenuBlockProps } from "@/lib/schema";

/* ── tipos ──────────────────────────────────────────── */

type Section = MenuBlockProps["columns"][number]["sections"][number];
type Item = Section["items"][number];
type Column = MenuBlockProps["columns"][number];

interface Props {
  props: MenuBlockProps;
  /** Mesmo contrato do PropForm: caminho + valor, gravado via deepSet. */
  onChange: (path: string[], value: unknown) => void;
}

/* ── estilos ────────────────────────────────────────── */

const fld: React.CSSProperties = {
  width: "100%", background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 5, padding: "6px 9px", color: "#F0EEF8", fontSize: 12,
  outline: "none", fontFamily: "inherit", minWidth: 0,
};

const COLUMN_LABEL = ["Coluna esquerda", "Coluna central", "Coluna direita"];

const ACCENTS: Array<{ v: NonNullable<Section["accent"]>; label: string; dot: string }> = [
  { v: "accent",   label: "Marca",     dot: "#C9A7F5" },
  { v: "gold",     label: "Secundária", dot: "#E0C9FF" },
  { v: "green",    label: "Verde",     dot: "#4FB48A" },
  { v: "panelInk", label: "Neutra",    dot: "#F2ECFF" },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 9, color: "#8E8AA8", display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.07em" }}>
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9.5, color: "#3A3850", marginTop: 3, lineHeight: 1.45 }}>{children}</div>;
}

function IconBtn({ onClick, title, children, danger }: {
  onClick: () => void; title: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        background: "transparent", border: "none", cursor: "pointer",
        color: danger ? "#E05260" : "#55526A", fontSize: 12, lineHeight: 1,
        padding: "2px 4px", borderRadius: 4, flexShrink: 0, fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function AddBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%", background: "transparent", border: "1px dashed rgba(255,255,255,0.13)",
        borderRadius: 5, padding: "6px 0", color: "#55526A", fontSize: 10.5,
        cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

/** Move um elemento de índice sem mutar o array original. */
function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [el] = next.splice(from, 1);
  next.splice(to, 0, el!);
  return next;
}

/* ── ItemRow ────────────────────────────────────────── */

function ItemRow({ item, index, total, onPatch, onRemove, onMove }: {
  item: Item;
  index: number;
  total: number;
  onPatch: (patch: Partial<Item>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: 7, background: "rgba(255,255,255,0.015)" }}>
      {/* Linha principal: nome + preço, o que já resolve a maioria dos itens */}
      <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 5 }}>
        <input
          type="text"
          value={item?.name ?? ""}
          onChange={(e) => onPatch({ name: e.target.value })}
          style={{ ...fld, flex: 1 }}
          placeholder="Nome do produto"
        />
        <input
          type="text"
          value={item?.price ?? ""}
          onChange={(e) => onPatch({ price: e.target.value || undefined })}
          style={{ ...fld, width: 74, flexShrink: 0, textAlign: "right", fontFamily: "monospace" }}
          placeholder="R$ 0,00"
        />
      </div>

      <textarea
        value={item?.description ?? ""}
        onChange={(e) => onPatch({ description: e.target.value || undefined })}
        style={{ ...fld, resize: "vertical", lineHeight: 1.45 }}
        rows={2}
        placeholder="Descrição dos ingredientes"
      />

      {/* Campos menos usados ficam recolhidos para a lista não virar um muro */}
      {open && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 6 }}>
          <div>
            <Label>Complemento do nome</Label>
            <input
              type="text"
              value={item?.qty ?? ""}
              onChange={(e) => onPatch({ qty: e.target.value || undefined })}
              style={fld}
              placeholder="(6 unidades) · (220g) · (long neck)"
            />
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <div style={{ width: 96, flexShrink: 0 }}>
              <Label>Rótulo da nota</Label>
              <input
                type="text"
                value={item?.noteLabel ?? ""}
                onChange={(e) => onPatch({ noteLabel: e.target.value || undefined })}
                style={fld}
                placeholder="Divirta-se:"
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Label>Nota</Label>
              <input
                type="text"
                value={item?.note ?? ""}
                onChange={(e) => onPatch({ note: e.target.value || undefined })}
                style={fld}
                placeholder="Texto extra em itálico"
              />
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 5 }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{ background: "transparent", border: "none", color: "#55526A", fontSize: 9.5, cursor: "pointer", padding: 0, fontFamily: "inherit" }}
        >
          {open ? "− menos campos" : "+ mais campos"}
        </button>
        <div style={{ flex: 1 }} />
        <IconBtn onClick={() => onMove(-1)} title="Mover para cima">{index > 0 ? "↑" : ""}</IconBtn>
        <IconBtn onClick={() => onMove(1)} title="Mover para baixo">{index < total - 1 ? "↓" : ""}</IconBtn>
        <IconBtn onClick={onRemove} title="Remover produto" danger>✕</IconBtn>
      </div>
    </div>
  );
}

/* ── SectionCard ────────────────────────────────────── */

function SectionCard({ section, index, total, onPatch, onRemove, onMove }: {
  section: Section;
  index: number;
  total: number;
  onPatch: (patch: Partial<Section>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [open, setOpen] = useState(index === 0);
  const items = section?.items ?? [];
  const inline = section?.inlineItems ?? [];
  const heading = section?.heading ?? "ornament";
  const accent = section?.accent ?? "accent";

  const patchItems = (next: Item[]) => onPatch({ items: next });

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, background: "rgba(255,255,255,0.02)", overflow: "hidden" }}>
      {/* Cabeçalho do grupo */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 9px", background: "rgba(255,255,255,0.025)" }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#55526A", fontSize: 9, padding: 0, transform: open ? "rotate(90deg)" : "none", transition: "transform 130ms", flexShrink: 0 }}
        >
          ▶
        </button>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#F0EEF8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {section?.title || "Grupo sem nome"}
          {section?.titleEmphasis ? <em style={{ color: "#A67CFF" }}> {section.titleEmphasis}</em> : null}
        </span>
        <span style={{ fontSize: 9, color: "#3A3850", flexShrink: 0 }}>
          {items.length > 0 ? `${items.length} itens` : inline.length > 0 ? `${inline.length} na linha` : "vazio"}
        </span>
        <IconBtn onClick={() => onMove(-1)} title="Mover grupo para cima">{index > 0 ? "↑" : ""}</IconBtn>
        <IconBtn onClick={() => onMove(1)} title="Mover grupo para baixo">{index < total - 1 ? "↓" : ""}</IconBtn>
        <IconBtn onClick={onRemove} title="Remover grupo" danger>✕</IconBtn>
      </div>

      {open && (
        <div style={{ padding: 9, display: "flex", flexDirection: "column", gap: 9 }}>
          {/* Título em duas vozes, como no impresso */}
          <div style={{ display: "flex", gap: 5 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Label>Título</Label>
              <input
                type="text"
                value={section?.title ?? ""}
                onChange={(e) => onPatch({ title: e.target.value })}
                style={fld}
                placeholder="acordando"
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Label>Em itálico</Label>
              <input
                type="text"
                value={section?.titleEmphasis ?? ""}
                onChange={(e) => onPatch({ titleEmphasis: e.target.value || undefined })}
                style={{ ...fld, fontStyle: "italic" }}
                placeholder="bem"
              />
            </div>
          </div>
          <Hint>O título sai em duas vozes: a primeira parte em romano, a segunda em itálico — <em>acordando bem</em>.</Hint>

          {/* Estilo do cabeçalho */}
          <div>
            <Label>Estilo do título</Label>
            <div style={{ display: "flex", gap: 4 }}>
              {([["ornament", "Com filete"], ["plain", "Simples"]] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onPatch({ heading: v })}
                  style={{
                    flex: 1, padding: "5px 0", borderRadius: 5, fontSize: 10.5, cursor: "pointer", fontWeight: 600,
                    border: `1px solid ${heading === v ? "#A67CFF" : "rgba(255,255,255,0.08)"}`,
                    background: heading === v ? "rgba(166,124,255,0.16)" : "transparent",
                    color: heading === v ? "#A67CFF" : "#55526A", fontFamily: "inherit",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Cor de acento */}
          <div>
            <Label>Cor do grupo</Label>
            <div style={{ display: "flex", gap: 4 }}>
              {ACCENTS.map((a) => (
                <button
                  key={a.v}
                  type="button"
                  onClick={() => onPatch({ accent: a.v })}
                  title={a.label}
                  style={{
                    flex: 1, padding: "5px 0", borderRadius: 5, cursor: "pointer",
                    border: `1px solid ${accent === a.v ? "#A67CFF" : "rgba(255,255,255,0.08)"}`,
                    background: accent === a.v ? "rgba(166,124,255,0.16)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: a.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 9.5, color: accent === a.v ? "#A67CFF" : "#55526A", fontWeight: 600 }}>{a.label}</span>
                </button>
              ))}
            </div>
            <Hint>Puxa do tema da marca — não é cor fixa.</Hint>
          </div>

          {/* Textos auxiliares */}
          <div>
            <Label>Subtítulo</Label>
            <input
              type="text"
              value={section?.subtitle ?? ""}
              onChange={(e) => onPatch({ subtitle: e.target.value || undefined })}
              style={fld}
              placeholder="corte especial e um acompanhamento à sua escolha"
            />
          </div>
          <div>
            <Label>Texto de abertura</Label>
            <textarea
              value={section?.intro ?? ""}
              onChange={(e) => onPatch({ intro: e.target.value || undefined })}
              style={{ ...fld, resize: "vertical" }}
              rows={2}
              placeholder="Parágrafo em itálico acima dos produtos"
            />
          </div>

          {/* Produtos */}
          <div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 5 }}>
              <Label>Produtos</Label>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map((item, ii) => (
                <ItemRow
                  key={ii}
                  item={item}
                  index={ii}
                  total={items.length}
                  onPatch={(patch) => patchItems(items.map((x, j) => (j === ii ? { ...x, ...patch } : x)))}
                  onRemove={() => patchItems(items.filter((_, j) => j !== ii))}
                  onMove={(dir) => patchItems(move(items, ii, ii + dir))}
                />
              ))}
              <AddBtn onClick={() => patchItems([...items, { name: "" } as Item])}>+ Adicionar produto</AddBtn>
            </div>
          </div>

          {/* Lista corrida — acompanhamentos e afins */}
          <div>
            <Label>Lista corrida</Label>
            <textarea
              value={inline.join("\n")}
              onChange={(e) => {
                const next = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
                onPatch({ inlineItems: next.length ? next : undefined });
              }}
              style={{ ...fld, resize: "vertical", lineHeight: 1.5 }}
              rows={3}
              placeholder={"Arroz e feijão\nFritas\nLegumes grelhados"}
            />
            <Hint>Um por linha. Sai numa única linha separada por <code style={{ color: "#8E8AA8" }}>·</code>, sem preço — para acompanhamentos.</Hint>
          </div>

          <div>
            <Label>Nota de pé do grupo</Label>
            <input
              type="text"
              value={section?.footnote ?? ""}
              onChange={(e) => onPatch({ footnote: e.target.value || undefined })}
              style={fld}
              placeholder="* Consulte nossa equipe para mais opções."
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MenuEditor ─────────────────────────────────────── */

const EMPTY_SECTION = { title: "Novo grupo", heading: "ornament", accent: "accent", items: [] } as unknown as Section;

export function MenuEditor({ props, onChange }: Props) {
  const columns = props.columns ?? [];
  const [activeCol, setActiveCol] = useState(0);

  const setColumns = (next: Column[]) => onChange(["columns"], next);

  const patchColumn = (ci: number, patch: Partial<Column>) =>
    setColumns(columns.map((c, i) => (i === ci ? { ...c, ...patch } : c)));

  const col = columns[activeCol];
  const sections = col?.sections ?? [];

  const patchSections = (next: Section[]) => patchColumn(activeCol, { sections: next });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Cabeçalho do cardápio */}
      <div style={{ background: "rgba(166,124,255,0.05)", border: "1px solid rgba(166,124,255,0.15)", borderRadius: 8, padding: "10px 11px" }}>
        <Label>Sobrelinha do cabeçalho</Label>
        <input
          type="text"
          value={props.eyebrow ?? ""}
          onChange={(e) => onChange(["eyebrow"], e.target.value || undefined)}
          style={fld}
          placeholder="GASTROBAR"
        />
        <Hint>
          O nome e as cores vêm da marca — a logo é usada no centro do cabeçalho automaticamente,
          e a paleta sai do tema. Não há cor nem logo para digitar aqui.
        </Hint>
      </div>

      {/* Seletor de coluna */}
      <div>
        <Label>Coluna</Label>
        <div style={{ display: "flex", gap: 4 }}>
          {columns.map((c, ci) => (
            <button
              key={ci}
              type="button"
              onClick={() => setActiveCol(ci)}
              style={{
                flex: 1, padding: "6px 2px", borderRadius: 5, cursor: "pointer",
                border: `1px solid ${activeCol === ci ? "#A67CFF" : "rgba(255,255,255,0.08)"}`,
                background: activeCol === ci ? "rgba(166,124,255,0.16)" : "transparent",
                color: activeCol === ci ? "#A67CFF" : "#55526A",
                fontSize: 10, fontWeight: 700, fontFamily: "inherit", minWidth: 0,
              }}
            >
              {ci + 1}
              <span style={{ fontSize: 8.5, display: "block", fontWeight: 400, opacity: 0.8 }}>
                {(c?.sections ?? []).length} grupos
              </span>
            </button>
          ))}
          {columns.length < 3 && (
            <button
              type="button"
              onClick={() => { setColumns([...columns, { variant: "plain", sections: [] } as unknown as Column]); setActiveCol(columns.length); }}
              title="Adicionar coluna"
              style={{
                width: 30, flexShrink: 0, borderRadius: 5, cursor: "pointer",
                border: "1px dashed rgba(255,255,255,0.13)", background: "transparent",
                color: "#55526A", fontSize: 13, fontFamily: "inherit",
              }}
            >
              +
            </button>
          )}
        </div>
        <Hint>{COLUMN_LABEL[activeCol] ?? `Coluna ${activeCol + 1}`} · três colunas no desktop, uma no celular.</Hint>
      </div>

      {col && (
        <>
          {/* Destaque da coluna */}
          <div>
            <Label>Fundo da coluna</Label>
            <div style={{ display: "flex", gap: 4 }}>
              {([["plain", "Sem fundo"], ["panel", "Painel destacado"]] as const).map(([v, label]) => {
                const active = (col.variant ?? "plain") === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => patchColumn(activeCol, { variant: v })}
                    style={{
                      flex: 1, padding: "5px 0", borderRadius: 5, fontSize: 10.5, cursor: "pointer", fontWeight: 600,
                      border: `1px solid ${active ? "#A67CFF" : "rgba(255,255,255,0.08)"}`,
                      background: active ? "rgba(166,124,255,0.16)" : "transparent",
                      color: active ? "#A67CFF" : "#55526A", fontFamily: "inherit",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grupos da coluna */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {sections.map((sec, si) => (
              <SectionCard
                key={si}
                section={sec}
                index={si}
                total={sections.length}
                onPatch={(patch) => patchSections(sections.map((x, j) => (j === si ? { ...x, ...patch } : x)))}
                onRemove={() => patchSections(sections.filter((_, j) => j !== si))}
                onMove={(dir) => patchSections(move(sections, si, si + dir))}
              />
            ))}
            <AddBtn onClick={() => patchSections([...sections, { ...EMPTY_SECTION }])}>
              + Adicionar grupo nesta coluna
            </AddBtn>
          </div>

          {columns.length > 1 && (
            <button
              type="button"
              onClick={() => { setColumns(columns.filter((_, i) => i !== activeCol)); setActiveCol(0); }}
              style={{
                background: "transparent", border: "1px solid rgba(224,82,96,0.25)", borderRadius: 5,
                padding: "6px 0", color: "#E05260", fontSize: 10.5, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
              }}
            >
              Remover {COLUMN_LABEL[activeCol]?.toLowerCase() ?? "coluna"}
            </button>
          )}
        </>
      )}

      {/* Rodapé */}
      <div>
        <Label>Nota de pé do cardápio</Label>
        <input
          type="text"
          value={props.footnote ?? ""}
          onChange={(e) => onChange(["footnote"], e.target.value || undefined)}
          style={fld}
          placeholder="Preços sujeitos a alteração sem aviso prévio."
        />
      </div>
    </div>
  );
}
