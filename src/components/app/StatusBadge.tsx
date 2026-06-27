import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "accent";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-warning/15 text-warning border-warning/30",
  success: "bg-success/15 text-success border-success/30",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
  accent: "bg-accent/10 text-accent border-accent/20",
};

export function StatusBadge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
      toneClasses[tone], className,
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", {
        "bg-muted-foreground": tone === "neutral",
        "bg-primary": tone === "info",
        "bg-warning": tone === "warning",
        "bg-success": tone === "success",
        "bg-destructive": tone === "danger",
        "bg-accent": tone === "accent",
      })} />
      {children}
    </span>
  );
}

export const requisitionStatusMeta: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "À compléter", tone: "danger" },
  pending_pricing: { label: "À traiter", tone: "warning" },
  in_progress: { label: "En cours", tone: "info" },
  closed: { label: "Clôturé", tone: "success" },
  rejected: { label: "Rejeté", tone: "danger" },
};

export const lineStatusMeta: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "En attente", tone: "warning" },
  priced: { label: "Tarifé", tone: "accent" },
  validated: { label: "Validé", tone: "info" },
  disbursed: { label: "Décaissé", tone: "success" },
  rejected: { label: "Rejeté", tone: "danger" },
};
