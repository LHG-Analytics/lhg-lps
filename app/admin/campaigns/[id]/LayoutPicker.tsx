"use client";

interface Props { onInsert: (snippet: string) => void; }

const LAYOUTS = [
  {
    label: "Hero + CTA",
    desc: "Imagem de fundo, título e botão centralizado",
    wireframe: `<div style="display:flex;flex-direction:column;gap:4px;height:80px">
      <div style="flex:1;background:rgba(166,124,255,0.2);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#A67CFF">HERO</div>
      <div style="height:16px;background:rgba(166,124,255,0.5);border-radius:4px;width:60%;margin:0 auto"></div>
    </div>`,
    snippet: JSON.stringify({ type: "hero", props: { headlineFull: "Título Principal", headlineEmphasis: "", sub: "Subtítulo da seção", video: "", poster: "" } }, null, 2),
  },
  {
    label: "2 Colunas",
    desc: "Conteúdo lado a lado com imagem",
    wireframe: `<div style="display:flex;gap:4px;height:80px">
      <div style="flex:1;background:rgba(166,124,255,0.15);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#A67CFF">TEXTO</div>
      <div style="flex:1;background:rgba(166,124,255,0.3);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#A67CFF">IMAGEM</div>
    </div>`,
    snippet: JSON.stringify({ type: "benefits", props: { headline: "Título", items: [{ icon: "✦", title: "Item 1", body: "Descrição" }, { icon: "✦", title: "Item 2", body: "Descrição" }] } }, null, 2),
  },
  {
    label: "Grid de Cards",
    desc: "3 cards lado a lado",
    wireframe: `<div style="display:flex;gap:4px;height:80px">
      ${[1,2,3].map(() => `<div style="flex:1;background:rgba(166,124,255,0.15);border-radius:4px"></div>`).join("")}
    </div>`,
    snippet: JSON.stringify({ type: "benefits", props: { headline: "Benefícios", columns: 3, items: [{ icon: "✦", title: "Card 1", body: "" }, { icon: "✦", title: "Card 2", body: "" }, { icon: "✦", title: "Card 3", body: "" }] } }, null, 2),
  },
  {
    label: "Nav + Hero + Footer",
    desc: "Estrutura completa de página",
    wireframe: `<div style="display:flex;flex-direction:column;gap:3px;height:80px">
      <div style="height:12px;background:rgba(166,124,255,0.4);border-radius:3px"></div>
      <div style="flex:1;background:rgba(166,124,255,0.15);border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#A67CFF">HERO</div>
      <div style="height:12px;background:rgba(166,124,255,0.25);border-radius:3px"></div>
    </div>`,
    snippet: JSON.stringify({ type: "nav", props: { logoSrc: "", links: [] } }, null, 2),
  },
  {
    label: "Sidebar + Conteúdo",
    desc: "FAQ ou filtros à esquerda",
    wireframe: `<div style="display:flex;gap:4px;height:80px">
      <div style="width:28%;background:rgba(166,124,255,0.3);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#A67CFF">SIDE</div>
      <div style="flex:1;display:flex;flex-direction:column;gap:3px">
        ${[1,2,3].map(() => `<div style="flex:1;background:rgba(166,124,255,0.1);border-radius:3px"></div>`).join("")}
      </div>
    </div>`,
    snippet: JSON.stringify({ type: "faq", props: { headline: "Perguntas frequentes", items: [{ q: "Pergunta?", a: "Resposta." }] } }, null, 2),
  },
  {
    label: "Seção de Oferta",
    desc: "Preço destacado com CTA",
    wireframe: `<div style="display:flex;flex-direction:column;gap:4px;height:80px;align-items:center;justify-content:center">
      <div style="width:50%;height:24px;background:rgba(46,184,122,0.3);border-radius:4px"></div>
      <div style="width:35%;height:14px;background:rgba(166,124,255,0.5);border-radius:10px"></div>
    </div>`,
    snippet: JSON.stringify({ type: "offer", props: { headline: "Oferta especial", badge: "Lote 1", items: [] } }, null, 2),
  },
];

export function LayoutPicker({ onInsert }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ fontSize: 10, color: "#55526A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Estruturas de página</p>
      {LAYOUTS.map((l) => (
        <div
          key={l.label}
          style={{
            background: "#16161F", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10, overflow: "hidden", cursor: "pointer",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#A67CFF")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
        >
          {/* Wireframe */}
          <div
            style={{ padding: "10px 10px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            dangerouslySetInnerHTML={{ __html: l.wireframe }}
          />
          <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#F0EEF8", margin: 0 }}>{l.label}</p>
              <p style={{ fontSize: 10, color: "#55526A", margin: 0 }}>{l.desc}</p>
            </div>
            <button
              onClick={() => onInsert(l.snippet)}
              style={{
                background: "rgba(166,124,255,0.15)", border: "1px solid rgba(166,124,255,0.3)",
                color: "#A67CFF", borderRadius: 6, padding: "3px 10px",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}
            >
              + Inserir
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
