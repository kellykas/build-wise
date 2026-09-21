import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import { ArrowRight, HeartHandshake, ShieldCheck, Sparkles, Leaf } from "lucide-react";
import { useSiteContent, getContentValue } from "@/hooks/use-site-content";

// These defaults are only used when the CMS has no data.
// They use hardcoded French text to match the default language.
const valuesFr = [
  { icon: ShieldCheck, k: "safety", t: "La sécurité d'abord", d: "Culture de zéro incident avec des causeries sécurité quotidiennes et des taux d'incidents leaders dans l'industrie." },
  { icon: HeartHandshake, k: "trust", t: "Bâti sur la confiance", d: "Prix transparents, rapports hebdomadaires et aucune surprise à la clôture." },
  { icon: Sparkles, k: "craft", t: "Savoir-faire et qualité", d: "Artisans qualifiés et une équipe QA/QC dédiée sur chaque chantier." },
  { icon: Leaf, k: "sustainable", t: "Construction durable", d: "Équipe accréditée LEED et programme de réduction des déchets par défaut." },
];

const defaultMilestonesFr = [
  { y: "1998", t: "Fondée comme équipe de charpentiers résidentiels de 4 personnes." },
  { y: "2006", t: "Achèvement de notre premier immeuble commercial de grande hauteur." },
  { y: "2014", t: "Expansion dans les infrastructures avec l'échangeur côtier." },
  { y: "2020", t: "Lancement de notre studio de conception-réalisation interne." },
  { y: "2025", t: "500+ projets livrés dans 9 régions." },
];

