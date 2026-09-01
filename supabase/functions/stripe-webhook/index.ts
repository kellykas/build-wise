// supabase/functions/stripe-webhook/index.ts
// Handles incoming Stripe webhooks to update invoice/payment status.
// Deploy: supabase functions deploy stripe-webhook
// Stripe webhook endpoint: https://<project-ref>.supabase.co/functions/v1/stripe-webhook
// Events to listen for: payment_intent.succeeded, payment_intent.payment_failed

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    // Use service role key for database updates (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const invoiceNumber = pi.metadata.invoiceNumber;
        const amountPaid = pi.amount_received / 100; // Convert from cents

        if (invoiceNumber) {
          // Fetch the invoice
          const { data: invoice } = await supabase
            .from("invoices")
            .select("id, amount, paid_amount, company_id")
            .eq("invoice_number", invoiceNumber)
            .single();

          if (invoice) {
            const newPaid = Number(invoice.paid_amount || 0) + amountPaid;
            const status = newPaid >= Number(invoice.amount) ? "paid" : "sent";

            // Update invoice
            await supabase
              .from("invoices")
              .update({ paid_amount: newPaid, status })
              .eq("id", invoice.id);

            // Record transaction
            if (invoice.company_id) {
              await supabase.from("transactions").insert({
                company_id: invoice.company_id,
                type: "income",
                category: "Stripe payment",
                amount: amountPaid,
                description: `Stripe payment for ${invoiceNumber}`,
                invoice_id: invoice.id,
              });
            }

            console.log(`Payment succeeded: ${invoiceNumber} - $${amountPaid}`);
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const invoiceNumber = pi.metadata.invoiceNumber;
        console.log(`Payment failed: ${invoiceNumber} - ${pi.last_payment_error?.message}`);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
