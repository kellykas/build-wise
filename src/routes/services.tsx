import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  Building2, Home, Factory, Hammer, Ruler, Truck,
  ArrowRight,
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
        {/* Intro */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
            <div className="max-w-3xl">
              <span className="eyebrow-rule" />
              <span className="eyebrow">{t("services_page.badge")}</span>
              <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">{t("services_page.title")}</h1>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">{t("services_page.subtitle")}</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link to="/contact" search={{ type: "quote" }}><Button>{t("services_page.cta_quote")} <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
                <Link
                  to="/projects"
                  className="link-underline inline-flex h-9 items-center text-sm font-semibold text-foreground"
                >
                  {t("services_page.cta_projects")}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Services — open editorial columns */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {hasCmsServices ? (
              // Render from CMS data
              cmsServices.map((s) => (
                <div key={s.id} className="group border-t-2 border-border pt-6">
                  <h3 className="text-lg font-semibold leading-snug">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                  {s.points && s.points.length > 0 && (
                    <ul className="mt-4 space-y-2 text-sm">
                      {s.points.filter(Boolean).map((p, i) => (
                        <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                          <span aria-hidden className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-primary" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link to="/contact" search={{ type: "quote" }} className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    <span className="link-underline">{t("services_page.quote_for_this")}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              ))
            ) : (
              // Fallback: render from i18n translations
              serviceKeys.map((s) => (
                <div key={s.key} className="group border-t-2 border-border pt-6">
                  <s.icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-4 text-lg font-semibold leading-snug">{t(`services_page.items.${s.key}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`services_page.items.${s.key}.desc`)}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {["p1", "p2", "p3", "p4"].map((p) => (
                      <li key={p} className="flex items-start gap-2.5 leading-relaxed">
                        <span aria-hidden className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-primary" />
                        <span>{t(`services_page.items.${s.key}.${p}`)}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/contact" search={{ type: "quote" }} className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    <span className="link-underline">{t("services_page.quote_for_this")}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Process — numbered editorial row */}
        <section className="section-line bg-secondary/50">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <span className="eyebrow-rule" />
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("services_page.process_title")}</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{t("services_page.process_subtitle")}</p>
            </div>
            <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 md:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s} className="border-t border-border pt-5">
                  <div className="font-mono text-sm text-primary">{`0${i + 1}`}</div>
                  <div className="mt-3 font-semibold leading-snug">{t(`services_page.process.${s}_t`)}</div>
                  <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`services_page.process.${s}_d`)}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("services_page.final_title")}</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{t("services_page.final_subtitle")}</p>
          <Link to="/contact" search={{ type: "quote" }}><Button size="lg" className="mt-7">{t("services_page.cta_quote")} <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
