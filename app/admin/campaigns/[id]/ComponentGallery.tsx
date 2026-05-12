"use client";

interface Props { onInsert: (snippet: string) => void; }

const COMPONENTS = [
  {
    category: "shadcn/ui",
    items: [
      { name: "Button", icon: "🔘", desc: "Botão com variantes", snippet: `{ "component": "Button", "props": { "label": "Reservar agora", "variant": "default", "size": "lg" } }` },
      { name: "Badge", icon: "🏷", desc: "Badge / tag de status", snippet: `{ "component": "Badge", "props": { "label": "Lote 1 · 25% OFF", "variant": "outline" } }` },
      { name: "Card", icon: "🃏", desc: "Card com header e body", snippet: `{ "component": "Card", "props": { "title": "Título", "description": "Descrição do card" } }` },
      { name: "Accordion", icon: "📂", desc: "Seção expansível de FAQ", snippet: `{ "component": "Accordion", "props": { "items": [{ "trigger": "Pergunta?", "content": "Resposta." }] } }` },
      { name: "Tabs", icon: "📑", desc: "Abas para múltiplas views", snippet: `{ "component": "Tabs", "props": { "tabs": [{ "label": "Aba 1", "content": "Conteúdo" }] } }` },
      { name: "Separator", icon: "➖", desc: "Linha divisória horizontal", snippet: `{ "component": "Separator", "props": { "orientation": "horizontal" } }` },
      { name: "Avatar", icon: "👤", desc: "Foto de perfil / ícone", snippet: `{ "component": "Avatar", "props": { "src": "/imagem.png", "alt": "Nome" } }` },
      { name: "Progress", icon: "📊", desc: "Barra de progresso", snippet: `{ "component": "Progress", "props": { "value": 60, "label": "Vagas restantes" } }` },
    ],
  },
  {
    category: "Aceternity UI",
    items: [
      { name: "Spotlight", icon: "🔦", desc: "Efeito spotlight no hover", snippet: `{ "component": "Spotlight", "props": { "fill": "#A67CFF" } }` },
      { name: "Typewriter", icon: "⌨️", desc: "Texto digitado animado", snippet: `{ "component": "TypewriterEffect", "props": { "words": [{ "text": "Texto" }] } }` },
      { name: "Shimmer Button", icon: "✨", desc: "Botão com shimmer animado", snippet: `{ "component": "ShimmerButton", "props": { "label": "Reservar", "shimmerColor": "#A67CFF" } }` },
      { name: "Bento Grid", icon: "⬜", desc: "Grid estilo bento assimétrico", snippet: `{ "component": "BentoGrid", "props": { "items": [{ "title": "Item", "description": "Desc" }] } }` },
      { name: "Moving Border", icon: "🌊", desc: "Borda animada girando", snippet: `{ "component": "MovingBorder", "props": { "children": "Conteúdo aqui" } }` },
      { name: "Lamp", icon: "💡", desc: "Efeito de luz tipo lâmpada", snippet: `{ "component": "LampContainer", "props": { "children": "Título aqui" } }` },
    ],
  },
];

export function ComponentGallery({ onInsert }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {COMPONENTS.map((cat) => (
        <div key={cat.category}>
          <p style={{ fontSize: 10, color: "#55526A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{cat.category}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {cat.items.map((item) => (
              <div
                key={item.name}
                style={{
                  background: "#16161F", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8, padding: "8px 10px",
                  display: "flex", alignItems: "center", gap: 10,
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#A67CFF")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#F0EEF8", margin: 0 }}>{item.name}</p>
                  <p style={{ fontSize: 10, color: "#55526A", margin: 0 }}>{item.desc}</p>
                </div>
                <button
                  onClick={() => onInsert(item.snippet)}
                  style={{
                    background: "rgba(166,124,255,0.12)", border: "1px solid rgba(166,124,255,0.25)",
                    color: "#A67CFF", borderRadius: 5, padding: "2px 8px",
                    fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0,
                  }}
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
