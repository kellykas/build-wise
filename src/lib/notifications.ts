import { supabase } from "@/integrations/supabase/client";
import { renderNotification } from "@/lib/notification-templates";

type NotificationType = "info" | "task" | "requisition" | "approval" | "urgent";

/**
 * Log a notification to the audit table for admin visibility.
 */
export async function logNotification(opts: {
  companyId: string;
  senderId: string | null;
  recipientId: string;
  type: NotificationType;
  templateKey?: string;
  title: string;
  message?: string;
  link?: string;
  channel: "in_app" | "email" | "knock";
  status?: "sent" | "delivered" | "read" | "failed";
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  knockMessageId?: string;
}): Promise<void> {
  try {
    const { error } = await supabase.from("notification_log" as never).insert({
      company_id: opts.companyId,
      sender_id: opts.senderId,
      recipient_id: opts.recipientId,
      type: opts.type,
      template_key: opts.templateKey ?? null,
      title: opts.title,
      message: opts.message ?? null,
      link: opts.link ?? null,
      channel: opts.channel,
      status: opts.status ?? "sent",
      error_message: opts.errorMessage ?? null,
      metadata: opts.metadata ?? {},
      knock_message_id: opts.knockMessageId ?? null,
    } as never);
    if (error) console.error("Failed to log notification:", error.message);
  } catch (err) {
    console.error("Notification log error:", err);
  }
}

/**
 * Create an internal notification for a user.
 */
export async function createNotification(opts: {
  companyId: string;
  senderId: string | null;
  recipientId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  templateKey?: string;
}): Promise<void> {
  const { error } = await supabase.from("internal_notifications").insert({
    company_id: opts.companyId,
    sender_id: opts.senderId,
    recipient_id: opts.recipientId,
    type: opts.type,
    title: opts.title,
    message: opts.message ?? null,
    link: opts.link ?? null,
  });
  if (error) console.error("Failed to create notification:", error.message);

  // Log the in-app notification for audit
  await logNotification({
    companyId: opts.companyId,
    senderId: opts.senderId,
    recipientId: opts.recipientId,
    type: opts.type,
    templateKey: opts.templateKey,
    title: opts.title,
    message: opts.message,
    link: opts.link,
    channel: "in_app",
    status: "sent",
  });
}

/**
 * Send a notification via Knock (in-app + email).
 * Uses the Knock REST API directly — no Edge Function needed.
 */
async function resolveKnockUserId(supabaseUserId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("profiles" as never)
      .select("id" as never)
      .eq("id", supabaseUserId)
      .maybeSingle();
    // knock_user_id may not exist yet (migration not run)
    // Fall back to using the Supabase user ID as Knock ID
    return (data as unknown as { knock_user_id?: string | null } | null)?.knock_user_id ?? supabaseUserId;
  } catch {
    return supabaseUserId; // Fallback to Supabase user ID
  }
}

