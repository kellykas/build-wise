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
  "hr_manager",
];

const ROLE_ENUM = [
  "super_admin",
  "company_owner",
  "director",
  "project_manager",
  "site_engineer",
  "accountant",
  "hr_manager",
  "procurement_officer",
  "store_manager",
  "employee",
  "client",
];

function normalizeEmail(email: string): string {
  return email
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

    // Caller must have user-management rights
    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const canManageUsers = (callerRoles ?? []).some((r: { role: string }) =>
      ALLOWED_ROLES.includes(r.role)
    );

    if (!canManageUsers) {
      return new Response(
        JSON.stringify({ error: "You do not have permission to create users." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const email = normalizeEmail(String(body?.email ?? ""));
    const password = String(body?.password ?? "");
    const fullName = String(body?.fullName ?? "").trim();
    const phone = body?.phone ? String(body.phone) : null;
    const role = String(body?.role ?? "");
    const employeeId = body?.employeeId ? String(body.employeeId) : "";
    const clientId = body?.clientId ? String(body.clientId) : "";

    // Validate input (mirrors the server-fn zod schema)
    if (!EMAIL_RE.test(email)) {
      return new Response(
        JSON.stringify({ error: "Adresse e-mail invalide — les accents ne sont pas acceptés (ex. ingenieur@… au lieu de ingénieur@…)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Le mot de passe doit contenir au moins 8 caractères." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (fullName.length < 2) {
      return new Response(
        JSON.stringify({ error: "Le nom complet doit contenir au moins 2 caractères." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!ROLE_ENUM.includes(role)) {
      return new Response(
        JSON.stringify({ error: "Rôle invalide." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (employeeId && !UUID_RE.test(employeeId)) {
      return new Response(
        JSON.stringify({ error: "Lien employé invalide." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (clientId && !UUID_RE.test(clientId)) {
      return new Response(
        JSON.stringify({ error: "Lien client invalide." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const companyId = callerProfile.company_id;

    // Create the auth user
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createError) {
      throw new Error(createError.message);
    }
    if (!created?.user) {
      throw new Error("The user account could not be created.");
    }

    const userId = created.user.id;

    // Profile
    const { error: profileUpsertError } = await supabase.from("profiles").upsert({
      id: userId,
      company_id: companyId,
      full_name: fullName,
      email,
      phone,
    });
    if (profileUpsertError) throw new Error(profileUpsertError.message);

    // Role
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      company_id: companyId,
      role,
    });
    if (roleError) throw new Error(roleError.message);

    // Link employee record
    if (employeeId) {
      const { error } = await supabase
        .from("employees")
        .update({ user_id: userId, email })
        .eq("id", employeeId)
        .eq("company_id", companyId);
      if (error) throw new Error(error.message);
    }

    // Link or create client record
    if (role === "client") {
      if (clientId) {
        const { error } = await supabase
          .from("clients")
          .update({ user_id: userId, email })
          .eq("id", clientId)
          .eq("company_id", companyId);
        if (error) throw new Error(error.message);
      } else {
        const { error: clientError } = await supabase.from("clients").insert({
          company_id: companyId,
          user_id: userId,
          name: fullName,
          email,
          phone,
        });
        if (clientError) throw new Error(clientError.message);
      }
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      company_id: companyId,
      actor_id: callerId,
      actor_email: userData.user.email ?? null,
      action: "user.create",
      entity_type: "user",
      entity_id: userId,
      metadata: {
        email,
        full_name: fullName,
        role,
        linked_employee_id: employeeId || null,
        linked_client_id: clientId || null,
      },
    });

    return new Response(JSON.stringify({ id: userId, email }), {
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