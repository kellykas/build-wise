import { createFileRoute } from "@tanstack/react-router";

// Knock webhook receiver: verifies the Knock HMAC-SHA256 signature and
// updates public.notification_log delivery status. Realtime on that table
// pushes the change to subscribed frontends without a refresh.

const encoder = new TextEncoder();

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

const KNOWN_STATUSES = new Set([
  "queued", "sent", "delivered", "delivery_attempted", "undelivered",
  "bounced", "seen", "read", "interacted", "link_clicked", "archived",
]);

function mapStatus(knockStatus: string): string {
  return KNOWN_STATUSES.has(knockStatus) ? knockStatus : knockStatus || "unknown";
}

export const Route = createFileRoute("/api/public/knock-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();

        // Verify the Knock signature when a signing key is configured.
        const signingKey = process.env["KNOCK_SIGNING_KEY"];
        if (signingKey) {
          const signature = request.headers.get("x-knock-signature") ?? "";
          const expected = await hmacHex(signingKey, rawBody);
          const provided = signature.replace(/^sha256=/, "");
          if (!provided || !timingSafeEqual(provided, expected)) {
            return Response.json({ error: "Invalid signature" }, { status: 401 });
          }
        }

        let event: any;
        try {
          event = JSON.parse(rawBody);
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        // Knock sends { event: "message.delivered", data: { ...message } };
        // some configurations send the message object directly.
        const message = event?.data ?? event;
        const messageId: string | undefined = message?.id ?? message?.message_id;
        const knockStatus: string | undefined =
          event?.event?.replace(/^message\./, "") ?? message?.status;

        if (!messageId) {
          // Acknowledge so Knock doesn't keep retrying malformed payloads.
          return Response.json({ ok: true, ignored: "no message id" });
        }

        const status = mapStatus(knockStatus ?? "unknown");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: existing } = await supabaseAdmin
          .from("notification_log")
          .select("id")
          .eq("knock_message_id", messageId)
          .maybeSingle();

        let dbError;
        if (existing) {
          ({ error: dbError } = await supabaseAdmin
            .from("notification_log")
            .update({ status, payload: message })
            .eq("id", existing.id));
        } else {
          ({ error: dbError } = await supabaseAdmin.from("notification_log").insert({
            knock_message_id: messageId,
            knock_workflow: message?.workflow ?? event?.workflow ?? null,
            channel: message?.channel?.type ?? message?.channel_id ?? null,
            status,
            payload: message ?? {},
          }));
        }

        if (dbError) {
          console.error("notification_log update failed", dbError);
          return Response.json({ error: dbError.message }, { status: 500 });
        }

        return Response.json({ ok: true, status });
      },
    },
  },
});
