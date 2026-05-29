"use client";
import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";

interface Props {
  value: string;
  brandId: string;
  accept?: string;
  onChange: (url: string) => void;
  compact?: boolean;
}

export function ImageUploadField({
  value,
  brandId,
  accept = "image/*,video/*",
  onChange,
  compact = false,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [dragging,  setDragging]  = useState(false);
  const [error,     setError]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isImage = !!value && /\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?|$)/i.test(value);
  const isVideo = !!value && /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(value);

  async function uploadFile(file: File) {
    setUploading(true);
    setProgress(0);
    setError("");
    try {
      const slug     = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const pathname = `brands/${brandId}/uploads/${Date.now()}-${slug}`;

      // Upload direto browser → Vercel Blob (sem passar pelo servidor)
      // Sem limite de 4.5 MB — suporta vídeos grandes.
      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/admin/upload-token",
        onUploadProgress: ({ percentage }) => {
          setProgress(Math.round(percentage));
        },
      });

      onChange(blob.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  }

  const emptyH   = compact ? 44 : 72;
  const previewH = compact ? 56 : 100;
  const zoneH    = value ? previewH : emptyH;
  const border   = `2px dashed ${dragging ? "#A67CFF" : uploading ? "rgba(166,124,255,0.4)" : "rgba(255,255,255,0.1)"}`;
  const bg       = dragging ? "rgba(166,124,255,0.08)" : "rgba(255,255,255,0.02)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Área de upload — clique ou arraste um arquivo"
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={onDrop}
        style={{
          border,
          borderRadius: 8,
          cursor: uploading ? "wait" : "pointer",
          background: bg,
          overflow: "hidden",
          minHeight: zoneH,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "border-color 0.15s, background 0.15s",
          outline: "none",
        }}
      >
        {/* Image thumbnail */}
        {isImage && value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            style={{
              width: "100%",
              height: previewH,
              objectFit: "contain",
              display: "block",
              background: "rgba(0,0,0,0.15)",
            }}
          />
        )}

        {/* Video / generic file label */}
        {!isImage && value && (
          <div style={{ padding: "0 12px", fontSize: 11, color: "#8E8AA8", textAlign: "center" }}>
            {isVideo ? "🎥" : "📎"}&nbsp;
            {value.split("/").pop()?.slice(0, 44)}
          </div>
        )}

        {/* Empty state */}
        {!value && !uploading && (
          <div style={{ textAlign: "center", padding: "4px 12px", pointerEvents: "none" }}>
            <div style={{ fontSize: compact ? 14 : 18, marginBottom: 3, color: "#3A3850" }}>↑</div>
            <div style={{ fontSize: compact ? 10 : 11, color: "#55526A", lineHeight: 1.3 }}>
              {dragging ? "Solte aqui" : "Clique ou arraste um arquivo"}
            </div>
          </div>
        )}

        {/* Upload overlay com barra de progresso */}
        {uploading && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(13,13,18,0.82)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 8, padding: "0 16px",
          }}>
            <div style={{ fontSize: 11, color: "#A67CFF" }}>
              {progress > 0 ? `Enviando… ${progress}%` : "Preparando…"}
            </div>
            <div style={{
              width: "100%", height: 4,
              background: "rgba(166,124,255,0.15)",
              borderRadius: 2, overflow: "hidden",
            }}>
              <div style={{
                width: `${progress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #8E6FB8, #C9A7F5)",
                borderRadius: 2,
                transition: "width 0.2s ease",
              }} />
            </div>
          </div>
        )}

        {/* Clear button */}
        {value && !uploading && (
          <button
            onClick={(e) => { e.stopPropagation(); onChange(""); setError(""); }}
            title="Remover arquivo"
            style={{
              position: "absolute", top: 4, right: 4,
              width: 20, height: 20, borderRadius: "50%",
              background: "rgba(0,0,0,0.65)", border: "none",
              color: "#fff", fontSize: 10, lineHeight: 1,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* URL text input */}
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setError(""); }}
        placeholder="Cole uma URL ou arraste um arquivo acima"
        style={{
          width: "100%", boxSizing: "border-box",
          background: "#16161F",
          border: `1px solid ${error ? "rgba(224,82,96,0.4)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 5,
          padding: "5px 9px",
          color: "#8E8AA8",
          fontSize: 11,
          outline: "none",
          fontFamily: "monospace",
        }}
      />

      {error && (
        <div style={{ fontSize: 10, color: "#E05260" }}>{error}</div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
}
