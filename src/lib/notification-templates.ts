import { supabase } from "@/integrations/supabase/client";

type NotificationTemplate = {
  id: string;
  company_id: string;
  template_key: string;
  subject: string;
  body: string;
  enabled: boolean;
};

/** Available template keys and their default values */
export const TEMPLATE_DEFAULTS: Record<string, { subject: string; body: string }> = {
  task_assigned: {
    subject: "New task assigned: {{taskName}}",
    body: 'You have been assigned to task "{{taskName}}"{{#if projectName}} in project {{projectName}}{{/if}}{{#if dueDate}} — due {{dueDate}}{{/if}}.',
  },
  task_status_changed: {
    subject: "Task status updated: {{taskName}}",
    body: 'Task "{{taskName}}" status changed from "{{oldStatus}}" to "{{newStatus}}".',
  },
  invoice_due: {
    subject: "Invoice due soon: {{invoiceNumber}}",
    body: "Invoice {{invoiceNumber}} for ${{amount}} is due on {{dueDate}}. Please ensure timely payment.",
  },
  invoice_overdue: {
    subject: "Invoice overdue: {{invoiceNumber}}",
    body: "Invoice {{invoiceNumber}} for ${{amount}} is {{daysOverdue}} day(s) overdue. Immediate action required.",
  },
  requisition_approval: {
    subject: "Approval needed: {{requisitionNumber}}",
    body: 'Requisition {{requisitionNumber}}{{#if projectName}} for project "{{projectName}}"{{/if}} needs your approval.',
  },
};

/** Human-readable labels for each template key */
export const TEMPLATE_LABELS: Record<string, string> = {
  task_assigned: "Task Assignment",
  task_status_changed: "Task Status Change",
  invoice_due: "Invoice Due Soon",
  invoice_overdue: "Invoice Overdue",
  requisition_approval: "Requisition Approval",
};

/**
 * Simple Mustache-like template renderer.
 * Supports {{variable}} and {{#if variable}}...{{/if}} blocks.
 */
export function renderTemplate(template: string, data: Record<string, string | number | undefined>): string {
  let result = template;

  // Handle {{#if var}}...{{/if}} blocks
  result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key: string, content: string) => {
    const val = data[key];
    if (val !== undefined && val !== null && val !== "") {
      // Replace inner variables
      return content.replace(/\{\{(\w+)\}\}/g, (_, innerKey: string) => String(data[innerKey] ?? ""));
    }
    return "";
  });

  // Replace remaining {{variables}}
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(data[key] ?? ""));

  return result;
}

/**
 * Fetch notification templates for the current company.
 * Returns defaults if the table doesn't exist (migration not run).
 */
export async function fetchNotificationTemplates(
  companyId: string,
): Promise<NotificationTemplate[]> {
  try {
    const { data, error } = await supabase
      .from("notification_templates" as never)
      .select("*" as never)
      .eq("company_id" as never, companyId)
      .order("template_key");

    if (error || !data) {
      // Table doesn't exist yet — return defaults
      return Object.entries(TEMPLATE_DEFAULTS).map(([key, defaults]) => ({
        id: "",
        company_id: companyId,
        template_key: key,
        subject: defaults.subject,
        body: defaults.body,
        enabled: true,
      }));
    }

    const templates = data as unknown as NotificationTemplate[];

    // Merge with defaults so new template keys are always available
    const merged = Object.entries(TEMPLATE_DEFAULTS).map(([key, defaults]) => {
      const existing = templates.find((t) => t.template_key === key);
      return {
        id: existing?.id ?? "",
        company_id: companyId,
        template_key: key,
        subject: existing?.subject ?? defaults.subject,
        body: existing?.body ?? defaults.body,
        enabled: existing?.enabled ?? true,
      };
    });

    return merged;
  } catch {
    return Object.entries(TEMPLATE_DEFAULTS).map(([key, defaults]) => ({
      id: "",
      company_id: companyId,
      template_key: key,
      subject: defaults.subject,
      body: defaults.body,
      enabled: true,
    }));
  }
}

/**
 * Render a notification using the company's template (or default).
 */
export async function renderNotification(
  companyId: string,
  templateKey: string,
  data: Record<string, string | number | undefined>,
): Promise<{ subject: string; body: string; enabled: boolean }> {
  const templates = await fetchNotificationTemplates(companyId);
  const template = templates.find((t) => t.template_key === templateKey);
  const defaults = TEMPLATE_DEFAULTS[templateKey];

  if (!template || !defaults) {
    return { subject: templateKey, body: "", enabled: false };
  }

  return {
    subject: renderTemplate(template.subject, data),
    body: renderTemplate(template.body, data),
    enabled: template.enabled,
  };
}
