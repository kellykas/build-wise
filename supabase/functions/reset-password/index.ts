import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROLES = [
  "super_admin",
  "company_owner",
  "director",
  "project_manager",
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = userData.user.id;

    // Caller must belong to a company workspace
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", callerId)
      .maybeSingle();

    if (!callerProfile?.company_id) {
      return new Response(
        JSON.stringify({ error: "Your account is not linked to a company workspace." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Caller must have password-reset rights
    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const canResetPasswords = (callerRoles ?? []).some((r: { role: string }) =>
      ALLOWED_ROLES.includes(r.role)
    );

    if (!canResetPasswords) {
      return new Response(
        JSON.stringify({ error: "You do not have permission to reset passwords." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const userId = String(body?.userId ?? "");
    const newPassword = String(body?.newPassword ?? "");

    if (!UUID_RE.test(userId)) {
      return new Response(
        JSON.stringify({ error: "userId invalide." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: "Le mot de passe doit contenir au moins 8 caractères." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Target must be a client or employee of the same company
    const { data: targetRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("company_id", callerProfile.company_id);

    const isTargetInCompany = (targetRoles ?? []).some((r: { role: string }) =>
      r.role === "client" || r.role === "employee"
    );

    if (!isTargetInCompany) {
      return new Response(
        JSON.stringify({ error: "You can only reset passwords for clients and employees." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Reset the password via the admin API (service role)
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );
    if (updateError) {
      throw new Error(updateError.message);
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      company_id: callerProfile.company_id,
      actor_id: callerId,
      actor_email: userData.user.email ?? null,
      action: "user.password_reset",
      entity_type: "user",
      entity_id: userId,
      metadata: { reset_at: new Date().toISOString() },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});