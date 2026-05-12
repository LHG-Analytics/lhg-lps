"use client";

interface Props { onInsert: (snippet: string) => void; }

const EFFECTS = [
  {
    category: "Entrada / Reveal",
    items: [
      { name: "Fade Up", icon: "⬆️", desc: "Sobe suavemente ao aparecer", css: ".reveal { opacity:0; transform:translateY(24px); transition:opacity 0.6s, transform 0.6s; } .revealed { opacity:1; transform:none; }" },
      { name: "Fade In", icon: "👁", desc: "Aparece do transparente", css: ".reveal { opacity:0; transition:opacity 0.8s; } .revealed { opacity:1; }" },
      { name: "Scale In", icon: "🔍", desc: "Cresce ao aparecer", css: ".reveal { opacity:0; transform:scale(0.92); transition:opacity 0.5s, transform 0.5s; } .revealed { opacity:1; transform:scale(1); }" },
      { name: "Slide Left", icon: "⬅️", desc: "Desliza da direita", css: ".reveal { opacity:0; transform:translateX(40px); transition:opacity 0.6s, transform 0.6s; } .revealed { opacity:1; transform:none; }" },
    ],
  },
  {
    category: "Background",
    items: [
      { name: "Gradient Mesh", icon: "🎨", desc: "Gradiente animado em malha", css: "@keyframes mesh { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} } .mesh { background:linear-gradient(270deg,#A67CFF,#2EB87A,#FF0FFB); background-size:400% 400%; animation:mesh 8s ease infinite; }" },
      { name: "Noise Texture", icon: "🌫", desc: "Grain/ruído sobre fundo", css: ".noise::after { content:''; position:absolute; inset:0; background-image:url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\"); pointer-events:none; }" },
      { name: "Aurora", icon: "🌈", desc: "Aurora boreal animada", css: "@keyframes aurora { 0%{transform:translate(-50%,-50%) rotate(0deg)} 100%{transform:translate(-50%,-50%) rotate(360deg)} } .aurora::before { content:''; position:absolute; width:200%; height:200%; background:conic-gradient(from 0deg,transparent 0%,#A67CFF 20%,transparent 40%); animation:aurora 12s linear infinite; opacity:0.15; border-radius:50%; }" },
      { name: "Dots Grid", icon: "⬛", desc: "Grid de pontos no fundo", css: ".dots { background-image:radial-gradient(rgba(166,124,255,0.3) 1px,transparent 1px); background-size:24px 24px; }" },
    ],
  },
  {
    category: "Hover / Interação",
    items: [
      { name: "Glow on Hover", icon: "💜", desc: "Brilho roxo no hover", css: ".glow:hover { box-shadow:0 0 32px rgba(166,124,255,0.4); transition:box-shadow 0.3s; }" },
      { name: "Lift Card", icon: "🃏", desc: "Card sobe no hover", css: ".lift { transition:transform 0.2s, box-shadow 0.2s; } .lift:hover { transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,0,0,0.4); }" },
      { name: "Neon Border", icon: "🟣", desc: "Borda neon pulsante", css: "@keyframes neon { 0%,100%{box-shadow:0 0 8px #A67CFF,0 0 24px #A67CFF} 50%{box-shadow:0 0 16px #A67CFF,0 0 48px #A67CFF} } .neon { animation:neon 2s ease-in-out infinite; border:1px solid #A67CFF; }" },
      { name: "Shimmer", icon: "✨", desc: "Brilho passando no hover", css: ".shimmer { position:relative; overflow:hidden; } .shimmer::after { content:''; position:absolute; inset:0; background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.12) 50%,transparent 60%); transform:translateX(-100%); transition:transform 0.5s; } .shimmer:hover::after { transform:translateX(100%); }" },
    ],
  },
  {
    category: "Texto",
    items: [
      { name: "Gradient Text", icon: "🌊", desc: "Texto com gradiente colorido", css: ".gradient-text { background:linear-gradient(135deg,#A67CFF,#2EB87A); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }" },
      { name: "Typewriter", icon: "⌨️", desc: "Efeito de digitação", css: "@keyframes type { from{width:0} to{width:100%} } .typewriter { overflow:hidden; white-space:nowrap; border-right:2px solid #A67CFF; animation:type 2s steps(30,end), blink 0.8s step-end infinite alternate; } @keyframes blink { from{border-color:transparent} to{border-color:#A67CFF} }" },
    ],
  },
];

export function EffectGallery({ onInsert }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {EFFECTS.map((cat) => (
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
                  <p style={{ fontSize: 10, color: "#55526A", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.desc}</p>
                </div>
                <button
                  onClick={() => onInsert(JSON.stringify({ type: "css-effect", name: item.name, css: item.css }, null, 2))}
                  style={{
                    background: "rgba(46,184,122,0.12)", border: "1px solid rgba(46,184,122,0.25)",
                    color: "#2EB87A", borderRadius: 5, padding: "2px 8px",
                    fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0,
                  }}
                >
                  CSS
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
