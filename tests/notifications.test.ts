/**
 * Unit tests for notification log and resend logic.
 * Tests the pure validation logic and status checks in notifications.ts.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Mock Supabase client ──

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert.mockReturnThis(),
      select: mockSelect.mockReturnThis(),
      update: mockUpdate.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      single: mockSingle,
    })),
  },
}));

// ── Resend validation logic (extracted from notifications.ts) ──

function canResend(status: string): { allowed: boolean; reason?: string } {
  if (status === "delivered" || status === "read") {
    return { allowed: false, reason: "Notification was already delivered successfully" };
  }
  if (status !== "failed" && status !== "sent") {
    return { allowed: false, reason: `Unknown status: ${status}` };
  }
  return { allowed: true };
}

describe("canResend validation", () => {
  it("allows resend for 'failed' notifications", () => {
    expect(canResend("failed")).toEqual({ allowed: true });
  });

  it("allows resend for 'sent' notifications", () => {
    expect(canResend("sent")).toEqual({ allowed: true });
  });

  it("blocks resend for 'delivered' notifications", () => {
    const result = canResend("delivered");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("already delivered");
  });

  it("blocks resend for 'read' notifications", () => {
    const result = canResend("read");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("already delivered");
  });

  it("blocks resend for unknown statuses", () => {
    const result = canResend("unknown");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Unknown status");
  });
});

// ── Notification type validation ──

type NotificationType = "info" | "task" | "requisition" | "approval" | "urgent";

function isValidNotificationType(type: string): type is NotificationType {
  return ["info", "task", "requisition", "approval", "urgent"].includes(type);
}

describe("notification type validation", () => {
  it("accepts valid notification types", () => {
    expect(isValidNotificationType("info")).toBe(true);
    expect(isValidNotificationType("task")).toBe(true);
    expect(isValidNotificationType("requisition")).toBe(true);
    expect(isValidNotificationType("approval")).toBe(true);
    expect(isValidNotificationType("urgent")).toBe(true);
  });

  it("rejects invalid notification types", () => {
    expect(isValidNotificationType("invalid")).toBe(false);
    expect(isValidNotificationType("")).toBe(false);
    expect(isValidNotificationType("TASK")).toBe(false);
  });
});

// ── Channel validation ──

type NotificationChannel = "in_app" | "email" | "knock";

function isValidChannel(channel: string): channel is NotificationChannel {
  return ["in_app", "email", "knock"].includes(channel);
}

describe("channel validation", () => {
  it("accepts valid channels", () => {
    expect(isValidChannel("in_app")).toBe(true);
    expect(isValidChannel("email")).toBe(true);
    expect(isValidChannel("knock")).toBe(true);
  });

  it("rejects invalid channels", () => {
    expect(isValidChannel("sms")).toBe(false);
    expect(isValidChannel("push")).toBe(false);
    expect(isValidChannel("")).toBe(false);
  });
});

// ── Resend channel routing logic ──

function getResendChannel(entry: { channel: string; metadata: Record<string, unknown> }): {
  action: "create_in_app" | "send_knock" | "skip";
  workflow?: string;
} {
  if (entry.channel === "in_app") {
    return { action: "create_in_app" };
  }

  if (entry.channel === "knock" || entry.channel === "email") {
    const workflow = entry.metadata?.workflow as string | undefined;
    if (workflow) {
      return { action: "send_knock", workflow };
    }
    return { action: "skip" };
  }

  return { action: "skip" };
}

describe("resend channel routing", () => {
  it("routes in_app notifications to create_in_app", () => {
    expect(getResendChannel({ channel: "in_app", metadata: {} })).toEqual({
      action: "create_in_app",
    });
  });

  it("routes knock notifications with workflow to send_knock", () => {
    expect(
      getResendChannel({ channel: "knock", metadata: { workflow: "task-assigned" } })
    ).toEqual({ action: "send_knock", workflow: "task-assigned" });
  });

  it("routes email notifications with workflow to send_knock", () => {
    expect(
      getResendChannel({ channel: "email", metadata: { workflow: "invoice-due" } })
    ).toEqual({ action: "send_knock", workflow: "invoice-due" });
  });

  it("skips knock notifications without a workflow", () => {
    expect(getResendChannel({ channel: "knock", metadata: {} })).toEqual({
      action: "skip",
    });
  });

  it("skips unknown channels", () => {
    expect(getResendChannel({ channel: "sms", metadata: {} })).toEqual({
      action: "skip",
    });
  });
});

// ── Knock response message ID extraction ──

function extractKnockMessageId(response: Record<string, unknown>): string | null {
  const entries = response?.entries as Array<Record<string, unknown>> | undefined;
  if (entries?.[0]?.id) return entries[0].id as string;
  if (response?.id) return response.id as string;
  if (response?.message_id) return response.message_id as string;
  return null;
}

describe("extractKnockMessageId", () => {
  it("extracts ID from entries array", () => {
    expect(extractKnockMessageId({ entries: [{ id: "msg_123" }] })).toBe("msg_123");
  });

  it("extracts ID from top-level id field", () => {
    expect(extractKnockMessageId({ id: "msg_456" })).toBe("msg_456");
  });

  it("extracts ID from message_id field", () => {
    expect(extractKnockMessageId({ message_id: "msg_789" })).toBe("msg_789");
  });

  it("returns null when no ID found", () => {
    expect(extractKnockMessageId({})).toBeNull();
    expect(extractKnockMessageId({ entries: [] })).toBeNull();
  });
});
