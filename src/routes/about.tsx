import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import { ArrowRight, Award, HeartHandshake, ShieldCheck, Sparkles, Users, Leaf } from "lucide-react";

const values = [
  { icon: ShieldCheck, k: "safety", t: "Safety first", d: "Zero-harm culture with daily toolbox talks and OSHA-leading incident rates." },
  { icon: HeartHandshake, k: "trust", t: "Built on trust", d: "Transparent pricing, weekly reporting and no surprises at closeout." },
  { icon: Sparkles, k: "craft", t: "Craft & quality", d: "Master tradespeople and a dedicated QA/QC team on every site." },
  { icon: Leaf, k: "sustainable", t: "Sustainable building", d: "LEED-accredited team and a default low-waste site programme." },
];

const milestones = [
  { y: "1998", t: "Founded as a 4-person residential framing crew." },
  { y: "2006", t: "Completed our first commercial high-rise build." },
  { y: "2014", t: "Expanded into infrastructure with the Coastal interchange." },
  { y: "2020", t: "Launched our in-house design-build studio." },
  { y: "2025", t: "500+ projects delivered across 9 regions." },
];

const leadership = [
  { name: "Marcus Reyes", k: "ceo", role: "Founder & CEO", initials: "MR" },
  { name: "Elena Cho", k: "coo", role: "Chief Operating Officer", initials: "EC" },
  { name: "Daniel Okafor", k: "vp", role: "VP Pre-Construction", initials: "DO" },
  { name: "Priya Natarajan", k: "safety", role: "Director, Safety & Quality", initials: "PN" },
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

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <Award className="h-3.5 w-3.5 text-accent" /> {t("about.badge", "25+ years in business")}
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
                {t("about.title", "A construction company built on trust, craft and discipline.")}
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                {t("about.subtitle", "Scer-L/Construct Sarl is a full-service general contractor delivering commercial, residential, industrial and infrastructure projects across the region. We're family-founded, employee-owned, and proudly hands-on.")}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/projects"><Button size="lg">{t("about.cta_work", "See our work")} <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                <Link to="/contact"><Button size="lg" variant="outline">{t("about.cta_talk", "Talk to our team")}</Button></Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { v: "500+", l: t("stats.projects", "Projects delivered") },
                { v: t("about.stat_years_value", "25 yrs"), l: t("stats.years", "In business") },
                { v: "$2.4B", l: t("stats.value", "Built value") },
                { v: "98%", l: t("stats.ontime", "On-time milestones") },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl border border-border bg-card p-6">
                  <div className="text-3xl font-bold text-primary">{s.v}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
            <h2 className="text-3xl font-bold tracking-tight">{t("about.story_title", "Our story")}</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>{t("about.story_p1", "Founded in 1998 with a single pickup truck and a four-person framing crew, Scer-L/Construct has grown into a multi-disciplinary general contractor — but the values haven't changed.")}</p>
              <p>{t("about.story_p2", "We still believe construction is a craft. We hire and train master tradespeople, run our own self-perform teams, and treat every site like it has our name on it — because it does.")}</p>
              <p>{t("about.story_p3", "Today, our 600+ employees deliver projects ranging from custom homes to airports, with the same belief that built our first project: do it right, do it safely, and do it on time.")}</p>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight">{t("about.values_title", "What we stand for")}</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((v) => (
                <div key={v.k} className="rounded-2xl border border-border bg-card p-6">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                    <v.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4 font-semibold">{t(`about.values.${v.k}.t`, v.t)}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{t(`about.values.${v.k}.d`, v.d)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{t("about.milestones_title", "Milestones")}</h2>
              <ol className="mt-8 space-y-6">
                {milestones.map((m) => (
                  <li key={m.y} className="grid grid-cols-[80px_1fr] gap-4 border-l-2 border-primary/30 pl-4">
                    <div className="font-mono text-sm font-semibold text-primary">{m.y}</div>
                    <div className="text-sm text-muted-foreground">{t(`about.milestones.${m.y}`, m.t)}</div>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{t("about.leadership_title", "Leadership")}</h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {leadership.map((l) => (
                  <div key={l.name} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{l.initials}</div>
                    <div>
                      <div className="font-semibold">{l.name}</div>
                      <div className="text-xs text-muted-foreground">{t(`about.roles.${l.k}`, l.role)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> {t("about.employee_owned", "Employee-owned")}</div>
                <p className="mt-2 text-sm text-muted-foreground">{t("about.employee_owned_desc", "Since 2018, every employee with one year of tenure receives ownership in the company. Our crews aren't just working on your project — they own the outcome.")}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight">Informations légales</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="text-sm font-semibold text-primary">Registre du commerce</div>
                <p className="mt-2 text-sm text-muted-foreground">CD/KIS/RCCM/21.8-00068</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="text-sm font-semibold text-primary">Numéro Impôt</div>
                <p className="mt-2 text-sm text-muted-foreground">A2213934W</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="text-sm font-semibold text-primary">ID NAT</div>
                <p className="mt-2 text-sm text-muted-foreground">25-F4200-N84176G</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="text-sm font-semibold text-primary">NUMERO</div>
                <p className="mt-2 text-sm text-muted-foreground">1015361000</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="text-sm font-semibold text-primary">Certificat INPP</div>
                <p className="mt-2 text-sm text-muted-foreground">N° DG/DF/DIREC/GU/7022/2021</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="text-sm font-semibold text-primary">ONEM</div>
                <p className="mt-2 text-sm text-muted-foreground">060255A21</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-primary text-primary-foreground">
          <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-3xl font-bold md:text-4xl">{t("about.cta_title", "Let's build the next one together.")}</h2>
            <p className="mt-3 opacity-90">{t("about.cta_sub", "From your first site visit to the final handover, you'll work with the same accountable team.")}</p>
            <Link to="/contact" search={{ type: "quote" }}><Button size="lg" variant="secondary" className="mt-6">{t("hero.cta_quote", "Request a quote")} <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
