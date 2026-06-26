import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — BuildFlow ERP" },
      { name: "description", content: "Talk to the BuildFlow team about your construction company." },
    ],
  }),
  component: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto grid max-w-7xl flex-1 gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Get in touch</h1>
          <p className="mt-4 text-muted-foreground">Tell us about your operation and we'll show you a tailored demo.</p>
          <div className="mt-10 space-y-4 text-sm">
            <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-primary" /> hello@buildflow.app</div>
            <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-primary" /> +1 (555) 010-1010</div>
            <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-primary" /> 100 Construction Ave, Suite 500</div>
          </div>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); toast.success("Thanks — we'll reach out shortly."); (e.target as HTMLFormElement).reset(); }}
          className="rounded-xl border border-border bg-card p-6"
        >
          <div className="grid gap-4">
            <div><Label>Full name</Label><Input required name="name" className="mt-1" /></div>
            <div><Label>Work email</Label><Input required type="email" name="email" className="mt-1" /></div>
            <div><Label>Company</Label><Input name="company" className="mt-1" /></div>
            <div><Label>Message</Label><Textarea required name="message" rows={5} className="mt-1" /></div>
            <Button type="submit" className="w-full">Send message</Button>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  ),
});
