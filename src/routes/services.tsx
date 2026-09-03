import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  Building2, Home, Factory, Hammer, Ruler, Truck,
  ArrowRight, CheckCircle2, ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const serviceIcons = [Building2, Home, Factory, Hammer, Ruler, Truck];

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Construction Services - Scer-L/Construct Sarl" },
      { name: "description", content: "Commercial, residential, industrial and renovation construction services." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const { t } = useTranslation();

  const services = [
    {
      icon: serviceIcons[0],
      title: t("services_page.s_commercial"),
      desc: t("services_page.s_commercial_d"),
      points: [t("services_page.s_commercial_p1"), t("services_page.s_commercial_p2"), t("services_page.s_commercial_p3"), t("services_page.s_commercial_p4")],
    },
    {
      icon: serviceIcons[1],
      title: t("services_page.s_residential"),
      desc: t("services_page.s_residential_d"),
      points: [t("services_page.s_residential_p1"), t("services_page.s_residential_p2"), t("services_page.s_residential_p3"), t("services_page.s_residential_p4")],
    },
    {
      icon: serviceIcons[2],
      title: t("services_page.s_industrial"),
      desc: t("services_page.s_industrial_d"),
      points: [t("services_page.s_industrial_p1"), t("services_page.s_industrial_p2"), t("services_page.s_industrial_p3"), t("services_page.s_industrial_p4")],
    },
    {
      icon: serviceIcons[3],
      title: t("services_page.s_renovation"),
      desc: t("services_page.s_renovation_d"),
      points: [t("services_page.s_renovation_p1"), t("services_page.s_renovation_p2"), t("services_page.s_renovation_p3"), t("services_page.s_renovation_p4")],
    },
    {
      icon: serviceIcons[4],
      title: t("services_page.s_designbuild"),
      desc: t("services_page.s_designbuild_d"),
      points: [t("services_page.s_designbuild_p1"), t("services_page.s_designbuild_p2"), t("services_page.s_designbuild_p3"), t("services_page.s_designbuild_p4")],
    },
    {
      icon: serviceIcons[5],
      title: t("services_page.s_cm"),
      desc: t("services_page.s_cm_d"),
      points: [t("services_page.s_cm_p1"), t("services_page.s_cm_p2"), t("services_page.s_cm_p3"), t("services_page.s_cm_p4")],
    },
  ];

  const process = [
    { n: "01", t: t("services_page.step1_title"), d: t("services_page.step1_d") },
    { n: "02", t: t("services_page.step2_title"), d: t("services_page.step2_d") },
    { n: "03", t: t("services_page.step3_title"), d: t("services_page.step3_d") },
    { n: "04", t: t("services_page.step4_title"), d: t("services_page.step4_d") },
  ];

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
              <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">{t("services_page.title")}</h1>
              <p className="mt-4 text-lg text-muted-foreground">
                {t("services_page.subtitle")}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/contact" search={{ type: "quote" }}><Button size="lg">{t("services_page.request_quote")} <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                <Link to="/projects"><Button size="lg" variant="outline">{t("services_page.see_projects")}</Button></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div key={s.title} className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {s.points.map((p) => (
                    <li key={p} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> <span>{p}</span></li>
                  ))}
                </ul>
                <Link to="/contact" search={{ type: "quote" }} className="mt-5 inline-flex items-center text-sm font-medium text-primary group-hover:underline">
                  {t("services_page.quote_for")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("services_page.how_title")}</h2>
              <p className="mt-3 text-muted-foreground">{t("services_page.how_subtitle")}</p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-4">
              {process.map((p) => (
                <div key={p.n} className="rounded-xl border border-border bg-card p-6">
                  <div className="text-sm font-mono text-primary">{p.n}</div>
                  <div className="mt-3 font-semibold">{p.t}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{p.d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-bold md:text-4xl">{t("services_page.have_project")}</h2>
          <p className="mt-3 text-muted-foreground">{t("services_page.have_project_d")}</p>
          <Link to="/contact" search={{ type: "quote" }}><Button size="lg" className="mt-6">{t("services_page.request_quote")} <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
