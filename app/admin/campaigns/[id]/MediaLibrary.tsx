"use client";
import { useState, useEffect } from "react";

interface BlobItem {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  brandId: string;
  onSelect?: (url: string) => void;
}

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isImage(url: string) {
  return /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i.test(url);
}

export function MediaLibrary({ open, onClose, brandId, onSelect }: Props) {
  const [items, setItems]         = useState<BlobItem[]>([]);
  const [loading, setLoading]     = useState(false);
  const [unavailable, setUnavail] = useState(false);
  const [copied, setCopied]       = useState("");
  const [filter, setFilter]       = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/admin/media?brandId=${encodeURIComponent(brandId)}`)
      .then((r) => r.json() as Promise<{ items: BlobItem[]; unavailable?: boolean }>)
      .then(({ items: blobs, unavailable: ua }) => {
        setItems(blobs);
        setUnavail(ua ?? false);
      })
      .catch(() => setUnavail(true))
      .finally(() => setLoading(false));
  }, [open, brandId]);

  if (!open) return null;

  const visible = filter
    ? items.filter((i) => i.pathname.toLowerCase().includes(filter.toLowerCase()))
    : items;

  function copy(url: string) {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(url);
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#13121A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, width: "100%", maxWidth: 720, maxHeight: "88vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 15 }}>🖼</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#F0EEF8" }}>Biblioteca de mídia</span>
          <span style={{ fontSize: 11, color: "#55526A", fontFamily: "monospace" }}>{brandId}</span>
          <div style={{ flex: 1 }} />
          <input
            type="text"
            placeholder="Filtrar…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ background: "#16161F", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "5px 10px", color: "#F0EEF8", fontSize: 12, outline: "none", width: 160 }}
          />
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#55526A", cursor: "pointer", fontSize: 15, padding: "0 4px" }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {loading && (
            <div style={{ textAlign: "center", color: "#55526A", fontSize: 13, padding: 32 }}>Carregando…</div>
          )}

          {!loading && unavailable && (
            <div style={{ background: "rgba(255,200,0,0.06)", border: "1px solid rgba(255,200,0,0.15)", borderRadius: 8, padding: "14px 16px", fontSize: 12, color: "#C8A03A", lineHeight: 1.6 }}>
              Biblioteca de mídia indisponível — <code>BLOB_READ_WRITE_TOKEN</code> não configurado nas env vars do projeto Vercel.
            </div>
          )}

          {!loading && !unavailable && visible.length === 0 && (
            <div style={{ textAlign: "center", color: "#55526A", fontSize: 13, padding: 32 }}>
              {filter ? `Nenhum arquivo para "${filter}"` : "Nenhum arquivo enviado ainda."}
            </div>
          )}

          {!loading && visible.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              {visible.map((item) => (
                <div
                  key={item.url}
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(166,124,255,0.4)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                >
                  {/* Thumbnail */}
                  <div style={{ height: 90, background: "#0D0D12", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                    {isImage(item.url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 28, opacity: 0.4 }}>🎞</span>
                    )}
                  </div>

                  {/* Info + actions */}
                  <div style={{ padding: "8px 8px 6px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ fontSize: 10, color: "#8E8AA8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.pathname}>
                      {item.pathname.split("/").pop()}
                    </div>
                    <div style={{ fontSize: 9, color: "#3A3850" }}>{fmt(item.size)}</div>
                    <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                      <button
                        onClick={() => copy(item.url)}
                        style={{ flex: 1, background: copied === item.url ? "rgba(46,184,122,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${copied === item.url ? "rgba(46,184,122,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 4, padding: "3px 0", fontSize: 9, color: copied === item.url ? "#2EB87A" : "#8E8AA8", cursor: "pointer", fontWeight: 600 }}
                      >
                        {copied === item.url ? "✓ Copiado" : "Copiar URL"}
                      </button>
                      {onSelect && (
                        <button
                          onClick={() => { onSelect(item.url); onClose(); }}
                          style={{ flex: 1, background: "rgba(166,124,255,0.12)", border: "1px solid rgba(166,124,255,0.25)", borderRadius: 4, padding: "3px 0", fontSize: 9, color: "#C4AEFF", cursor: "pointer", fontWeight: 600 }}
                        >
                          Usar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !unavailable && (
          <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: "#55526A" }}>{visible.length} arquivo{visible.length !== 1 ? "s" : ""}</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: "#3A3850" }}>Arquivos enviados via Vercel Blob · brands/{brandId}/uploads/</span>
          </div>
        )}
      </div>
    </div>
  );
}
