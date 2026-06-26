import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

type SearchParams = { type?: "quote" | "contact" };

export const Route = createFileRoute("/contact")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    type: s.type === "quote" ? "quote" : "contact",
  }),
  head: () => ({
    meta: [
      { title: "Contact & Request a Quote — BuildFlow Construction" },
      { name: "description", content: "Get a free, no-obligation quote for your construction project. Our team responds within 24 hours." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { type: initialType } = Route.useSearch();
  const [type, setType] = useState<"quote" | "contact">(initialType ?? "contact");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      type,
      full_name: String(fd.get("full_name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? "") || null,
      company: String(fd.get("company") ?? "") || null,
      project_type: String(fd.get("project_type") ?? "") || null,
      budget_range: String(fd.get("budget_range") ?? "") || null,
      location: String(fd.get("location") ?? "") || null,
      message: String(fd.get("message") ?? ""),
    };
    const schema = z.object({
      full_name: z.string().min(2, "Please enter your name"),
      email: z.string().email("Valid email required"),
      message: z.string().min(10, "Tell us a bit more about your project"),
    });
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("inquiries").insert(payload);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    toast.success("Thank you — we'll be in touch within 24 hours.");
    (e.target as HTMLFormElement).reset();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-accent" /> 24-hour response · Free site visit
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">Let's build something exceptional.</h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Whether you need a quote for a new build, want to discuss a renovation, or have a question about an active project — our team is ready to help.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold">Reach our team</h2>
              <div className="mt-5 space-y-4 text-sm">
                <div className="flex items-start gap-3"><Phone className="mt-0.5 h-4 w-4 text-primary" />
                  <div><div className="font-medium text-foreground">+1 (555) 240-8800</div><div className="text-muted-foreground">Mon–Sat · 7am to 7pm</div></div>
                </div>
                <div className="flex items-start gap-3"><Mail className="mt-0.5 h-4 w-4 text-primary" />
                  <div><div className="font-medium text-foreground">hello@buildflow.co</div><div className="text-muted-foreground">For bids & general enquiries</div></div>
                </div>
                <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 text-primary" />
                  <div><div className="font-medium text-foreground">Head office</div><div className="text-muted-foreground">240 Riverside Ave, Suite 1100</div></div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="text-sm font-semibold">Already a client or crew member?</div>
              <p className="mt-1 text-sm text-muted-foreground">Sign in to the project portal to view drawings, RFIs, invoices and timesheets.</p>
              <Link to="/auth"><Button variant="outline" size="sm" className="mt-3">Open the portal</Button></Link>
            </div>
            <div className="rounded-xl border border-border bg-primary/5 p-5">
              <div className="text-sm font-semibold text-primary">What happens next?</div>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>1. A project manager reviews your enquiry.</li>
                <li>2. We schedule a free 30-min consultation.</li>
                <li>3. You receive a detailed, itemised proposal.</li>
              </ol>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex gap-2 rounded-lg bg-muted p-1 text-sm">
              <button type="button" onClick={() => setType("quote")} className={`flex-1 rounded-md px-3 py-2 font-medium transition ${type === "quote" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Request a quote</button>
              <button type="button" onClick={() => setType("contact")} className={`flex-1 rounded-md px-3 py-2 font-medium transition ${type === "contact" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>General enquiry</button>
            </div>

            {done ? (
              <div className="grid place-items-center py-16 text-center">
                <CheckCircle2 className="h-12 w-12 text-success" />
                <h3 className="mt-4 text-xl font-semibold">Message received</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">A member of our team will respond to you within one business day.</p>
                <Button variant="outline" className="mt-5" onClick={() => setDone(false)}>Send another</Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>Full name *</Label><Input required name="full_name" className="mt-1" /></div>
                  <div><Label>Email *</Label><Input required type="email" name="email" className="mt-1" /></div>
                  <div><Label>Phone</Label><Input name="phone" className="mt-1" /></div>
                  <div><Label>Company</Label><Input name="company" className="mt-1" /></div>
                </div>

                {type === "quote" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Project type</Label>
                      <Select name="project_type">
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="residential">Residential</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="industrial">Industrial</SelectItem>
                          <SelectItem value="renovation">Renovation / Fit-out</SelectItem>
                          <SelectItem value="infrastructure">Infrastructure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Budget range</Label>
                      <Select name="budget_range">
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<100k">Under $100k</SelectItem>
                          <SelectItem value="100k-500k">$100k – $500k</SelectItem>
                          <SelectItem value="500k-2m">$500k – $2M</SelectItem>
                          <SelectItem value="2m-10m">$2M – $10M</SelectItem>
                          <SelectItem value=">10m">$10M+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2"><Label>Project location</Label><Input name="location" placeholder="City, state" className="mt-1" /></div>
                  </div>
                )}

                <div>
                  <Label>{type === "quote" ? "Project description *" : "Message *"}</Label>
                  <Textarea required name="message" rows={5} className="mt-1" placeholder={type === "quote" ? "Scope, timeline, square footage, special requirements…" : "How can we help?"} />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Sending…" : type === "quote" ? "Submit quote request" : "Send message"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">By submitting you agree to be contacted regarding your enquiry.</p>
              </form>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
