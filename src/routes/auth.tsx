import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Mail, Phone, MapPin } from "lucide-react";

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

              <form onSubmit={handleSignIn} className="mt-6 space-y-4">
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
