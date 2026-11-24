import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePublicSiteContent, getPublicContentValue } from "@/hooks/use-public-site-content";
import { toast } from "sonner";
import { Mail, Phone, MapPin, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Connexion — HYCO SARLU" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  // Contact details + copyright come from the site CMS (same source as the
  // public Contact page / footer): cms.footer.contact first, then flat
  // contact.* keys, then the site defaults. Editable in the Site Editor
  // under « Coordonnées du site » and « Pied de page ».
  const { data: content } = usePublicSiteContent();
  const cmsFooter = (getPublicContentValue(content, "cms", "footer", {}) ?? {}) as {
    contact?: Record<string, string>;
    copyright?: string;
  };
  const cmsContact = cmsFooter.contact ?? {};
  const cmsText = (s: string, k: string, fb: string) => {
    const v = getPublicContentValue(content, s, k, "");
    return typeof v === "string" && v.trim() !== "" ? v.trim() : fb;
  };
  const phone = cmsContact.phone?.trim() || cmsText("contact", "phone", "+243 825 913 789");
  const email = cmsContact.email?.trim() || cmsText("contact", "email", "hello@scer-lconstruct.com");
  const address = cmsContact.address?.trim() || cmsText("contact", "address", "Boulevard Mobutu N°6, Réf. Résidence Equateur, commune Makiso");
  const copyright =
    cmsText("footer", "copyright", "") ||
    cmsFooter.copyright?.trim() ||
    t("footer.copyright");

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

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left panel - branding */}
      <div className="hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-3 font-semibold">
          <img src="/logo-transparent.png" alt="HYCO SARLU" className="h-10 w-10" />
          <span className="text-lg">HYCO <span className="text-primary">SARLU</span></span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold">Gérez tous vos chantiers depuis une seule plateforme.</h2>
          <p className="mt-3 max-w-md text-sm text-sidebar-foreground/70">
            Projets, équipes, approvisionnement, équipement, finances et documents, réunis.
          </p>
        </div>
        <div className="space-y-3 text-xs text-sidebar-foreground/50">
          <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {phone}</div>
          <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {email}</div>
          <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {address}</div>
        </div>
        <div className="text-xs text-sidebar-foreground/50">{copyright}</div>
      </div>

      {/* Right panel - form */}
      <div className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="mb-6 inline-flex items-center gap-2 font-semibold lg:hidden">
            <img src="/logo-transparent.png" alt="HYCO SARLU" className="h-8 w-8" />
            HYCO SARLU
          </Link>

          <h1 className="text-2xl font-bold">{t("auth.welcome_back", "Bon retour")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.sign_in_desc", "Connectez-vous à votre compte HYCO SARLU.")}</p>

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

          <div className="mt-6 flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {t(
                "auth.no_public_signup",
                "Les comptes sont créés par l'administration. Contactez le super administrateur ou le service informatique pour obtenir un accès.",
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}