import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { notifyInvoiceDue } from "@/lib/notifications";

type ReminderSettings = {
  enabled: boolean;
  due_soon_days: number;
  overdue_first_days: number;
  overdue_followup_days: number;
  overdue_final_days: number;
  recipient_roles: string[];
};

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: true,
  due_soon_days: 3,
  overdue_first_days: 1,
  overdue_followup_days: 7,
  overdue_final_days: 30,
  recipient_roles: ["super_admin", "company_owner", "director", "accountant"],
};

/**
 * Fetch reminder settings for the current company.
 * Returns defaults if the table doesn't exist yet (migration not run).
 */
async function fetchReminderSettings(companyId: string): Promise<ReminderSettings> {
  try {
    const { data, error } = await supabase
      .from("reminder_settings" as never)
      .select("*" as never)
      .eq("company_id" as never, companyId)
      .maybeSingle();

    if (error || !data) return DEFAULT_SETTINGS;

    const row = data as unknown as ReminderSettings;
    return {
      enabled: row.enabled ?? true,
      due_soon_days: row.due_soon_days ?? 3,
      overdue_first_days: row.overdue_first_days ?? 1,
      overdue_followup_days: row.overdue_followup_days ?? 7,
      overdue_final_days: row.overdue_final_days ?? 30,
      recipient_roles: row.recipient_roles?.length ? row.recipient_roles : DEFAULT_SETTINGS.recipient_roles,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Automatically checks for overdue invoices and sends email reminders
 * via Knock. Runs once on mount, then only when explicitly triggered.
 *
 * Reads reminder intervals from the reminder_settings table (admin-configurable).
 * Deduplicates by checking the invoice_reminders table before sending.
 */
export function useInvoiceReminders() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const hasRun = useRef(false);

  const checkAndSendReminders = useCallback(async () => {
    if (!profile?.company_id) return;

    const settings = await fetchReminderSettings(profile.company_id);
    if (!settings.enabled) return;

    // Fetch all unpaid invoices (overdue or pending)
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, invoice_number, amount, due_date, status")
      .in("status", ["overdue", "pending"])
      .not("due_date", "is", null);

    if (!invoices?.length) return;

    const now = new Date();
    let remindersSent = 0;

    for (const inv of invoices) {
      const dueDate = new Date(inv.due_date!);
      const daysDiff = Math.floor((now.getTime() - dueDate.getTime()) / 86400000);

      // Determine reminder type based on configurable intervals
      let reminderType: string | null = null;

      if (daysDiff < 0 && daysDiff >= -settings.due_soon_days) {
        reminderType = "due_soon";
      } else if (daysDiff >= 0 && daysDiff <= settings.overdue_first_days) {
        reminderType = "overdue_first";
      } else if (
        daysDiff > settings.overdue_first_days &&
        daysDiff >= settings.overdue_followup_days &&
        daysDiff < settings.overdue_followup_days + 7
      ) {
        reminderType = "overdue_followup";
      } else if (
        daysDiff >= settings.overdue_final_days &&
        daysDiff < settings.overdue_final_days + 7
      ) {
        reminderType = "overdue_final";
      }

      if (!reminderType) continue;

      // Check if we already sent this reminder type for this invoice
      const { data: existing } = await supabase
        .from("invoice_reminders" as never)
        .select("id" as never)
        .eq("invoice_id" as never, inv.id)
        .eq("reminder_type" as never, reminderType)
        .maybeSingle();

      if (existing) continue;

      // Get recipients based on configured roles
      const { data: recipients } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", settings.recipient_roles as never);

      if (!recipients?.length) continue;

      for (const recipient of recipients) {
        await notifyInvoiceDue({
          companyId: profile.company_id!,
          senderId: null,
          recipientId: recipient.user_id,
          invoiceNumber: inv.invoice_number as string,
          amount: Number(inv.amount),
          dueDate: inv.due_date as string,
          daysOverdue: daysDiff > 0 ? daysDiff : undefined,
        });

        await supabase.from("invoice_reminders" as never).insert({
          invoice_id: inv.id,
          user_id: recipient.user_id,
          company_id: profile.company_id,
          reminder_type: reminderType,
        } as never);

        remindersSent++;
      }
    }

    if (remindersSent > 0) {
      qc.invalidateQueries({ queryKey: ["module", "invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard-counts"] });
      qc.invalidateQueries({ queryKey: ["dashboard-alerts"] });
    }

    return remindersSent;
  }, [profile?.company_id, qc]);

  useEffect(() => {
    if (hasRun.current || !profile?.company_id) return;
    hasRun.current = true;
    checkAndSendReminders().catch(console.error);
  }, [profile?.company_id, checkAndSendReminders]);

  return { checkAndSendReminders };
}

/**
 * Manually trigger reminders for all overdue invoices.
 */
export function useManualInvoiceReminders() {
  const { profile } = useAuth();
  const qc = useQueryClient();

  const sendReminders = useCallback(async () => {
    if (!profile?.company_id) return { sent: 0 };

    const settings = await fetchReminderSettings(profile.company_id);

    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, invoice_number, amount, due_date, status")
      .in("status", ["overdue", "pending"])
      .not("due_date", "is", null);

    if (!invoices?.length) return { sent: 0 };

    const now = new Date();
    let remindersSent = 0;

    for (const inv of invoices) {
      const dueDate = new Date(inv.due_date!);
      const daysDiff = Math.floor((now.getTime() - dueDate.getTime()) / 86400000);

      if (daysDiff < -settings.due_soon_days) continue;

      const reminderType = "manual";

      // Only one manual reminder per day per invoice
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const { data: existing } = await supabase
        .from("invoice_reminders" as never)
        .select("id" as never)
        .eq("invoice_id" as never, inv.id)
        .eq("reminder_type" as never, reminderType)
        .gte("sent_at" as never, todayStart);

      if (existing) continue;

      const { data: recipients } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", settings.recipient_roles as never);

      if (!recipients?.length) continue;

      for (const recipient of recipients) {
        await notifyInvoiceDue({
          companyId: profile.company_id!,
          senderId: null,
          recipientId: recipient.user_id,
          invoiceNumber: inv.invoice_number as string,
          amount: Number(inv.amount),
          dueDate: inv.due_date as string,
          daysOverdue: daysDiff > 0 ? daysDiff : undefined,
        });

        await supabase.from("invoice_reminders" as never).insert({
          invoice_id: inv.id,
          user_id: recipient.user_id,
          company_id: profile.company_id,
          reminder_type: reminderType,
        } as never);

        remindersSent++;
      }
    }

    qc.invalidateQueries({ queryKey: ["module", "invoices"] });

    return { sent: remindersSent };
  }, [profile?.company_id, qc]);

  return { sendReminders };
}
