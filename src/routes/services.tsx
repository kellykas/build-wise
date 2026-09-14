import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  Building2, Home, Factory, Hammer, Ruler, Truck,
  ArrowRight, CheckCircle2, ShieldCheck,
} from "lucide-react";
import { useSiteContent, getContentValue } from "@/hooks/use-site-content";

const serviceKeys = [
  { key: "commercial", icon: Building2 },
  { key: "residential", icon: Home },
  { key: "industrial", icon: Factory },
  { key: "renovation", icon: Hammer },
  { key: "design", icon: Ruler },
  { key: "management", icon: Truck },
] as const;

const steps = ["s1", "s2", "s3", "s4"] as const;

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services de construction — Scer-L/Construct Sarl" },
      { name: "description", content: "Construction commerciale, résidentielle, industrielle et rénovation. Conception-réalisation, gestion de projet et pré-construction." },
      { property: "og:title", content: "Services de construction — Scer-L/Construct Sarl" },
      { property: "og:description", content: "Nos services de construction de A à Z : conception, pré-construction, travaux et réception." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServicesPage,
});

type CmsService = { id: string; key: string; title: string; desc: string; points: string[]; icon: string };

function ServicesPage() {
  const { t } = useTranslation();
  const { data: siteContent } = useSiteContent();

  // Load services from CMS if available
  const cmsServices = getContentValue(siteContent, "cms", "services") as CmsService[] | null;
  const hasCmsServices = cmsServices && cmsServices.length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" /> {t("services_page.badge")}
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">{t("services_page.title")}</h1>
              <p className="mt-4 text-base text-muted-foreground sm:text-lg">{t("services_page.subtitle")}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/contact" search={{ type: "quote" }}><Button size="lg">{t("services_page.cta_quote")} <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                <Link to="/projects"><Button size="lg" variant="outline">{t("services_page.cta_projects")}</Button></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {hasCmsServices ? (
              // Render from CMS data
              cmsServices.map((s) => (
                <div key={s.id} className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                  {s.points && s.points.length > 0 && (
                    <ul className="mt-4 space-y-2 text-sm">
                      {s.points.filter(Boolean).map((p, i) => (
                        <li key={i} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> <span>{p}</span></li>
                      ))}
                    </ul>
                  )}
                  <Link to="/contact" search={{ type: "quote" }} className="mt-5 inline-flex items-center text-sm font-medium text-primary group-hover:underline">
                    {t("services_page.quote_for_this")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              ))
            ) : (
              // Fallback: render from i18n translations
              serviceKeys.map((s) => (
                <div key={s.key} className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{t(`services_page.items.${s.key}.title`)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t(`services_page.items.${s.key}.desc`)}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {["p1", "p2", "p3", "p4"].map((p) => (
                      <li key={p} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> <span>{t(`services_page.items.${s.key}.${p}`)}</span></li>
                    ))}
                  </ul>
                  <Link to="/contact" search={{ type: "quote" }} className="mt-5 inline-flex items-center text-sm font-medium text-primary group-hover:underline">
                    {t("services_page.quote_for_this")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("services_page.process_title")}</h2>
              <p className="mt-3 text-muted-foreground">{t("services_page.process_subtitle")}</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
              {steps.map((s, i) => (
                <div key={s} className="rounded-xl border border-border bg-card p-6">
                  <div className="text-sm font-mono text-primary">{`0${i + 1}`}</div>
                  <div className="mt-3 font-semibold">{t(`services_page.process.${s}_t`)}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{t(`services_page.process.${s}_d`)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-bold md:text-4xl">{t("services_page.final_title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("services_page.final_subtitle")}</p>
          <Link to="/contact" search={{ type: "quote" }}><Button size="lg" className="mt-6">{t("services_page.cta_quote")} <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
