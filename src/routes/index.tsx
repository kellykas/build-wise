import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation, Trans } from "react-i18next";
import scerLogoAsset from "@/assets/scer-logo.png.asset.json";
import {
  ArrowRight, Building2, Home, Factory, Hammer, ShieldCheck,
  Award, Quote, CheckCircle2, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scer-L/Construct Sarl — Engagés pour construire vos rêves" },
      { name: "description", content: "Full-service general contractor delivering commercial, residential, industrial and infrastructure projects on time and on budget. Engagés pour construire vos rêves." },
    ],
  }),
  component: Home_,
});









function Home_() {
  const { t } = useTranslation();

  const services = [
    { icon: Building2, title: t("services_section.commercial.title"), desc: t("services_section.commercial.desc") },
    { icon: Home, title: t("services_section.residential.title"), desc: t("services_section.residential.desc") },
    { icon: Factory, title: t("services_section.industrial.title"), desc: t("services_section.industrial.desc") },
    { icon: Hammer, title: t("services_section.renovation.title"), desc: t("services_section.renovation.desc") },
  ];

  const featured = [
    { title: t("featured.riverside.title"), tag: t("featured.riverside.tag"), img: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&q=70&auto=format&fit=crop" },
    { title: t("featured.maple.title"), tag: t("featured.maple.tag"), img: "https://images.unsplash.com/photo-1448630360428-65456885c650?w=900&q=70&auto=format&fit=crop" },
    { title: t("featured.northgate.title"), tag: t("featured.northgate.tag"), img: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=900&q=70&auto=format&fit=crop" },
  ];

  const stats = [
    { v: "500+", l: t("stats.projects") },
    { v: "25 yrs", l: t("stats.years") },
    { v: "$2.4B", l: t("stats.value") },
    { v: "98%", l: t("stats.ontime") },
  ];

  const whyPointsRaw = t("why_us.points", { returnObjects: true });
  const whyPoints: string[] = Array.isArray(whyPointsRaw) ? whyPointsRaw : [String(whyPointsRaw)];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10">
          <img
            src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1800&q=70&auto=format&fit=crop"
            alt="Construction crew on a high-rise site at sunrise"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
        </div>
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-24 sm:px-6 md:py-32">
          <div className="max-w-2xl">
            <img src={scerLogoAsset.url} alt="Scer-L/Construct Sarl" className="h-24 w-24 mb-6" />
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" /> {t("hero.badge")}
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">
              <Trans i18nKey="hero.title" components={{ 1: <span className="text-accent" /> }} />
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              {t("hero.subtitle")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/contact" search={{ type: "quote" }}>
                <Button size="lg">{t("hero.cta_quote")} <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
              <Link to="/projects"><Button size="lg" variant="outline">{t("hero.cta_projects")}</Button></Link>
            </div>
            <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 text-primary" /> {t("hero.phone_label")} <span className="font-semibold text-foreground">{t("hero.phone_number")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
          {stats.map((s) => (
            <div key={s.l} className="text-center sm:text-left">
              <div className="text-3xl font-bold text-primary">{s.v}</div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("services_section.title")}</h2>
              <p className="mt-3 text-muted-foreground">{t("services_section.subtitle")}</p>
            </div>
            <Link to="/services" className="text-sm font-medium text-primary hover:underline">{t("services_section.view_all")}</Link>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((f) => (
              <Link key={f.title} to="/services" className="group rounded-xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                <div className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 font-semibold">{f.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{f.desc}</div>
                <div className="mt-4 inline-flex items-center text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">
                  {t("services_section.learn_more")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured projects */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("featured.title")}</h2>
              <p className="mt-3 text-muted-foreground">{t("featured.subtitle")}</p>
            </div>
            <Link to="/projects" className="text-sm font-medium text-primary hover:underline">{t("featured.view_all")}</Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {featured.map((p) => (
              <Link key={p.title} to="/projects" className="group overflow-hidden rounded-2xl border border-border bg-card">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img src={p.img} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <div className="p-5">
                  <div className="text-xs uppercase tracking-wide text-primary">{p.tag}</div>
                  <div className="mt-1 text-lg font-semibold">{p.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("why_us.title")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("why_us.subtitle")}
            </p>
            <ul className="mt-8 space-y-3">
              {whyPoints.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> <span>{p}</span></li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4">
            {["1", "2", "3"].map((key) => (
              <figure key={key} className="rounded-2xl border border-border bg-card p-6">
                <Quote className="h-5 w-5 text-primary" />
                <blockquote className="mt-3 text-sm text-foreground">“{t(`testimonials.${key}.quote`)}”</blockquote>
                <figcaption className="mt-3 text-xs text-muted-foreground">— {t(`testimonials.${key}.author`)}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> {t("certifications.enr")}</div>
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> {t("certifications.osha")}</div>
            <div className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> {t("certifications.leed")}</div>
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> {t("certifications.iso")}</div>
            <div className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> {t("certifications.agc")}</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-[2fr_1fr] md:items-center">
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">{t("cta.title")}</h2>
            <p className="mt-3 opacity-90">{t("cta.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link to="/contact" search={{ type: "quote" }}><Button size="lg" variant="secondary">{t("cta.quote_btn")}</Button></Link>
            <Link to="/contact"><Button size="lg" variant="outline" className="bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary">{t("cta.hi_btn")}</Button></Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
