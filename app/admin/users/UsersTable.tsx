"use client";
import { useState } from "react";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  role: "admin" | "editor";
  created_at: string;
}

const pill = (role: "admin" | "editor"): React.CSSProperties => ({
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 99,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  background: role === "admin" ? "rgba(166,124,255,0.15)" : "rgba(142,138,168,0.1)",
  color:      role === "admin" ? "#A67CFF"                 : "#8E8AA8",
  border:     `1px solid ${role === "admin" ? "rgba(166,124,255,0.3)" : "rgba(142,138,168,0.15)"}`,
});

export function UsersTable({ profiles: initial, currentUserId }: {
  profiles: Profile[];
  currentUserId: string;
}) {
  const [profiles, setProfiles] = useState<Profile[]>(initial);
  const [busy,     setBusy]     = useState<string | null>(null);
  const [error,    setError]    = useState("");
  const [confirm,  setConfirm]  = useState<string | null>(null);

  async function toggleRole(p: Profile) {
    const newRole = p.role === "admin" ? "editor" : "admin";
    setBusy(p.id); setError("");
    try {
      const res = await fetch(`/api/admin/users/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newRole }),
      });
      if (!res.ok) throw new Error(await res.text());
      setProfiles((prev) => prev.map((u) => u.id === p.id ? { ...u, role: newRole } : u));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao alterar role.");
    } finally {
      setBusy(null);
    }
  }

  async function removeAccess(p: Profile) {
    setBusy(p.id); setError(""); setConfirm(null);
    try {
      const res = await fetch(`/api/admin/users/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setProfiles((prev) => prev.filter((u) => u.id !== p.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover acesso.");
    } finally {
      setBusy(null);
    }
  }

  const tdStyle: React.CSSProperties = {
    padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)",
    fontSize: 13, color: "#C4BFDE", verticalAlign: "middle",
  };

  return (
    <div>
      <p style={{ fontSize: 12, color: "#55526A", marginBottom: 20, lineHeight: 1.6 }}>
        Todos os usuários que acessaram o CMS aparecem aqui. O role <strong style={{ color: "#A67CFF" }}>admin</strong> pode publicar campanhas, editar marcas e gerenciar usuários. O role <strong style={{ color: "#8E8AA8" }}>editor</strong> pode salvar rascunhos.
        <br />
        Novos usuários são criados automaticamente com role <em>editor</em> no primeiro login via Google.
      </p>

      {error && (
        <div style={{ background: "rgba(224,82,96,0.1)", border: "1px solid rgba(224,82,96,0.25)", borderRadius: 7, padding: "10px 14px", fontSize: 12, color: "#E05260", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {profiles.length === 0 ? (
        <p style={{ color: "#55526A", fontSize: 13 }}>Nenhum usuário cadastrado ainda.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {["Usuário", "Role", "Desde", ""].map((h) => (
                <th key={h} style={{ ...tdStyle, fontSize: 10, color: "#55526A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", padding: "8px 16px" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => {
              const isMe   = p.id === currentUserId;
              const isBusy = busy === p.id;

              return (
                <tr key={p.id} style={{ opacity: isBusy ? 0.5 : 1, transition: "opacity 0.15s" }}>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        background: "rgba(166,124,255,0.15)", border: "1px solid rgba(166,124,255,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, color: "#A67CFF",
                      }}>
                        {(p.name ?? p.email ?? "?")[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, color: "#F0EEF8", fontWeight: 600 }}>
                          {p.name || "—"}
                          {isMe && <span style={{ fontSize: 10, color: "#55526A", marginLeft: 8, fontWeight: 400 }}>(você)</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#55526A" }}>{p.email ?? p.id.slice(0, 8) + "…"}</div>
                      </div>
                    </div>
                  </td>

                  <td style={tdStyle}>
                    <span style={pill(p.role)}>{p.role}</span>
                  </td>

                  <td style={{ ...tdStyle, color: "#55526A", fontSize: 12 }}>
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </td>

                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    {!isMe && (
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {confirm === p.id ? (
                          <>
                            <span style={{ fontSize: 11, color: "#E05260", marginRight: 4, alignSelf: "center" }}>Confirmar remoção?</span>
                            <ActionBtn onClick={() => removeAccess(p)} danger>Remover</ActionBtn>
                            <ActionBtn onClick={() => setConfirm(null)}>Cancelar</ActionBtn>
                          </>
                        ) : (
                          <>
                            <ActionBtn onClick={() => toggleRole(p)} disabled={isBusy}>
                              {p.role === "admin" ? "→ editor" : "→ admin"}
                            </ActionBtn>
                            <ActionBtn onClick={() => setConfirm(p.id)} disabled={isBusy} danger>
                              Remover
                            </ActionBtn>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ActionBtn({ children, onClick, danger, disabled }: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.borderColor = danger ? "rgba(224,82,96,0.5)" : "rgba(255,255,255,0.2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = danger ? "rgba(224,82,96,0.2)" : "rgba(255,255,255,0.08)"; }}
      style={{
        background: "transparent",
        border: `1px solid ${danger ? "rgba(224,82,96,0.2)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 5, padding: "4px 10px", fontSize: 11, fontWeight: 600,
        color: disabled ? "#2A2838" : danger ? "#E05260" : "#8E8AA8",
        cursor: disabled ? "default" : "pointer",
        transition: "border-color 0.12s",
      }}
    >
      {children}
    </button>
  );
}
