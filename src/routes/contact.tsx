import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
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
import { useSiteContent, getContentValue } from "@/hooks/use-site-content";

type SearchParams = { type?: "quote" | "contact" };

export const Route = createFileRoute("/contact")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    type: s.type === "quote" ? "quote" : "contact",
  }),
  head: () => ({
    meta: [
      { title: "Contact & demande de devis — HYCO SARLU" },
      { name: "description", content: "Obtenez un devis gratuit et sans engagement pour votre projet de construction. Notre équipe répond sous 24 heures." },
      { property: "og:title", content: "Contact & demande de devis — HYCO SARLU" },
      { property: "og:description", content: "Parlez-nous de votre projet de construction. Réponse sous 24 heures." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { t } = useTranslation();
  const { data: content } = useSiteContent();
  const { type: initialType } = Route.useSearch();
  const [type, setType] = useState<"quote" | "contact">(initialType ?? "contact");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Contact details come from the site CMS (cms.footer.contact, edited in
  // the Site Editor / CMS Editor), with flat contact.* keys as a fallback.
  const cmsFooter = (getContentValue(content, "cms", "footer", {}) ?? {}) as {
    contact?: Record<string, string>;
  };
  const cmsContact = cmsFooter.contact ?? {};
  const g = (s: string, k: string, fb: string) => {
    const v = getContentValue(content, s, k, "");
    return typeof v === "string" && v.trim() !== "" ? v.trim() : fb;
  };
  const phone = cmsContact.phone?.trim() || g("contact", "phone", "+243 825 913 789");
  const email = cmsContact.email?.trim() || g("contact", "email", "hello@scer-lconstruct.com");
  const address = cmsContact.address?.trim() || g("contact", "address", "Boulevard Mobutu N°6, Réf. Résidence Equateur, commune Makiso");
  const hours = cmsContact.hours?.trim() || g("contact", "hours", t("contact_page.hours"));

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
      full_name: z.string().min(2, t("contact_page.err_name")),
      email: z.string().email(t("contact_page.err_email")),
      message: z.string().min(10, t("contact_page.err_message")),
    });
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("contact_page.err_invalid"));
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
    toast.success(t("contact_page.success"));
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
                <Clock className="h-3.5 w-3.5 text-accent" /> {t("contact_page.badge")}
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">{t("contact_page.title")}</h1>
              <p className="mt-4 text-lg text-muted-foreground">{t("contact_page.subtitle")}</p>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold">{t("contact_page.reach")}</h2>
              <div className="mt-5 space-y-4 text-sm">
                <div className="flex items-start gap-3"><Phone className="mt-0.5 h-4 w-4 text-primary" />
                  <div><div className="font-medium text-foreground">{phone}</div><div className="text-muted-foreground">{hours}</div></div>
                </div>
                <div className="flex items-start gap-3"><Mail className="mt-0.5 h-4 w-4 text-primary" />
                  <div><div className="font-medium text-foreground">{email}</div><div className="text-muted-foreground">{t("contact_page.for_bids")}</div></div>
                </div>
                <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 text-primary" />
                  <div><div className="font-medium text-foreground">{t("contact_page.head_office")}</div><div className="text-muted-foreground">{address}</div></div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="text-sm font-semibold">{t("contact_page.client_title")}</div>
              <p className="mt-1 text-sm text-muted-foreground">{t("contact_page.client_desc")}</p>
              <Link to="/auth"><Button variant="outline" size="sm" className="mt-3">{t("contact_page.open_portal")}</Button></Link>
            </div>
            <div className="rounded-xl border border-border bg-primary/5 p-5">
              <div className="text-sm font-semibold text-primary">{t("contact_page.next_title")}</div>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>{t("contact_page.next_1")}</li>
                <li>{t("contact_page.next_2")}</li>
                <li>{t("contact_page.next_3")}</li>
              </ol>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex gap-2 rounded-lg bg-muted p-1 text-sm">
              <button type="button" onClick={() => setType("quote")} className={`flex-1 rounded-md px-3 py-2 font-medium transition ${type === "quote" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>{t("contact_page.tab_quote")}</button>
              <button type="button" onClick={() => setType("contact")} className={`flex-1 rounded-md px-3 py-2 font-medium transition ${type === "contact" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>{t("contact_page.tab_contact")}</button>
            </div>

            {done ? (
              <div className="grid place-items-center py-16 text-center">
                <CheckCircle2 className="h-12 w-12 text-success" />
                <h3 className="mt-4 text-xl font-semibold">{t("contact_page.done_title")}</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("contact_page.done_desc")}</p>
                <Button variant="outline" className="mt-5" onClick={() => setDone(false)}>{t("contact_page.send_another")}</Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>{t("contact_page.full_name")}</Label><Input required name="full_name" className="mt-1" /></div>
                  <div><Label>{t("contact_page.email")}</Label><Input required type="email" name="email" className="mt-1" /></div>
                  <div><Label>{t("contact_page.phone")}</Label><Input name="phone" className="mt-1" /></div>
                  <div><Label>{t("contact_page.company")}</Label><Input name="company" className="mt-1" /></div>
                </div>

                {type === "quote" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>{t("contact_page.project_type")}</Label>
                      <Select name="project_type">
                        <SelectTrigger className="mt-1"><SelectValue placeholder={t("contact_page.select")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="residential">{t("contact_page.type_residential")}</SelectItem>
                          <SelectItem value="commercial">{t("contact_page.type_commercial")}</SelectItem>
                          <SelectItem value="industrial">{t("contact_page.type_industrial")}</SelectItem>
                          <SelectItem value="renovation">{t("contact_page.type_renovation")}</SelectItem>
                          <SelectItem value="infrastructure">{t("contact_page.type_infrastructure")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t("contact_page.budget")}</Label>
                      <Select name="budget_range">
                        <SelectTrigger className="mt-1"><SelectValue placeholder={t("contact_page.select")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<100k">&lt; 100 000 $</SelectItem>
                          <SelectItem value="100k-500k">100 000 $ – 500 000 $</SelectItem>
                          <SelectItem value="500k-2m">500 000 $ – 2 M$</SelectItem>
                          <SelectItem value="2m-10m">2 M$ – 10 M$</SelectItem>
                          <SelectItem value=">10m">10 M$ et plus</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2"><Label>{t("contact_page.location")}</Label><Input name="location" placeholder={t("contact_page.location_ph")} className="mt-1" /></div>
                  </div>
                )}

                <div>
                  <Label>{type === "quote" ? t("contact_page.desc_quote") : t("contact_page.desc_contact")}</Label>
                  <Textarea required name="message" rows={5} className="mt-1" placeholder={type === "quote" ? t("contact_page.ph_quote") : t("contact_page.ph_contact")} />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? t("contact_page.sending") : type === "quote" ? t("contact_page.submit_quote") : t("contact_page.submit_contact")}
                </Button>
                <p className="text-center text-xs text-muted-foreground">{t("contact_page.consent")}</p>
              </form>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
