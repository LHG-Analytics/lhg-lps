import type { SupabaseClient } from "@supabase/supabase-js";

interface AuditEntry {
  action: string;
  entityType: "campaign" | "brand";
  entityId: string;
  entityLabel?: string;
  details?: Record<string, unknown>;
}

export async function logAudit(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string | undefined,
  entry: AuditEntry
) {
  // Fire-and-forget — erros de log não bloqueiam a operação principal
  try {
    await supabase.from("audit_logs").insert({
      user_id:      userId,
      user_email:   userEmail,
      action:       entry.action,
      entity_type:  entry.entityType,
      entity_id:    entry.entityId,
      entity_label: entry.entityLabel,
      details:      entry.details ?? null,
    });
  } catch { /* não propaga */ }
}