const defaultLeadershipFr = [
  { name: "Marcus Reyes", k: "ceo", role: "Fondateur et PDG", initials: "MR" },
  { name: "Elena Cho", k: "coo", role: "Directrice de l'exploitation", initials: "EC" },
  { name: "Daniel Okafor", k: "vp", role: "VP Pré-construction", initials: "DO" },
  { name: "Priya Natarajan", k: "safety", role: "Directrice, Sécurité et Qualité", initials: "PN" },
];

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "À propos — Scer-L/Construct Sarl" },
      { name: "description", content: "Découvrez l'équipe derrière plus de 500 projets livrés : notre histoire, nos valeurs, notre direction et notre engagement envers la sécurité et le savoir-faire." },
      { property: "og:title", content: "À propos — Scer-L/Construct Sarl" },
      { property: "og:description", content: "Notre histoire, nos valeurs et notre équipe de direction." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useTranslation();
  const { data: siteContent } = useSiteContent();

  // Load from CMS with fallbacks
  const cmsLeadership = getContentValue(siteContent, "cms", "leadership") as { name: string; role: string; initials: string; photo: string }[] | null;
  const cmsMilestones = getContentValue(siteContent, "cms", "milestones") as { year: string; description: string }[] | null;
  const leadership = (cmsLeadership && cmsLeadership.length > 0)
    ? cmsLeadership.map((l) => ({ name: l.name, k: l.name.toLowerCase().replace(/\s+/g, "_"), role: l.role, initials: l.initials }))
    : defaultLeadershipFr;
  const milestones = (cmsMilestones && cmsMilestones.length > 0)
    ? cmsMilestones.map((m) => ({ y: m.year, t: m.description }))
    : defaultMilestonesFr;
  const values = valuesFr;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Intro */}
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.5fr_1fr] md:py-24">
            <div>
              <span className="eyebrow-rule" />
              <span className="eyebrow">{t("about.badge", "25+ ans d'activité")}</span>
              <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
                {t("about.title", "A construction company built on trust, craft and discipline.")}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t("about.subtitle", "Scer-L/Construct Sarl is a full-service general contractor delivering commercial, residential, industrial and infrastructure projects across the region. We're family-founded, employee-owned, and proudly hands-on.")}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link to="/projects"><Button>{t("about.cta_work", "See our work")} <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
                <Link
                  to="/contact"
                  className="link-underline inline-flex h-9 items-center text-sm font-semibold text-foreground"
                >
                  {t("about.cta_talk", "Talk to our team")}
                </Link>
              </div>
            </div>
            {/* Stats — open, hairline-framed column */}
            <div className="grid grid-cols-2 gap-px self-start overflow-hidden bg-border">
              {[
                { v: "500+", l: t("stats.projects", "Projects delivered") },
                { v: t("about.stat_years_value", "25 yrs"), l: t("stats.years", "In business") },
                { v: "$2.4B", l: t("stats.value", "Built value") },
                { v: "98%", l: t("stats.ontime", "On-time milestones") },
              ].map((st) => (
                <div key={st.l} className="bg-background p-6">
                  <div className="text-3xl font-bold tracking-tight text-foreground">{st.v}</div>
                  <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{st.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Story — editorial two-column */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:py-24 sm:px-6">
          <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
            <div>
              <span className="eyebrow-rule" />
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("about.story_title", "Our story")}</h2>
            </div>
            <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
              <p className="text-lg leading-relaxed text-foreground">{t("about.story_p1", "Founded in 1998 with a single pickup truck and a four-person framing crew, Scer-L/Construct has grown into a multi-disciplinary general contractor — but the values haven't changed.")}</p>
              <p>{t("about.story_p2", "We still believe construction is a craft. We hire and train master tradespeople, run our own self-perform teams, and treat every site like it has our name on it — because it does.")}</p>
              <p>{t("about.story_p3", "Today, our 600+ employees deliver projects ranging from custom homes to airports, with the same belief that built our first project: do it right, do it safely, and do it on time.")}</p>
            </div>
          </div>
        </section>

        {/* Values — open columns with rules, no cards */}
        <section className="section-line bg-secondary/50">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("about.values_title", "What we stand for")}</h2>
            <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((v) => (
                <div key={v.k} className="border-t-2 border-border pt-6">
                  <v.icon className="h-5 w-5 text-primary" />
                  <div className="mt-4 font-semibold leading-snug">{t(`about.values.${v.k}.t`, v.t)}</div>
                  <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`about.values.${v.k}.d`, v.d)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Milestones + leadership */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <span className="eyebrow-rule" />
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("about.milestones_title", "Milestones")}</h2>
              <ol className="mt-8 space-y-0">
                {milestones.map((m) => (
                  <li key={m.y} className="grid grid-cols-[72px_1fr] gap-4 border-b border-border py-4 last:border-0">
                    <div className="font-mono text-sm font-semibold text-primary">{m.y}</div>
                    <div className="text-sm leading-relaxed text-muted-foreground">{t(`about.milestones.${m.y}`, m.t)}</div>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <span className="eyebrow-rule" />
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("about.leadership_title", "Leadership")}</h2>
              <div className="mt-8 grid gap-px bg-border sm:grid-cols-2">
                {leadership.map((l) => (
                  <div key={l.name} className="flex items-center gap-4 bg-background p-5">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{l.initials}</div>
                    <div>
                      <div className="font-semibold leading-snug">{l.name}</div>
                      <div className="text-xs text-muted-foreground">{t(`about.roles.${l.k}`, l.role)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 border-l-2 border-primary pl-6">
                <div className="text-sm font-semibold">{t("about.employee_owned", "Employee-owned")}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("about.employee_owned_desc", "Since 2018, every employee with one year of tenure receives ownership in the company. Our crews aren't just working on your project — they own the outcome.")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Legal info — quiet two-column list instead of card grid */}
        <section className="section-line bg-secondary/50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Informations légales</h2>
            <dl className="mt-8 grid gap-x-12 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Registre du commerce", "CD/KIS/RCCM/21.8-00068"],
                ["Numéro Impôt", "A2213934W"],
                ["ID NAT", "25-F4200-N84176G"],
                ["NUMERO", "1015361000"],
                ["Certificat INPP", "N° DG/DF/DIREC/GU/7022/2021"],
                ["ONEM", "060255A21"],
              ].map(([label, value]) => (
                <div key={label} className="border-t border-border pt-3">
                  <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-primary text-primary-foreground">
          <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">{t("about.cta_title", "Let's build the next one together.")}</h2>
            <p className="mt-3 opacity-90">{t("about.cta_sub", "From your first site visit to the final handover, you'll work with the same accountable team.")}</p>
            <Link to="/contact" search={{ type: "quote" }}><Button size="lg" variant="secondary" className="mt-6">{t("hero.cta_quote", "Request a quote")} <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
