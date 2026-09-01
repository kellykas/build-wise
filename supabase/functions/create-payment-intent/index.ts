// supabase/functions/create-payment-intent/index.ts
// Deploy with: supabase functions deploy create-payment-intent
// Then set STRIPE_SECRET_KEY in Supabase project settings → Edge Functions → Secrets

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-12-18.acacia",
    });

    const { amount, currency, metadata } = await req.json();

    if (!amount || amount <= 0) {
      throw new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency || "usd",
      automatic_payment_methods: { enabled: true },
      metadata: metadata || {},
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error creating payment intent:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
