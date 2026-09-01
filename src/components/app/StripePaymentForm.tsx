import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLIC_KEY as string
);

function InnerPaymentForm({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (submitError) {
      setError(submitError.message ?? "Payment failed");
      onError(submitError.message ?? "Payment failed");
      setSubmitting(false);
    } else {
      onSuccess();
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      <Button type="submit" disabled={!stripe || submitting} className="w-full">
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing…
          </>
        ) : (
          "Pay now"
        )}
      </Button>
    </form>
  );
}

export function StripePaymentForm({
  clientSecret,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "hsl(24, 95%, 53%)",
            borderRadius: "8px",
          },
        },
      }}
    >
      <InnerPaymentForm onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}

export function PaymentSuccess({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <CheckCircle2 className="h-12 w-12 text-success" />
      <p className="text-lg font-medium">Payment successful!</p>
      <p className="text-sm text-muted-foreground">
        The invoice has been updated and a transaction has been recorded.
      </p>
      <Button onClick={onDone} className="mt-2">
        Done
      </Button>
    </div>
  );
}
