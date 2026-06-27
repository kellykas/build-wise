import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Bell, Send, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/notifications")({
  component: NotificationsPage,
});

const TYPES = [
  { v: "info", label: "Information" },
  { v: "task", label: "Tâche" },
  { v: "requisition", label: "État de besoin" },
  { v: "approval", label: "Approbation" },
  { v: "urgent", label: "Urgence" },
];

function NotificationsPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [type, setType] = useState("info");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [recipients, setRecipients] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");

  const { data: profiles } = useQuery({
    queryKey: ["profiles-pickable"],
    queryFn: async () => (await supabase.from("profiles").select("id,full_name,email").neq("id", user?.id ?? "")).data ?? [],
  });

  const { data: inbox } = useQuery({
    queryKey: ["my-internal-notifs", user?.id],
    queryFn: async () => (await supabase.from("internal_notifications").select("*, sender:profiles!internal_notifications_sender_id_fkey(full_name)").eq("recipient_id", user!.id).order("created_at", { ascending: false }).limit(50)).data ?? [],
    enabled: !!user,
  });

  const { data: sent } = useQuery({
    queryKey: ["my-sent-notifs", user?.id],
    queryFn: async () => (await supabase.from("internal_notifications").select("*, recipient:profiles!internal_notifications_recipient_id_fkey(full_name)").eq("sender_id", user!.id).order("created_at", { ascending: false }).limit(50)).data ?? [],
    enabled: !!user,
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!profile?.company_id) throw new Error("No company");
      if (recipients.length === 0) throw new Error("Choisissez au moins un destinataire");
      const rows = recipients.map((r) => ({
        company_id: profile.company_id, sender_id: user!.id, recipient_id: r.id,
        type: type as any, title, message: message || null, link: link || null,
      }));
      const { error } = await supabase.from("internal_notifications").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Notification envoyée à ${recipients.length} destinataire(s)`);
      qc.invalidateQueries({ queryKey: ["my-sent-notifs"] });
      setTitle(""); setMessage(""); setLink(""); setRecipients([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("internal_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-internal-notifs"] }),
  });

  const filteredProfiles = (profiles ?? []).filter((p: any) =>
    !search || (p.full_name ?? p.email ?? "").toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Bell className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications internes</h1>
          <p className="text-sm text-muted-foreground">Communiquez en temps réel avec vos équipes.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader><CardTitle className="text-base">Nouvelle notification</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Titre *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Validation requise sur EB-001234" />
            </div>
            <div className="grid gap-2">
              <Label>Message</Label>
              <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Lien (optionnel)</Label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/app/requisitions/…" />
            </div>
            <Button className="w-fit" onClick={() => send.mutate()} disabled={!title || recipients.length === 0 || send.isPending}>
              <Send className="mr-2 h-4 w-4" /> Envoyer à {recipients.length || 0} destinataire(s)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Destinataires</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Rechercher un destinataire…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <div className="rounded-md border border-border divide-y divide-border">
                {filteredProfiles.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">Aucun résultat</div>
                ) : filteredProfiles.map((p: any) => (
                  <button key={p.id} className="flex w-full items-center justify-between p-2 text-sm hover:bg-muted/50"
                    onClick={() => {
                      if (!recipients.find((r) => r.id === p.id))
                        setRecipients([...recipients, { id: p.id, name: p.full_name ?? p.email }]);
                      setSearch("");
                    }}>
                    <span>{p.full_name ?? p.email}</span>
                    <span className="text-xs text-muted-foreground">+ ajouter</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {recipients.length === 0 ? (
                <div className="text-xs text-muted-foreground">Aucun destinataire sélectionné.</div>
              ) : recipients.map((r) => (
                <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium">
                  {r.name}
                  <button onClick={() => setRecipients(recipients.filter((x) => x.id !== r.id))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">Boîte de réception</TabsTrigger>
          <TabsTrigger value="sent">Historique envoyé</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox">
          <Card><CardContent className="p-0">
            <div className="divide-y divide-border">
              {(inbox ?? []).length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">Aucune notification.</div>
              ) : inbox!.map((n: any) => (
                <div key={n.id} className={`flex items-start gap-4 p-4 ${!n.read_at ? "bg-primary/5" : ""}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={n.type === "urgent" ? "danger" : n.type === "approval" ? "warning" : "info"}>{n.type}</StatusBadge>
                      <div className="font-medium">{n.title}</div>
                      {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    {n.message && <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>}
                    <div className="mt-1 text-xs text-muted-foreground">
                      De {n.sender?.full_name ?? "Système"} · {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                  {!n.read_at && <Button size="sm" variant="outline" onClick={() => markRead.mutate(n.id)}>Marquer lu</Button>}
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="sent">
          <Card><CardContent className="p-0">
            <div className="divide-y divide-border">
              {(sent ?? []).length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">Aucun envoi.</div>
              ) : sent!.map((n: any) => (
                <div key={n.id} className="flex items-start gap-4 p-4">
                  <div className="flex-1">
                    <div className="font-medium">{n.title}</div>
                    {n.message && <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>}
                    <div className="mt-1 text-xs text-muted-foreground">
                      À {n.recipient?.full_name ?? "—"} · {new Date(n.created_at).toLocaleString()} · {n.read_at ? "Lu" : "Non lu"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
