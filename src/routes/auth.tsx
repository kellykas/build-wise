import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { HardHat } from "lucide-react";

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

  const handleEmailAuth = async (e: React.FormEvent<HTMLFormElement>, mode: "in" | "up") => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const full_name = String(fd.get("full_name") || "");
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/app`, data: { full_name } },
        });
        if (error) throw error;
        toast.success("Account created — check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/app" });
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
          <h1 className="text-2xl font-bold">Welcome</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in or create your company workspace.</p>

          <Tabs defaultValue="in" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="in">Sign in</TabsTrigger>
              <TabsTrigger value="up">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="in">
              <form onSubmit={(e) => handleEmailAuth(e, "in")} className="mt-4 space-y-4">
                <div><Label>Email</Label><Input required type="email" name="email" className="mt-1" /></div>
                <div><Label>Password</Label><Input required type="password" name="password" className="mt-1" /></div>
                <Button disabled={busy} type="submit" className="w-full">Sign in</Button>
              </form>
            </TabsContent>

            <TabsContent value="up">
              <form onSubmit={(e) => handleEmailAuth(e, "up")} className="mt-4 space-y-4">
                <div><Label>Full name</Label><Input required name="full_name" className="mt-1" /></div>
                <div><Label>Email</Label><Input required type="email" name="email" className="mt-1" /></div>
                <div><Label>Password</Label><Input required minLength={6} type="password" name="password" className="mt-1" /></div>
                <Button disabled={busy} type="submit" className="w-full">Create account</Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
          </div>
          <Button disabled={busy} onClick={handleGoogle} variant="outline" className="w-full">
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
