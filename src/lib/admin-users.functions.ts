import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({
    userId: z.string().uuid(),
    newPassword: z.string().min(8),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: callerProfile, error: profileError } = await context.supabase
      .from("profiles")
      .select("company_id")
      .eq("id", context.userId)
      .maybeSingle();

    if (profileError || !callerProfile?.company_id) {
      throw new Error("Your account is not linked to a company workspace.");
    }

    const { data: callerRoles, error: rolesError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (rolesError) throw rolesError;

    const canResetPasswords = (callerRoles ?? []).some((row) =>
      ["super_admin", "company_owner", "director", "project_manager"].includes(String(row.role)),
    );

    if (!canResetPasswords) {
      throw new Error("You do not have permission to reset passwords.");
    }

    // Verify the target user belongs to the same company
    const { data: targetRoles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);

    const isTargetInCompany = (targetRoles ?? []).some((row) =>
      row.role === "client" || row.role === "employee"
    );

    if (!isTargetInCompany) {
      throw new Error("You can only reset passwords for clients and employees.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Reset the password via Supabase admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      data.userId,
      { password: data.newPassword }
    );

    if (updateError) throw updateError;

    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      company_id: callerProfile.company_id,
      actor_id: context.userId,
      actor_email: (context.claims as { email?: string } | null)?.email ?? null,
      action: "user.password_reset",
      entity_type: "user",
      entity_id: data.userId,
      metadata: { reset_at: new Date().toISOString() },
    });

    return { success: true };
  });

export const createCompanyUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(2),
    phone: z.string().optional(),
    role: z.enum(["super_admin", "company_owner", "director", "project_manager", "site_engineer", "accountant", "hr_manager", "procurement_officer", "store_manager", "employee", "client"]),
    employeeId: z.string().uuid().optional().or(z.literal("")),
    clientId: z.string().uuid().optional().or(z.literal("")),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: callerProfile, error: profileError } = await context.supabase
      .from("profiles")
      .select("company_id")
      .eq("id", context.userId)
      .maybeSingle();

    if (profileError || !callerProfile?.company_id) {
      throw new Error("Your account is not linked to a company workspace.");
    }

    const { data: callerRoles, error: rolesError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (rolesError) throw rolesError;

    const canManageUsers = (callerRoles ?? []).some((row) =>
      ["super_admin", "company_owner", "director", "hr_manager"].includes(String(row.role)),
    );

    if (!canManageUsers) {
      throw new Error("You do not have permission to create users.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });

    if (createError) throw createError;
    if (!created.user) throw new Error("The user account could not be created.");

    const userId = created.user.id;
    const companyId = callerProfile.company_id;

    const { error: profileUpsertError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      company_id: companyId,
      full_name: data.fullName,
      email: data.email,
      phone: data.phone || null,
    });
    if (profileUpsertError) throw profileUpsertError;

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      company_id: companyId,
      role: data.role,
    });
    if (roleError) throw roleError;

    if (data.employeeId) {
      const { error } = await supabaseAdmin
        .from("employees")
        .update({ user_id: userId, email: data.email })
        .eq("id", data.employeeId)
        .eq("company_id", companyId);
      if (error) throw error;
    }

    if (data.clientId) {
      const { error } = await supabaseAdmin
        .from("clients")
        .update({ user_id: userId, email: data.email })
        .eq("id", data.clientId)
        .eq("company_id", companyId);
      if (error) throw error;
    }

    await supabaseAdmin.from("audit_logs").insert({
      company_id: companyId,
      actor_id: context.userId,
      actor_email: (context.claims as { email?: string } | null)?.email ?? null,
      action: "user.create",
      entity_type: "user",
      entity_id: userId,
      metadata: {
        email: data.email,
        full_name: data.fullName,
        role: data.role,
        linked_employee_id: data.employeeId || null,
        linked_client_id: data.clientId || null,
      },
    });

    return { id: userId, email: data.email };
  });