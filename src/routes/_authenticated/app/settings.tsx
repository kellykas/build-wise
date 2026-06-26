import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, refresh } = useAuth();
  const qc = useQueryClient();
  const { data: company } = useQuery({
    enabled: !!profile?.company_id,
    queryKey: ["company", profile?.company_id],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").eq("id", profile!.company_id!).single();
      return data;
    },
  });

  const saveCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.company_id) return;
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("companies").update({
      name: String(fd.get("name")),
      email: String(fd.get("email") || "") || null,
      phone: String(fd.get("phone") || "") || null,
      address: String(fd.get("address") || "") || null,
      tax_number: String(fd.get("tax_number") || "") || null,
    }).eq("id", profile.company_id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["company"] });
  };

  const saveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("profiles").update({
      full_name: String(fd.get("full_name") || ""),
      phone: String(fd.get("phone") || "") || null,
    }).eq("id", profile!.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><SettingsIcon className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Workspace and personal preferences.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Company</CardTitle><CardDescription>These details appear on invoices and documents.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={saveCompany} className="space-y-3">
              <div><Label>Name</Label><Input name="name" required defaultValue={company?.name ?? ""} className="mt-1" /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Email</Label><Input name="email" defaultValue={company?.email ?? ""} className="mt-1" /></div>
                <div><Label>Phone</Label><Input name="phone" defaultValue={company?.phone ?? ""} className="mt-1" /></div>
              </div>
              <div><Label>Address</Label><Input name="address" defaultValue={company?.address ?? ""} className="mt-1" /></div>
              <div><Label>Tax number</Label><Input name="tax_number" defaultValue={company?.tax_number ?? ""} className="mt-1" /></div>
              <Button type="submit">Save company</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Your profile</CardTitle><CardDescription>Personal details.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-3">
              <div><Label>Full name</Label><Input name="full_name" defaultValue={profile?.full_name ?? ""} className="mt-1" /></div>
              <div><Label>Email</Label><Input value={profile?.email ?? ""} disabled className="mt-1" /></div>
              <div><Label>Phone</Label><Input name="phone" className="mt-1" /></div>
              <Button type="submit">Save profile</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
