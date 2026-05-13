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

  return (
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
    </div>
  );
}