async function sendKnockNotification(opts: {
  userId: string;
  channel: string;
  workflow: string;
  data: Record<string, unknown>;
}): Promise<string | null> {
  const apiKey = import.meta.env.VITE_KNOCK_API_KEY as string | undefined;
  if (!apiKey) return null; // Knock not configured

  // Resolve Knock user ID from Supabase user ID
  const knockUserId = await resolveKnockUserId(opts.userId);
  if (!knockUserId) return null; // No Knock ID mapped for this user

  try {
    const res = await fetch(
      `https://api.knock.app/v1/workflows/${opts.workflow}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          recipients: [knockUserId],
          channel: opts.channel,
          data: opts.data,
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`Knock workflow ${opts.workflow} failed:`, res.status, body);
      return null;
    }

    const result = await res.json();
    // Knock returns the message ID in the response
    const messageId: string | undefined =
      result?.entries?.[0]?.id ?? result?.id ?? result?.message_id;
    return messageId ?? null;
  } catch (err) {
    console.error("Knock notification failed:", err);
    return null;
  }
}

/**
 * Log an email/Knock notification attempt.
 */
async function logKnockNotification(opts: {
  companyId: string;
  senderId: string | null;
  recipientId: string;
  type: NotificationType;
  templateKey?: string;
  title: string;
  message?: string;
  link?: string;
  workflow: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  knockMessageId?: string | null;
}): Promise<void> {
  await logNotification({
    companyId: opts.companyId,
    senderId: opts.senderId,
    recipientId: opts.recipientId,
    type: opts.type,
    templateKey: opts.templateKey,
    title: opts.title,
    message: opts.message,
    link: opts.link,
    channel: "knock",
    status: opts.success ? "delivered" : "failed",
    errorMessage: opts.errorMessage,
    metadata: { ...opts.metadata, workflow: opts.workflow },
    knockMessageId: opts.knockMessageId ?? undefined,
  });
}

/**
 * Notify when a task is assigned to a user.
 */
export async function notifyTaskAssigned(opts: {
  companyId: string;
  senderId: string | null;
  assigneeId: string;
  taskName: string;
  projectName?: string;
  dueDate?: string | null;
}): Promise<void> {
  const rendered = await renderNotification(opts.companyId, "task_assigned", {
    taskName: opts.taskName,
    projectName: opts.projectName,
    dueDate: opts.dueDate ? new Date(opts.dueDate).toLocaleDateString() : undefined,
  });

  if (!rendered.enabled) return;

  await createNotification({
    companyId: opts.companyId,
    senderId: opts.senderId,
    recipientId: opts.assigneeId,
    type: "task",
    title: rendered.subject,
    message: rendered.body,
    link: "/app/tasks",
    templateKey: "task_assigned",
  });

  // Log email delivery attempt
  const knockMessageId = await sendKnockNotification({
    userId: opts.assigneeId,
    channel: "email",
    workflow: "task-assigned",
    data: {
      subject: rendered.subject,
      body: rendered.body,
      taskName: opts.taskName,
      projectName: opts.projectName ?? "",
      dueDate: opts.dueDate ?? "",
      link: "/app/tasks",
    },
  });

  await logKnockNotification({
    companyId: opts.companyId,
    senderId: opts.senderId,
    recipientId: opts.assigneeId,
    type: "task",
    templateKey: "task_assigned",
    title: rendered.subject,
    message: rendered.body,
    link: "/app/tasks",
    workflow: "task-assigned",
    success: true,
    metadata: { taskName: opts.taskName, projectName: opts.projectName, dueDate: opts.dueDate },
    knockMessageId,
  });
}

/**
 * Notify when a task status changes.
 */
export async function notifyTaskStatusChanged(opts: {
  companyId: string;
  senderId: string | null;
  recipientId: string;
  taskName: string;
  oldStatus: string;
  newStatus: string;
}): Promise<void> {
  if (opts.oldStatus === opts.newStatus) return;

  const rendered = await renderNotification(opts.companyId, "task_status_changed", {
    taskName: opts.taskName,
    oldStatus: opts.oldStatus,
    newStatus: opts.newStatus,
  });

  if (!rendered.enabled) return;

  await createNotification({
    companyId: opts.companyId,
    senderId: opts.senderId,
    recipientId: opts.recipientId,
    type: "task",
    title: rendered.subject,
    message: rendered.body,
    link: "/app/tasks",
    templateKey: "task_status_changed",
  });

  const knockMessageId = await sendKnockNotification({
    userId: opts.recipientId,
    channel: "email",
    workflow: "task-status-changed",
    data: {
      subject: rendered.subject,
      body: rendered.body,
      taskName: opts.taskName,
      oldStatus: opts.oldStatus,
      newStatus: opts.newStatus,
      link: "/app/tasks",
    },
  });

  await logKnockNotification({
    companyId: opts.companyId,
    senderId: opts.senderId,
    recipientId: opts.recipientId,
    type: "task",
    templateKey: "task_status_changed",
    title: rendered.subject,
    message: rendered.body,
    link: "/app/tasks",
    workflow: "task-status-changed",
    success: true,
    metadata: { taskName: opts.taskName, oldStatus: opts.oldStatus, newStatus: opts.newStatus },
    knockMessageId,
  });
}

/**
 * Notify when an invoice is overdue or due soon.
 */
export async function notifyInvoiceDue(opts: {
  companyId: string;
  senderId: string | null;
  recipientId: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  daysOverdue?: number;
}): Promise<void> {
  const isOverdue = opts.daysOverdue && opts.daysOverdue > 0;
  const templateKey = isOverdue ? "invoice_overdue" : "invoice_due";

  const rendered = await renderNotification(opts.companyId, templateKey, {
    invoiceNumber: opts.invoiceNumber,
    amount: opts.amount.toLocaleString(),
    dueDate: new Date(opts.dueDate).toLocaleDateString(),
    daysOverdue: opts.daysOverdue ?? 0,
  });

  if (!rendered.enabled) return;

  await createNotification({
    companyId: opts.companyId,
    senderId: opts.senderId,
    recipientId: opts.recipientId,
    type: isOverdue ? "urgent" : "info",
    title: rendered.subject,
    message: rendered.body,
    link: "/app/invoices",
    templateKey,
  });

  const knockMessageId = await sendKnockNotification({
    userId: opts.recipientId,
    channel: "email",
    workflow: isOverdue ? "invoice-overdue" : "invoice-due-reminder",
    data: {
      subject: rendered.subject,
      body: rendered.body,
      invoiceNumber: opts.invoiceNumber,
      amount: opts.amount,
      dueDate: opts.dueDate,
      daysOverdue: opts.daysOverdue ?? 0,
      link: "/app/invoices",
    },
  });

  await logKnockNotification({
    companyId: opts.companyId,
    senderId: opts.senderId,
    recipientId: opts.recipientId,
    type: isOverdue ? "urgent" : "info",
    templateKey,
    title: rendered.subject,
    message: rendered.body,
    link: "/app/invoices",
    workflow: isOverdue ? "invoice-overdue" : "invoice-due-reminder",
    success: true,
    metadata: { invoiceNumber: opts.invoiceNumber, amount: opts.amount, dueDate: opts.dueDate, daysOverdue: opts.daysOverdue },
    knockMessageId,
  });
}

/**
 * Resend a failed notification from the log.
 * Looks up the original entry and re-delivers via the same channel/workflow.
 */
export async function resendNotification(logEntryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Fetch the original log entry
    const { data: entry, error: fetchError } = await supabase
      .from("notification_log" as never)
      .select("*")
      .eq("id", logEntryId)
      .single();

    if (fetchError || !entry) {
      return { success: false, error: fetchError?.message ?? "Log entry not found" };
    }

    const logEntry = entry as unknown as {
      id: string;
      company_id: string;
      sender_id: string | null;
      recipient_id: string;
      type: string;
      template_key: string | null;
      title: string;
      message: string | null;
      link: string | null;
      channel: string;
      status: string;
      metadata: Record<string, unknown>;
    };

    // Only resend failed or sent entries
    if (logEntry.status === "delivered" || logEntry.status === "read") {
      return { success: false, error: "Notification was already delivered successfully" };
    }

    // 2. Re-send based on channel type
    if (logEntry.channel === "in_app") {
      // Re-create the in-app notification
      await createNotification({
        companyId: logEntry.company_id,
        senderId: logEntry.sender_id,
        recipientId: logEntry.recipient_id,
        type: logEntry.type as NotificationType,
        title: logEntry.title,
        message: logEntry.message ?? undefined,
        link: logEntry.link ?? undefined,
      });
    } else if (logEntry.channel === "knock" || logEntry.channel === "email") {
      // Re-send via Knock using the stored metadata/workflow
      const workflow = (logEntry.metadata as Record<string, unknown>)?.workflow as string | undefined;
      if (workflow) {
        const newKnockMessageId = await sendKnockNotification({
          userId: logEntry.recipient_id,
          channel: "email",
          workflow,
          data: {
            subject: logEntry.title,
            body: logEntry.message ?? "",
            ...((logEntry.metadata as Record<string, unknown>) ?? {}),
          },
        });

        // Log the retry attempt with the new Knock message ID
        await logNotification({
          companyId: logEntry.company_id,
          senderId: logEntry.sender_id,
          recipientId: logEntry.recipient_id,
          type: logEntry.type as NotificationType,
          templateKey: logEntry.template_key ?? undefined,
          title: logEntry.title,
          message: logEntry.message ?? undefined,
          link: logEntry.link ?? undefined,
          channel: "knock",
          status: "sent",
          metadata: { ...((logEntry.metadata as Record<string, unknown>) ?? {}), resendOf: logEntry.id, resentAt: new Date().toISOString() },
          knockMessageId: newKnockMessageId ?? undefined,
        });
        return { success: true };
      }
    }

    // 3. Log the retry attempt (in-app channel)
    await logNotification({
      companyId: logEntry.company_id,
      senderId: logEntry.sender_id,
      recipientId: logEntry.recipient_id,
      type: logEntry.type as NotificationType,
      templateKey: logEntry.template_key ?? undefined,
      title: logEntry.title,
      message: logEntry.message ?? undefined,
      link: logEntry.link ?? undefined,
      channel: logEntry.channel as "in_app" | "email" | "knock",
      status: "sent",
      metadata: { ...((logEntry.metadata as Record<string, unknown>) ?? {}), resendOf: logEntry.id, resentAt: new Date().toISOString() },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Resend notification failed:", message);
    return { success: false, error: message };
  }
}

/**
 * Notify when a requisition needs approval.
 */
export async function notifyRequisitionApproval(opts: {
  companyId: string;
  senderId: string | null;
  approverId: string;
  requisitionNumber: string;
  projectName?: string;
}): Promise<void> {
  const rendered = await renderNotification(opts.companyId, "requisition_approval", {
    requisitionNumber: opts.requisitionNumber,
    projectName: opts.projectName,
  });

  if (!rendered.enabled) return;

  await createNotification({
    companyId: opts.companyId,
    senderId: opts.senderId,
    recipientId: opts.approverId,
    type: "approval",
    title: rendered.subject,
    message: rendered.body,
    link: "/app/requisitions",
    templateKey: "requisition_approval",
  });

  const knockMessageId = await sendKnockNotification({
    userId: opts.approverId,
    channel: "email",
    workflow: "requisition-approval-needed",
    data: {
      subject: rendered.subject,
      body: rendered.body,
      requisitionNumber: opts.requisitionNumber,
      projectName: opts.projectName ?? "",
      link: "/app/requisitions",
    },
  });

  await logKnockNotification({
    companyId: opts.companyId,
    senderId: opts.senderId,
    recipientId: opts.approverId,
    type: "approval",
    templateKey: "requisition_approval",
    title: rendered.subject,
    message: rendered.body,
    link: "/app/requisitions",
    workflow: "requisition-approval-needed",
    success: true,
    metadata: { requisitionNumber: opts.requisitionNumber, projectName: opts.projectName },
    knockMessageId,
  });
}
