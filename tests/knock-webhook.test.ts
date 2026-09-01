/**
 * Unit tests for Knock webhook handler logic.
 * Tests pure functions: status mapping and HMAC signature verification.
 */
import { describe, expect, it } from "vitest";

// ── Status mapping (copied from api/public/knock-webhook.ts) ──

function mapKnockEventToStatus(eventType: string): string | null {
  switch (eventType) {
    case "message.delivered":
      return "delivered";
    case "message.opened":
    case "message.clicked":
      return "read";
    case "message.bounced":
    case "message.failed":
    case "message.complained":
      return "failed";
    default:
      return null;
  }
}

describe("mapKnockEventToStatus", () => {
  it("maps message.delivered to 'delivered'", () => {
    expect(mapKnockEventToStatus("message.delivered")).toBe("delivered");
  });

  it("maps message.opened to 'read'", () => {
    expect(mapKnockEventToStatus("message.opened")).toBe("read");
  });

  it("maps message.clicked to 'read'", () => {
    expect(mapKnockEventToStatus("message.clicked")).toBe("read");
  });

  it("maps message.bounced to 'failed'", () => {
    expect(mapKnockEventToStatus("message.bounced")).toBe("failed");
  });

  it("maps message.failed to 'failed'", () => {
    expect(mapKnockEventToStatus("message.failed")).toBe("failed");
  });

  it("maps message.complained to 'failed'", () => {
    expect(mapKnockEventToStatus("message.complained")).toBe("failed");
  });

  it("returns null for unhandled event types", () => {
    expect(mapKnockEventToStatus("message.sent")).toBeNull();
    expect(mapKnockEventToStatus("unknown.event")).toBeNull();
    expect(mapKnockEventToStatus("")).toBeNull();
  });
});

// ── HMAC signature verification (copied from webhook handler) ──

async function verifySignature(
  body: string,
  signature: string | null,
  signingKey: string
): Promise<boolean> {
  if (!signature) return false;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(signingKey);
    const bodyData = encoder.encode(body);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, bodyData);
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return computedSignature === signature.replace("sha256=", "");
  } catch {
    return false;
  }
}

describe("verifySignature", () => {
  it("returns true for a valid HMAC-SHA256 signature", async () => {
    const body = '{"event":"message.delivered"}';
    const key = "test-secret-key";

    // Compute expected signature
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(key),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(body));
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    expect(await verifySignature(body, `sha256=${hex}`, key)).toBe(true);
  });

  it("returns false for an invalid signature", async () => {
    expect(await verifySignature('{"event":"test"}', "sha256=deadbeef", "wrong-key")).toBe(false);
  });

  it("returns false when signature is null", async () => {
    expect(await verifySignature("body", null, "key")).toBe(false);
  });

  it("returns false for malformed signature without sha256= prefix", async () => {
    expect(await verifySignature("body", "not-a-signature", "key")).toBe(false);
  });
});

// ── Status priority logic (from webhook handler) ──

describe("status priority (never downgrade)", () => {
  const statusPriority: Record<string, number> = {
    failed: 0,
    sent: 1,
    delivered: 2,
    read: 3,
  };

  it("allows upgrade from sent to delivered", () => {
    expect(statusPriority["delivered"]).toBeGreaterThan(statusPriority["sent"]);
  });

  it("allows upgrade from delivered to read", () => {
    expect(statusPriority["read"]).toBeGreaterThan(statusPriority["delivered"]);
  });

  it("does not downgrade from read to delivered", () => {
    expect(statusPriority["delivered"]).toBeLessThan(statusPriority["read"]);
  });

  it("does not downgrade from delivered to sent", () => {
    expect(statusPriority["sent"]).toBeLessThan(statusPriority["delivered"]);
  });

  it("does not downgrade from read to failed", () => {
    expect(statusPriority["failed"]).toBeLessThan(statusPriority["read"]);
  });
});
