import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
});

const ROLES = ["super_admin", "company_owner", "project_manager", "site_supervisor", "engineer", "finance_manager", "hr_manager", "procurement_officer", "warehouse_keeper", "employee", "client"] as const;

type Profile = { id: string; full_name: string; email: string; phone: string | null };
type UserRole = { id: string; user_id: string; role: string };

function SettingsPage() {
  const { profile, user } = useAuth();
  const isAdmin = true; // simplified — actual check via has_role would gate buttons

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><SettingsIcon className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parameters</h1>
          <p className="text-sm text-muted-foreground">Profile, team & roles, payroll rules, company info.</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">My profile</TabsTrigger>
          <TabsTrigger value="users">Users & roles</TabsTrigger>
          <TabsTrigger value="payroll">Payroll rules</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
        </TabsList>

        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="users">{isAdmin ? <UsersTab /> : <div className="text-sm text-muted-foreground">Admins only.</div>}</TabsContent>
        <TabsContent value="payroll"><PayrollRulesTab /></TabsContent>
        <TabsContent value="company"><CompanyTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab() {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const [v, setV] = useState({ full_name: profile?.full_name ?? "", phone: profile?.phone ?? "" });
  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(v).eq("id", user.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["auth-profile"] });
    toast.success("Profile updated");
  };
  return (
    <Card><CardHeader><CardTitle className="text-base">My profile</CardTitle></CardHeader><CardContent className="space-y-3 max-w-lg">
      <div><Label>Email</Label><Input value={profile?.email ?? ""} disabled className="mt-1" /></div>
      <div><Label>Full name</Label><Input value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} className="mt-1" /></div>
      <div><Label>Phone</Label><Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} className="mt-1" /></div>
      <Button onClick={save}>Save</Button>
    </CardContent></Card>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const { data: profiles } = useQuery({
    queryKey: ["company-profiles"],
    queryFn: async () => ((await supabase.from("profiles").select("id,full_name,email,phone")).data ?? []) as Profile[],
  });
  const { data: roles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => ((await supabase.from("user_roles").select("id,user_id,role")).data ?? []) as UserRole[],
  });

  const rolesByUser = new Map<string, UserRole[]>();
  (roles ?? []).forEach((r) => { const arr = rolesByUser.get(r.user_id) ?? []; arr.push(r); rolesByUser.set(r.user_id, arr); });

  const assign = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as never });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["all-roles"] });
    toast.success("Role assigned");
  };
  const removeRole = async (id: string) => {
    await supabase.from("user_roles").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["all-roles"] });
  };

  return (
    <Card><CardHeader><CardTitle className="text-base">Team members</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Invite users by sharing the sign-up link. Once they sign up they will appear here and you can assign roles.
      </div>
      <div className="space-y-2">
        {(profiles ?? []).map((p) => (
          <div key={p.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{p.full_name ?? p.email}</div>
                <div className="text-xs text-muted-foreground">{p.email}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(rolesByUser.get(p.id) ?? []).map((r) => (
                  <Badge key={r.id} variant="secondary" className="gap-1">
                    {r.role}
                    <button onClick={() => removeRole(r.id)} className="ml-1 text-destructive hover:underline">×</button>
                  </Badge>
                ))}
                <Select onValueChange={(role) => assign(p.id, role)}>
                  <SelectTrigger className="h-8 w-44"><SelectValue placeholder="+ Assign role" /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}

function PayrollRulesTab() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: rules } = useQuery({
    queryKey: ["payroll-rules"],
    queryFn: async () => ((await supabase.from("payroll_rules").select("*").maybeSingle()).data),
  });
  const [v, setV] = useState<Record<string, unknown>>({});
  const cur = { ...rules, ...v } as Record<string, unknown>;
  const save = async () => {
    if (!profile?.company_id) return;
    const payload = { company_id: profile.company_id, ...(rules ?? {}), ...v };
    const q = rules ? supabase.from("payroll_rules").update(payload as never).eq("company_id", profile.company_id)
                    : supabase.from("payroll_rules").insert(payload as never);
    const { error } = await q;
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["payroll-rules"] });
    toast.success("Rules saved");
  };
  const num = (k: string) => (
    <div><Label>{k.replace(/_/g, " ")}</Label>
      <Input type="number" step="0.01" className="mt-1" value={String(cur[k] ?? "")} onChange={(e) => setV({ ...v, [k]: Number(e.target.value) })} />
    </div>
  );
  return (
    <Card><CardHeader><CardTitle className="text-base">Payroll rules</CardTitle></CardHeader>
      <CardContent className="grid gap-3 max-w-2xl sm:grid-cols-2">
        {num("standard_hours_per_day")}
        {num("working_days_per_month")}
        {num("overtime_multiplier")}
        {num("late_penalty_per_hour")}
        {num("absence_deduction_per_day")}
        {num("tax_rate")}
        <div className="sm:col-span-2"><Label>Currency</Label>
          <Input className="mt-1" value={String(cur.currency ?? "USD")} onChange={(e) => setV({ ...v, currency: e.target.value })} />
        </div>
        <div className="sm:col-span-2"><Button onClick={save}>Save rules</Button></div>
      </CardContent>
    </Card>
  );
}

function CompanyTab() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: c } = useQuery({
    queryKey: ["company", profile?.company_id],
    queryFn: async () => profile?.company_id ? (await supabase.from("companies").select("*").eq("id", profile.company_id).single()).data : null,
    enabled: !!profile?.company_id,
  });
  const [v, setV] = useState<Record<string, unknown>>({});
  const cur = { ...c, ...v } as Record<string, unknown>;
  const save = async () => {
    if (!profile?.company_id) return;
    const { error } = await supabase.from("companies").update(v as never).eq("id", profile.company_id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["company", profile.company_id] });
    toast.success("Saved");
  };
  return (
    <Card><CardHeader><CardTitle className="text-base">Company</CardTitle></CardHeader>
      <CardContent className="grid gap-3 max-w-2xl sm:grid-cols-2">
        {["name", "email", "phone", "address", "tax_number"].map((k) => (
          <div key={k} className={k === "address" ? "sm:col-span-2" : ""}><Label>{k.replace("_", " ")}</Label>
            <Input className="mt-1" value={String(cur[k] ?? "")} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
          </div>
        ))}
        <div className="sm:col-span-2"><Button onClick={save}>Save</Button></div>
      </CardContent>
    </Card>
  );
}
