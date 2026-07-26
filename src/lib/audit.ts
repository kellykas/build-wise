import { supabase } from "@/integrations/supabase/client";

export type AuditPayload = {
  action: string;
  entity_type?: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Insert an audit log entry for the currently signed-in user.
 * Non-fatal: failures are logged but never thrown.
 */
export async function recordAudit(payload: AuditPayload): Promise<void> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, email")
      .eq("id", user.id)
      .maybeSingle();
    await supabase.from("audit_logs" as never).insert({
      company_id: profile?.company_id ?? null,
      actor_id: user.id,
      actor_email: (profile as { email?: string | null } | null)?.email ?? user.email ?? null,
      action: payload.action,
      entity_type: payload.entity_type ?? null,
      entity_id: payload.entity_id ?? null,
      metadata: payload.metadata ?? {},
    } as never);
  } catch (err) {
    console.warn("audit failed", err);
  }
}
