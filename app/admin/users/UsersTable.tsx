"use client";
import { useState } from "react";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  role: "admin" | "editor";
  created_at: string;
  last_sign_in_at: string | null;
}

interface Invite {
  id: string;
  email: string;
  role: "admin" | "editor";
  created_at: string;
  expires_at: string | null;
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

const tdStyle: React.CSSProperties = {
  padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)",
  fontSize: 13, color: "#C4BFDE", verticalAlign: "middle",
};

const inp: React.CSSProperties = {
  background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6, padding: "8px 12px", color: "#F0EEF8", fontSize: 13,
  outline: "none", fontFamily: "inherit",
};

export function UsersTable({ profiles: initial, initialInvites, currentUserId }: {
  profiles: Profile[];
  initialInvites: Invite[];
  currentUserId: string;
}) {
  const [profiles, setProfiles] = useState<Profile[]>(initial);
  const [invites,  setInvites]  = useState<Invite[]>(initialInvites);
  const [busy,     setBusy]     = useState<string | null>(null);
  const [error,    setError]    = useState("");
  const [confirm,  setConfirm]  = useState<string | null>(null);

  // invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole,  setInviteRole]  = useState<"admin" | "editor">("editor");
  const [inviteBusy,  setInviteBusy]  = useState(false);
  const [inviteOk,    setInviteOk]    = useState("");

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

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteBusy(true); setError(""); setInviteOk("");
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, inviteRole }),
      });
      if (!res.ok) throw new Error(await res.text());
      setInviteOk(`Convite enviado para ${inviteEmail}.`);
      setInvites((prev) => [
        { id: crypto.randomUUID(), email: inviteEmail, role: inviteRole, created_at: new Date().toISOString(), expires_at: null },
        ...prev,
      ]);
      setInviteEmail("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar convite.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function cancelInvite(inv: Invite) {
    setBusy(inv.id); setError("");
    try {
      const res = await fetch(`/api/admin/invites/${inv.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setInvites((prev) => prev.filter((i) => i.id !== inv.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao cancelar convite.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>

      {/* Formulário de convite */}
      <div>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "#F0EEF8", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Convidar usuário
        </h2>

        {error && (
          <div style={{ background: "rgba(224,82,96,0.1)", border: "1px solid rgba(224,82,96,0.25)", borderRadius: 7, padding: "10px 14px", fontSize: 12, color: "#E05260", marginBottom: 14 }}>
            {error}
          </div>
        )}
        {inviteOk && (
          <div style={{ background: "rgba(52,168,83,0.1)", border: "1px solid rgba(52,168,83,0.25)", borderRadius: 7, padding: "10px 14px", fontSize: 12, color: "#34A853", marginBottom: 14 }}>
            {inviteOk}
          </div>
        )}

        <form onSubmit={sendInvite} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: "1 1 240px" }}>
            <label style={{ fontSize: 11, color: "#55526A", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>E-mail</label>
            <input
              type="email"
              required
              placeholder="usuario@email.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={{ ...inp, width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 11, color: "#55526A", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "editor")}
              style={{ ...inp, cursor: "pointer" }}
            >
              <option value="editor">editor</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={inviteBusy}
            style={{
              background: "rgba(166,124,255,0.15)", border: "1px solid rgba(166,124,255,0.3)",
              borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600,
              color: inviteBusy ? "#55526A" : "#A67CFF", cursor: inviteBusy ? "default" : "pointer",
              transition: "background 0.12s",
            }}
          >
            {inviteBusy ? "Enviando…" : "Enviar convite"}
          </button>
        </form>

        <p style={{ fontSize: 11, color: "#3A3750", marginTop: 10, lineHeight: 1.5 }}>
          O convidado poderá fazer login com a conta Google vinculada a esse e-mail.
        </p>
      </div>

      {/* Convites pendentes */}
      {invites.length > 0 && (
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "#F0EEF8", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Convites pendentes
            <span style={{ marginLeft: 8, fontSize: 11, color: "#55526A", fontWeight: 400, textTransform: "none" }}>
              ({invites.length})
            </span>
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["E-mail", "Role", "Status", "Enviado em", ""].map((h) => (
                  <th key={h} style={{ ...tdStyle, fontSize: 10, color: "#55526A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", padding: "8px 16px" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => {
                const isBusy  = busy === inv.id;
                const expired = inv.expires_at ? new Date(inv.expires_at) < new Date() : false;
                return (
                  <tr key={inv.id} style={{ opacity: isBusy ? 0.5 : 1, transition: "opacity 0.15s" }}>
                    <td style={{ ...tdStyle, color: expired ? "#55526A" : "#8E8AA8" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                          background: "rgba(142,138,168,0.08)", border: "1px solid rgba(142,138,168,0.15)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 700, color: "#55526A",
                        }}>
                          {inv.email[0]?.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 13 }}>{inv.email}</div>
                      </div>
                    </td>
                    <td style={tdStyle}><span style={pill(inv.role)}>{inv.role}</span></td>
                    <td style={tdStyle}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                        letterSpacing: "0.06em", textTransform: "uppercase",
                        background: expired ? "rgba(224,82,96,0.1)" : "rgba(251,191,36,0.1)",
                        color:      expired ? "#E05260"              : "#FBB924",
                        border:     `1px solid ${expired ? "rgba(224,82,96,0.25)" : "rgba(251,191,36,0.25)"}`,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
                        {expired ? "Expirado" : "Aguardando aceite"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: "#55526A", fontSize: 12 }}>
                      <div>{new Date(inv.created_at).toLocaleDateString("pt-BR")}</div>
                      {inv.expires_at && (
                        <div style={{ fontSize: 11, color: expired ? "#E05260" : "#3A3750" }}>
                          expira {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <ActionBtn onClick={() => cancelInvite(inv)} disabled={isBusy} danger>
                        Cancelar
                      </ActionBtn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Usuários com acesso */}
      <div>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "#F0EEF8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Usuários com acesso
        </h2>
        <p style={{ fontSize: 12, color: "#55526A", marginBottom: 16, lineHeight: 1.6 }}>
          O role <strong style={{ color: "#A67CFF" }}>admin</strong> pode publicar campanhas, editar marcas e gerenciar usuários.
          O role <strong style={{ color: "#8E8AA8" }}>editor</strong> pode salvar rascunhos.
        </p>

        {profiles.length === 0 ? (
          <p style={{ color: "#55526A", fontSize: 13 }}>Nenhum usuário cadastrado ainda.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Usuário", "Role", "Desde", "Último acesso", ""].map((h) => (
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

                    <td style={{ ...tdStyle, fontSize: 12 }}>
                      {p.last_sign_in_at ? (
                        <>
                          <div style={{ color: "#C4BFDE" }}>
                            {new Date(p.last_sign_in_at).toLocaleDateString("pt-BR")}
                          </div>
                          <div style={{ color: "#55526A", fontSize: 11 }}>
                            {new Date(p.last_sign_in_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: "#3A3750" }}>—</span>
                      )}
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
