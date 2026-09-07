import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { HardHat, Mail, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Connexion — Scer-L/Construct Sarl" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"sign_in" | "sign_up">("sign_in");

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
      toast.error(err instanceof Error ? err.message : "Échec de l'authentification");
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast.success("Compte créé ! Vérifiez votre boîte de réception pour confirmer votre inscription.");
      setView("sign_in");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'inscription");
    } finally {
      setBusy(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la connexion OAuth");
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left panel - branding */}
      <div className="hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-3 font-semibold">
          <img src="/logo.png" alt="Scer-L/Construct Sarl" className="h-10 w-10 rounded-full" />
          <span className="text-lg">Scer-L/<span className="text-primary">Construct</span></span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold">Gérez tous vos chantiers depuis une seule plateforme.</h2>
          <p className="mt-3 max-w-md text-sm text-sidebar-foreground/70">
            Projets, équipes, approvisionnement, équipement, finances et documents, réunis.
          </p>
        </div>
        <div className="space-y-3 text-xs text-sidebar-foreground/50">
          <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> +1 (555) 240-8800</div>
          <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> hello@buildflow.co</div>
          <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> 240 Riverside Ave, Suite 1100</div>
        </div>
        <div className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} Scer-L/Construct Sarl</div>
      </div>

      {/* Right panel - form */}
      <div className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="mb-6 inline-flex items-center gap-2 font-semibold lg:hidden">
            <img src="/logo.png" alt="Scer-L/Construct Sarl" className="h-8 w-8 rounded-full" />
            Scer-L/Construct
          </Link>

          {view === "sign_in" ? (
            <>
              <h1 className="text-2xl font-bold">{t("auth.welcome_back", "Bon retour")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("auth.sign_in_desc", "Connectez-vous à votre compte Scer-L/Construct.")}</p>

              {/* OAuth buttons */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button variant="outline" type="button" onClick={() => handleOAuth("google")} className="w-full">
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Google
                </Button>
                <Button variant="outline" type="button" onClick={() => handleOAuth("apple")} className="w-full">
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.98-2.53 4.07zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  Apple
                </Button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">{t("auth.or", "ou")}</span></div>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label>{t("auth.email", "E-mail")}</Label>
                  <Input required type="email" name="email" className="mt-1" placeholder="votre@email.com" />
                </div>
                <div>
                  <Label>{t("auth.password", "Mot de passe")}</Label>
                  <Input required type="password" name="password" className="mt-1" placeholder="••••••••" />
                </div>
                <Button disabled={busy} type="submit" className="w-full">
                  {busy ? t("auth.signing_in", "Connexion...") : t("auth.sign_in", "Se connecter")}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                {t("auth.no_account", "Vous n'avez pas de compte ?")}{" "}
                <button type="button" onClick={() => setView("sign_up")} className="text-primary hover:underline">{t("auth.sign_up_link", "S'inscrire")}</button>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">{t("auth.create_account", "Créer un compte")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("auth.sign_up_desc", "Inscrivez-vous pour accéder à Scer-L/Construct.")}</p>

              <form onSubmit={handleSignUp} className="mt-6 space-y-4">
                <div>
                  <Label>{t("auth.email", "E-mail")}</Label>
                  <Input required type="email" name="email" className="mt-1" placeholder="votre@email.com" />
                </div>
                <div>
                  <Label>{t("auth.password", "Mot de passe")}</Label>
                  <Input required type="password" name="password" minLength={6} className="mt-1" placeholder="••••••••" />
                </div>
                <Button disabled={busy} type="submit" className="w-full">
                  {busy ? t("auth.creating", "Création...") : t("auth.sign_up", "S'inscrire")}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                {t("auth.has_account", "Vous avez déjà un compte ?")}{" "}
                <button type="button" onClick={() => setView("sign_in")} className="text-primary hover:underline">{t("auth.sign_in_link", "Se connecter")}</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
