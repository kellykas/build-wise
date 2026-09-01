// api/public/knock-webhook.ts
// Receives Knock delivery and engagement webhooks to update notification_log status.
// Webhook URL: https://buildflow-connect-hub.lovable.app/api/public/knock-webhook

import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

// Map Knock event types to our notification_log statuses
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

// Verify Knock webhook signature (HMAC-SHA256)
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
  } catch (err) {
    console.error("Signature verification failed:", err);
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  try {
    const supabaseUrl = import.meta.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
    const knockSigningKey = import.meta.env.KNOCK_SIGNING_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const body = await request.text();
    const signature = request.headers.get("x-knock-signature");

    // Verify webhook signature if signing key is configured
    if (knockSigningKey) {
      const isValid = await verifySignature(body, signature, knockSigningKey);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const payload = JSON.parse(body);
    const eventType: string = payload?.event ?? "";
    const message = payload?.data?.message ?? payload?.data ?? {};

    // Extract the Knock message ID from the payload
    const knockMessageId: string | undefined = message?.id ?? payload?.data?.message_id;

    if (!knockMessageId) {
      console.log("No message ID in webhook payload, skipping:", eventType);
      return new Response(
        JSON.stringify({ received: true, skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map the Knock event to our status
    const newStatus = mapKnockEventToStatus(eventType);
    if (!newStatus) {
      console.log("Unhandled Knock event type:", eventType);
      return new Response(
        JSON.stringify({ received: true, handled: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the matching notification_log entry
    const { data: existing, error: findError } = await supabase
      .from("notification_log")
      .select("id, status")
      .eq("knock_message_id", knockMessageId)
      .single();

    if (findError || !existing) {
      console.log("No matching notification_log entry for message:", knockMessageId);
      return new Response(
        JSON.stringify({ received: true, matched: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only upgrade status, never downgrade
    const statusPriority: Record<string, number> = {
      failed: 0,
      sent: 1,
      delivered: 2,
      read: 3,
    };

    const currentPriority = statusPriority[(existing as { status: string }).status] ?? 0;
    const newPriority = statusPriority[newStatus] ?? 0;

    if (newPriority <= currentPriority) {
      return new Response(
        JSON.stringify({ received: true, skipped: true, reason: "status would downgrade" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === "read") {
      updateData.read_at = new Date().toISOString();
    }

    if (newStatus === "failed") {
      const errorMessage =
        message?.errors?.[0]?.message ??
        payload?.data?.error ??
        `Knock event: ${eventType}`;
      updateData.error_message = errorMessage;
    }

    const { error: updateError } = await supabase
      .from("notification_log")
      .update(updateData)
      .eq("id", (existing as { id: string }).id);

    if (updateError) {
      console.error("Failed to update notification_log:", updateError.message);
      throw updateError;
    }

    console.log(
      `Updated notification ${(existing as { id: string }).id}: ${eventType} -> ${newStatus}`
    );

    return new Response(
      JSON.stringify({ received: true, updated: true, status: newStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Knock webhook error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response("ok", {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
};
