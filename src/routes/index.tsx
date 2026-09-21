import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight, Building2, Home, Factory, Hammer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";
import { useSiteContent, siteText, siteList } from "@/hooks/use-site-content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scer-L/Construct Sarl, Engagés pour construire vos rêves" },
      { name: "description", content: "Entrepreneur général offrant des services complets pour des projets commerciaux, résidentiels, industriels et d'infrastructure. À temps. Dans le budget. Engagés pour construire vos rêves." },
    ],
  }),
  component: Home_,
});

function Home_() {
  const { t } = useTranslation();
  const { data: content } = useSiteContent();
  // CMS content always takes priority over i18n fallbacks.
  // The i18n values are only used when the CMS has no value for a key.
  const s = (section: string, key: string, fallback: string) => {
    return siteText(content, section, key, fallback);
  };

  // Hero background can be replaced from the Site Editor (Section Hero →
  // image upload). Stored under section "hero", key "background_image".
  const heroImageFallback =
    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1800&q=70&auto=format&fit=crop";
  const heroImage = s("hero", "background_image", heroImageFallback);

  const serviceIcons = [Building2, Home, Factory, Hammer];
  const services = siteList<{ title: string; desc: string }>(content, "services", "items", [
    { title: t("services_section.commercial.title"), desc: t("services_section.commercial.desc") },
    { title: t("services_section.residential.title"), desc: t("services_section.residential.desc") },
    { title: t("services_section.industrial.title"), desc: t("services_section.industrial.desc") },
    { title: t("services_section.renovation.title"), desc: t("services_section.renovation.desc") },
  ]).map((item, i) => ({ ...item, icon: serviceIcons[i % serviceIcons.length] }));

  const featuredImgs = [
    "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1448630360428-65456885c650?w=900&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=900&q=70&auto=format&fit=crop",
  ];
  const featured = siteList<{ title: string; tag: string; img?: string; imgs?: string[] }>(content, "featured", "items", [
    { title: t("featured.riverside.title"), tag: t("featured.riverside.tag") },
    { title: t("featured.maple.title"), tag: t("featured.maple.tag") },
    { title: t("featured.northgate.title"), tag: t("featured.northgate.tag") },
  ]).map((p, i) => ({
    ...p,
    // Support multiple images per featured project (imgs array).
    // If only a single img string is provided, wrap it in an array.
    imgs: p.imgs && Array.isArray(p.imgs) && p.imgs.length > 0
      ? p.imgs
      : (p.img ? [p.img] : [featuredImgs[i % featuredImgs.length]]),
  }));

  const stats = siteList<{ v: string; l: string }>(content, "stats", "items", [
    { v: "500+", l: t("stats.projects") },
    { v: "25 yrs", l: t("stats.years") },
    { v: "$2.4B", l: t("stats.value") },
    { v: "98%", l: t("stats.ontime") },
  ]);

  const whyPointsRaw = t("why_us.points", { returnObjects: true });
  const whyFallback: string[] = Array.isArray(whyPointsRaw) ? whyPointsRaw : [String(whyPointsRaw)];
  const whyPoints = siteList<string>(content, "why_us", "points", whyFallback);

  const testimonials = siteList<{ quote: string; author: string }>(content, "testimonials", "items", [
    { quote: t("testimonials.1.quote"), author: t("testimonials.1.author") },
    { quote: t("testimonials.2.quote"), author: t("testimonials.2.author") },
    { quote: t("testimonials.3.quote"), author: t("testimonials.3.author") },
  ]);

  const certifications = siteList<string>(content, "certifications", "items", [
    t("certifications.enr"), t("certifications.osha"), t("certifications.leed"),
    t("certifications.iso"), t("certifications.agc"),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero — image, editorial text block, no badge pill */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10">
          <img
            src={heroImage}
            alt="Chantier de construction au lever du soleil"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
        </div>
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 md:py-36">
          <div className="max-w-2xl">
            <span className="eyebrow-rule" />
            <span className="eyebrow">{s("hero", "badge", t("hero.badge"))}</span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
              <span dangerouslySetInnerHTML={{ __html: s("hero", "title", t("hero.title")) }} />
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {s("hero", "subtitle", t("hero.subtitle"))}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/contact" search={{ type: "quote" }}>
                <Button size="lg">{s("hero", "cta_quote", t("hero.cta_quote"))} <ArrowRight className="ml-1 h-4 w-4" /></Button>
              </Link>
              <Link
                to="/projects"
                className="link-underline text-sm font-semibold text-foreground"
              >
                {s("hero", "cta_projects", t("hero.cta_projects"))}
              </Link>
            </div>
            <div className="mt-10 flex items-baseline gap-3 border-t border-border pt-5 text-sm">
              <span className="text-muted-foreground">{s("hero", "phone_label", t("hero.phone_label"))}</span>
              <span className="font-semibold tracking-tight text-foreground">{s("hero", "phone_number", t("hero.phone_number"))}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats — editorial row with hairline separators */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border px-0 sm:grid-cols-4">
          {stats.map((st) => (
            <div key={st.l} className="bg-background px-6 py-8 sm:px-8">
              <div className="text-3xl font-bold tracking-tight text-foreground">{st.v}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{st.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services — open editorial columns, no cards */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <span className="eyebrow-rule" />
              <span className="eyebrow">{t("nav.services")}</span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{s("services", "title", t("services_section.title"))}</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{s("services", "subtitle", t("services_section.subtitle"))}</p>
            </div>
            <Link to="/services" className="link-underline pb-1 text-sm font-semibold text-foreground">{s("services", "view_all", t("services_section.view_all"))}</Link>
          </div>
          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((f) => (
              <Link key={f.title} to="/services" className="group border-t-2 border-border pt-6 transition-colors hover:border-primary">
                <f.icon className="h-5 w-5 text-primary" />
                <div className="mt-4 font-semibold leading-snug">{f.title}</div>
                <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</div>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  <span className="link-underline">{t("services_section.learn_more")}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured projects — image-led editorial grid */}
      <section className="border-b border-border bg-secondary/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <span className="eyebrow-rule" />
              <span className="eyebrow">{t("nav.projects")}</span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{s("featured", "title", t("featured.title"))}</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{s("featured", "subtitle", t("featured.subtitle"))}</p>
            </div>
            <Link to="/projects" className="link-underline pb-1 text-sm font-semibold text-foreground">{s("featured", "view_all", t("featured.view_all"))}</Link>
          </div>
          <div className="mt-12 grid gap-x-8 gap-y-12 md:grid-cols-3">
            {featured.map((p, i) => (
              <Link key={p.title} to="/projects" className={`group block ${i === 1 ? "md:mt-10" : ""} ${i === 2 ? "md:mt-20" : ""}`}>
                <div className="aspect-[4/5] overflow-hidden bg-muted">
                  <img
                    src={p.imgs?.[0] ?? featuredImgs[0]}
                    alt={p.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
                  />
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <div className="eyebrow">{p.tag}</div>
                    <div className="mt-1.5 text-lg font-semibold leading-snug">{p.title}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 translate-y-0.5 text-primary transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why us + testimonials — open quotes with hairlines */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-24">
          <div>
            <span className="eyebrow-rule" />
            <span className="eyebrow">{t("about.badge", "25+ ans")}</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{s("why_us", "title", t("why_us.title"))}</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {s("why_us", "subtitle", t("why_us.subtitle"))}
            </p>
            <ul className="mt-8 space-y-3 border-t border-border pt-6">
              {whyPoints.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm leading-relaxed">
                  <span aria-hidden className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-primary" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-8">
            {testimonials.map((item, i) => (
              <figure key={i} className="border-l-2 border-primary pl-6">
                <blockquote className="text-base leading-relaxed text-foreground">“{item.quote}”</blockquote>
                <figcaption className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">{item.author}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications — quiet text row */}
      <section className="border-b border-border bg-secondary/50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            {certifications.map((c, i) => (
              <span key={i}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — solid gold band */}
      <section className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-[2fr_1fr] md:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{s("cta", "title", t("cta.title"))}</h2>
            <p className="mt-3 opacity-90">{s("cta", "subtitle", t("cta.subtitle"))}</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link to="/contact" search={{ type: "quote" }}><Button size="lg" variant="secondary">{s("cta", "quote_btn", t("cta.quote_btn"))}</Button></Link>
            <Link to="/contact"><Button size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary">{s("cta", "hi_btn", t("cta.hi_btn"))}</Button></Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
