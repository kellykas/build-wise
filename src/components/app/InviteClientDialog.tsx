import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Loader2, Copy, Check } from "lucide-react";

type Props = { children: React.ReactNode };

export function InviteClientDialog({ children }: Props) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    company: "",
    phone: "",
    temp_password: "",
  });

  // Generate a random temp password on open
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pw = "";
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    return pw;
  };

  const handleOpen = (v: boolean) => {
    setOpen(v);
    if (v) {
      setForm({ full_name: "", email: "", company: "", phone: "", temp_password: generatePassword() });
      setCopied(false);
    }
  };

  const invite = useMutation({
    mutationFn: async () => {
      if (!profile?.company_id) throw new Error("No company");
      if (!form.email || !form.full_name) throw new Error("Name and email are required");

      // 1. Create Supabase auth user via admin API (requires service role or admin)
      //    We use the edge function pattern: create user via signInWithPassword won't work,
      //    so we use the Supabase admin API through a direct call
      const { data: settingsData } = await supabase
        .from("companies" as never)
        .select("id" as never)
        .eq("id", profile.company_id)
        .single();

      if (!settingsData) throw new Error("Company not found");

      // Create the user via Supabase auth (this will work if the current user is admin)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: form.email,
        password: form.temp_password,
        email_confirm: true,
        user_metadata: {
          full_name: form.full_name,
          company_id: profile.company_id,
          role: "client",
        },
      });

      if (authError) {
        // If admin API not available, try the standard signUp approach
        // This creates an unconfirmed user that needs email verification
        const { error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.temp_password,
          options: {
            data: {
              full_name: form.full_name,
              company_id: profile.company_id,
              role: "client",
            },
          },
        });
        if (signUpError) throw signUpError;

        // Get the newly created user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User created but not found");

        // 2. Create client record
        const { data: clientRecord, error: clientError } = await supabase
          .from("clients")
          .insert({
            company_id: profile.company_id,
            user_id: user.id,
            name: form.full_name,
            email: form.email,
            company: form.company || null,
            phone: form.phone || null,
          } as never)
          .select("id")
          .single();

        if (clientError) throw clientError;

        // 3. Assign client role
        await supabase.from("user_roles").insert({
          user_id: user.id,
          role: "client",
          company_id: profile.company_id,
        } as never);

        return { userId: user.id, clientId: (clientRecord as { id: string }).id };
      }

      // Admin API worked
      const userId = authData.user.id;

      // 2. Create client record
      const { data: clientRecord, error: clientError } = await supabase
        .from("clients")
        .insert({
          company_id: profile.company_id,
          user_id: userId,
          name: form.full_name,
          email: form.email,
          company: form.company || null,
          phone: form.phone || null,
        } as never)
        .select("id")
        .single();

      if (clientError) throw clientError;

      // 3. Assign client role
      await supabase.from("user_roles").insert({
        user_id: userId,
        role: "client",
        company_id: profile.company_id,
      } as never);

      return { userId, clientId: (clientRecord as { id: string }).id };
    },
    onSuccess: () => {
      toast.success("Client account created successfully");
      qc.invalidateQueries({ queryKey: ["module:clients"] });
      setOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create client account");
    },
  });

  const copyPassword = () => {
    navigator.clipboard.writeText(form.temp_password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Invite Client
          </DialogTitle>
          <DialogDescription>
            Create a client account with login credentials. Share the email and temporary password with the client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Full Name *</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="e.g. John Smith"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="john@company.com"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Company</Label>
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Company name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 555 000 0000"
                className="mt-1"
              />
            </div>
          </div>

          {/* Temporary password */}
          <div>
            <Label>Temporary Password</Label>
            <div className="mt-1 flex gap-2">
              <Input
                value={form.temp_password}
                onChange={(e) => setForm({ ...form, temp_password: e.target.value })}
                className="font-mono"
              />
              <Button type="button" variant="outline" size="icon" onClick={copyPassword}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Copy this password and share it securely with the client.
            </p>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <strong>Important:</strong> The client will receive their login credentials via the password you copy above. Share it through a secure channel (phone, in-person, etc.) — not email.
          </div>

          <Button
            onClick={() => invite.mutate()}
            disabled={invite.isPending || !form.full_name || !form.email || !form.temp_password}
            className="w-full"
          >
            {invite.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Create Client Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
