import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import { ArrowRight, Award, HeartHandshake, ShieldCheck, Sparkles, Users, Leaf } from "lucide-react";
import { useTranslation } from "react-i18next";

const icons = { ShieldCheck, HeartHandshake, Sparkles, Leaf };

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Scer-L/Construct Sarl" },
      { name: "description", content: "Meet the team behind 500+ completed projects." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useTranslation();

  const values = [
    { icon: icons.ShieldCheck, title: t("about.v_safety"), desc: t("about.v_safety_d") },
    { icon: icons.HeartHandshake, title: t("about.v_trust"), desc: t("about.v_trust_d") },
    { icon: icons.Sparkles, title: t("about.v_quality"), desc: t("about.v_quality_d") },
    { icon: icons.Leaf, title: t("about.v_green"), desc: t("about.v_green_d") },
  ];

  const milestones = [
    { y: "1998", t: t("about.m_1998") },
    { y: "2006", t: t("about.m_2006") },
    { y: "2014", t: t("about.m_2014") },
    { y: "2020", t: t("about.m_2020") },
    { y: "2025", t: t("about.m_2025") },
  ];

  const leadership = [
    { name: "Marcus Reyes", role: t("about.l_marcus"), initials: "MR" },
    { name: "Elena Cho", role: t("about.l_elena"), initials: "EC" },
    { name: "Daniel Okafor", role: t("about.l_daniel"), initials: "DO" },
    { name: "Priya Natarajan", role: t("about.l_priya"), initials: "PN" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <Award className="h-3.5 w-3.5 text-accent" /> {t("about.badge")}
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">{t("about.title")}</h1>
              <p className="mt-4 text-lg text-muted-foreground">
                {t("about.subtitle")}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/projects"><Button size="lg">{t("about.see_work")} <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                <Link to="/contact"><Button size="lg" variant="outline">{t("about.talk_team")}</Button></Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { v: "500+", l: t("stats.projects") },
                { v: "25 yrs", l: t("stats.years") },
                { v: "$2.4B", l: t("stats.value") },
                { v: "98%", l: t("stats.ontime") },
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
            <h2 className="text-3xl font-bold tracking-tight">{t("about.story_title")}</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>{t("about.story_p1")}</p>
              <p>{t("about.story_p2")}</p>
              <p>{t("about.story_p3")}</p>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight">{t("about.values_title")}</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((v) => (
                <div key={v.title} className="rounded-2xl border border-border bg-card p-6">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                    <v.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4 font-semibold">{v.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{v.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{t("about.milestones_title")}</h2>
              <ol className="mt-8 space-y-6">
                {milestones.map((m) => (
                  <li key={m.y} className="grid grid-cols-[80px_1fr] gap-4 border-l-2 border-primary/30 pl-4">
                    <div className="font-mono text-sm font-semibold text-primary">{m.y}</div>
                    <div className="text-sm text-muted-foreground">{m.t}</div>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{t("about.leadership_title")}</h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {leadership.map((l) => (
                  <div key={l.name} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{l.initials}</div>
                    <div>
                      <div className="font-semibold">{l.name}</div>
                      <div className="text-xs text-muted-foreground">{l.role}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> {t("about.employee_owned")}</div>
                <p className="mt-2 text-sm text-muted-foreground">{t("about.employee_owned_d")}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-primary text-primary-foreground">
          <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-3xl font-bold md:text-4xl">{t("about.cta_title")}</h2>
            <p className="mt-3 opacity-90">{t("about.cta_subtitle")}</p>
            <Link to="/contact" search={{ type: "quote" }}><Button size="lg" variant="secondary" className="mt-6">{t("about.cta_button")} <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
