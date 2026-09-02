"use client";
import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useRouter } from "next/navigation";

const pill: React.CSSProperties = {
  background: "none",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 5,
  padding: "3px 9px",
  fontSize: 11,
  cursor: "pointer",
  color: "#8E8AA8",
  whiteSpace: "nowrap",
  lineHeight: 1.4,
};

/* ── Modal de exclusão definitiva ───────────────────── */

function DeleteModal({ slug, working, error, onConfirm, onClose }: {
  slug: string;
  working: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.74)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget && !working) onClose(); }}
    >
      <div style={{ background: "#13121A", border: "1px solid rgba(224,82,96,0.28)", borderRadius: 12, padding: 22, width: 380, display: "flex", flexDirection: "column", gap: 13 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#F0EEF8" }}>Excluir permanentemente</div>

        <p style={{ fontSize: 12, color: "#A8A0BE", margin: 0, lineHeight: 1.55 }}>
          A campanha <strong style={{ color: "#F0EEF8", fontFamily: "monospace" }}>{slug}</strong>{" "}
          será <strong style={{ color: "#E05260" }}>apagada do banco de dados</strong>, junto com todo
          o seu histórico de versões.
        </p>

        <div style={{ fontSize: 11, color: "#8E8AA8", background: "rgba(224,82,96,0.07)", border: "1px solid rgba(224,82,96,0.18)", borderRadius: 6, padding: "9px 11px", lineHeight: 1.5 }}>
          Não há como desfazer. Se quiser apenas tirar da listagem mantendo os dados,
          use <strong style={{ color: "#F0EEF8" }}>Arquivar</strong>.
        </div>

        {error && <div style={{ fontSize: 11, color: "#E05260" }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
          <button
            onClick={onClose}
            disabled={working}
            style={{ flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 0", color: "#8E8AA8", fontSize: 12, cursor: working ? "default" : "pointer", fontWeight: 600 }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={working}
            style={{ flex: 1, background: working ? "#8E3340" : "#E05260", color: "#fff", border: "none", borderRadius: 6, padding: "8px 0", fontSize: 12, fontWeight: 700, cursor: working ? "wait" : "pointer" }}
          >
            {working ? "Excluindo…" : "Excluir do banco"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── CampaignRowActions ─────────────────────────────── */

export function CampaignRowActions({
  id,
  brandId,
  slug,
  status,
}: {
  id: string;
  brandId: string;
  slug: string;
  status: string;
}) {
  const router  = useRouter();
  const [working, setWorking] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delError, setDelError] = useState("");

  async function duplicate() {
    setWorking(true);
    try {
      const newSlug = `${slug}-copia-${Date.now().toString(36)}`;
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: id, slug: newSlug }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { id: newId } = (await res.json()) as { id: string };
      router.push(`/admin/campaigns/${newId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao duplicar");
      setWorking(false);
    }
  }

  /** Arquiva: sai da operação mas a linha e o histórico continuam no banco. */
  async function archive() {
    if (!confirm(`Arquivar "${slug}"? Os dados continuam no banco e a campanha pode ser reaberta depois.`)) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao arquivar");
    } finally {
      setWorking(false);
    }
  }

  /** Exclusão definitiva: apaga a linha (e os snapshots, por cascade). */
  async function deletePermanently() {
    setWorking(true); setDelError("");
    try {
      const res = await fetch(`/api/admin/campaigns/${id}?permanent=true`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setDelOpen(false);
      router.refresh();
    } catch (e) {
      setDelError(e instanceof Error ? e.message : "Erro ao excluir");
    } finally {
      setWorking(false);
    }
  }

  async function toggleStatus() {
    const next = status === "published" ? "draft" : "published";
    if (status === "published" && !confirm("Despublicar esta campanha?")) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao atualizar status");
    } finally {
      setWorking(false);
    }
  }

  const isPublished = status === "published";
  const isArchived  = status === "archived";

  return (
    <>
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
        <Link
          href={`/admin/preview/${brandId}/${slug}` as Route}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...pill, textDecoration: "none" }}
          title="Abrir preview em nova aba"
        >
          Preview
        </Link>

        <button
          onClick={duplicate}
          disabled={working}
          style={{ ...pill, opacity: working ? 0.5 : 1 }}
          title="Criar uma cópia desta campanha"
        >
          Duplicar
        </button>

        <button
          onClick={toggleStatus}
          disabled={working}
          style={{
            ...pill,
            color:       isPublished ? "#E05260" : "#2EB87A",
            borderColor: isPublished ? "rgba(224,82,96,0.3)" : "rgba(46,184,122,0.3)",
            opacity: working ? 0.5 : 1,
          }}
          title={isPublished ? "Mover de volta para rascunho" : "Publicar esta campanha"}
        >
          {isPublished ? "Despublicar" : "Publicar"}
        </button>

        {/* Arquivar só faz sentido enquanto não está arquivada */}
        {!isPublished && !isArchived && (
          <button
            onClick={archive}
            disabled={working}
            style={{ ...pill, opacity: working ? 0.5 : 1 }}
            title="Tirar da operação mantendo os dados no banco"
          >
            Arquivar
          </button>
        )}

        {/* Publicada não é excluível: despublicar primeiro */}
        {!isPublished && (
          <button
            onClick={() => { setDelError(""); setDelOpen(true); }}
            disabled={working}
            style={{ ...pill, color: "#E05260", borderColor: "rgba(224,82,96,0.25)", opacity: working ? 0.5 : 1 }}
            title="Apagar do banco de dados, sem volta"
          >
            Excluir
          </button>
        )}
      </div>

      {delOpen && (
        <DeleteModal
          slug={slug}
          working={working}
          error={delError}
          onConfirm={deletePermanently}
          onClose={() => setDelOpen(false)}
        />
      )}
    </>
  );
}
