import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { HardHat } from "lucide-react"

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — BuildFlow ERP" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/app" });
  }, [session, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"><HardHat className="h-5 w-5" /></span>
          BuildFlow ERP
        </Link>
        <div>
          <h2 className="text-3xl font-bold">Run every site from one platform.</h2>
          <p className="mt-3 max-w-md text-sm text-sidebar-foreground/70">
            Projects, crews, procurement, equipment, finance and documents — unified.
          </p>
        </div>
        <div className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} BuildFlow</div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 font-semibold lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground"><HardHat className="h-4 w-4" /></span>
            BuildFlow
          </Link>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your BuildFlow account.</p>

          <form onSubmit={handleSignIn} className="mt-6 space-y-4">
            <div><Label>Email</Label><Input required type="email" name="email" className="mt-1" /></div>
            <div><Label>Password</Label><Input required type="password" name="password" className="mt-1" /></div>
            <Button disabled={busy} type="submit" className="w-full">Sign in</Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Don't have an account? Contact your project manager to get access.
          </p>
        </div>
      </div>
    </div>
  );
}
