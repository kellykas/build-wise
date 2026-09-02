import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/app/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name"));
    try {
      const { data: company, error } = await supabase
        .from("companies").insert({ name, email: user.email }).select("id").single();
      if (error) throw error;
      const { error: pErr } = await supabase
        .from("profiles").update({ company_id: company.id }).eq("id", user.id);
      if (pErr) throw pErr;
      await supabase.from("user_roles").insert({
        user_id: user.id, company_id: company.id, role: "company_owner",
      });
      await refresh();
      toast.success("Workspace created");
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg py-10">
      <Card>
        <CardHeader>
          <CardTitle>{t("d.onboarding.title")}</CardTitle>
          <CardDescription>{t("d.onboarding.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div><Label>{t("d.onboarding.company_name")}</Label><Input required name="name" className="mt-1" placeholder={t("d.onboarding.placeholder")} /></div>
            <Button disabled={busy} type="submit" className="w-full">{t("d.onboarding.create_workspace")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
