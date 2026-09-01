import { useState } from "react";

export function useStripePayment() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentIntent = async (amount: number, invoiceNumber: string) => {
    setLoading(true);
    setError(null);

    try {
      // Call the Supabase Edge Function for Stripe payment intent creation
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

      // Dynamic import to avoid bundling issues if Stripe secret key isn't available
      const functionUrl = `${supabaseUrl}/functions/v1/create-payment-intent`;

      // We need to get a session token from Supabase
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Get current session from localStorage
      const sessionStr = localStorage.getItem(
        `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`
      );
      if (!sessionStr) throw new Error("Not authenticated");

      const sessionData = JSON.parse(sessionStr);
      const accessToken = sessionData?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      const res = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({
          amount,
          currency: "usd",
          metadata: { invoiceNumber },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Payment setup failed (${res.status})`);
      }

      const { clientSecret } = await res.json();
      setClientSecret(clientSecret);
      return clientSecret;
    } catch (err) {
      const msg = (err as Error).message || "Payment setup failed";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setClientSecret(null);
    setError(null);
  };

  return { clientSecret, loading, error, createPaymentIntent, reset };
}
