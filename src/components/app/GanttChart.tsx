import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

type GanttItem = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  status: string;
  priority?: string;
  children?: GanttItem[];
};

type Props = {
  items: GanttItem[];
  title: string;
  onItemClick?: (item: GanttItem) => void;
  showProgress?: boolean;
};

const statusColors: Record<string, string> = {
  planning: "bg-muted",
  pending: "bg-warning",
  in_progress: "bg-primary",
  on_hold: "bg-muted-foreground",
  completed: "bg-success",
  cancelled: "bg-destructive",
};

const statusBadgeColors: Record<string, string> = {
  planning: "bg-muted text-foreground",
  pending: "bg-warning/15 text-warning",
  in_progress: "bg-primary/15 text-primary",
  on_hold: "bg-muted text-muted-foreground",
  completed: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

const DAY_MS = 86400000;
const MIN_BAR_WIDTH = 4;

export function GanttChart({ items, title, onItemClick, showProgress = true }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1); // 1=day, 2=week, 3=month
  const [scrollLeft, setScrollLeft] = useState(0);

  // Calculate date range
  const { start, end, days } = useMemo(() => {
    const now = new Date();
    let min = now.getTime();
    let max = now.getTime();

    items.forEach((item) => {
      if (item.start_date) min = Math.min(min, new Date(item.start_date).getTime());
      if (item.end_date) max = Math.max(max, new Date(item.end_date).getTime());
    });

    // Pad with 30 days on each side
    min -= 30 * DAY_MS;
    max += 30 * DAY_MS;

    const totalDays = Math.ceil((max - min) / DAY_MS);
    return { start: min, end: max, days: totalDays };
  }, [items]);

  const pxPerDay = zoom === 1 ? 4 : zoom === 2 ? 12 : 36;
  const totalWidth = days * pxPerDay;
  const rowHeight = 40;

  // Snap scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const todayOffset = ((Date.now() - start) / DAY_MS) * pxPerDay;
      scrollRef.current.scrollLeft = Math.max(0, todayOffset - scrollRef.current.clientWidth / 2);
    }
  }, [pxPerDay, start]);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) setScrollLeft(scrollRef.current.scrollLeft);
  }, []);

  const scrollToToday = () => {
    if (!scrollRef.current) return;
    const todayOffset = ((Date.now() - start) / DAY_MS) * pxPerDay;
    scrollRef.current.scrollTo({ left: Math.max(0, todayOffset - scrollRef.current.clientWidth / 2), behavior: "smooth" });
  };

  // Generate date headers
  const dateHeaders = useMemo(() => {
    const headers: { date: Date; x: number; label: string; isToday: boolean; isWeekStart: boolean; isMonthStart: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const d = new Date(start);
    d.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
      const time = d.getTime();
      const x = i * pxPerDay;
      const isToday = d.getTime() === today.getTime();
      const isWeekStart = d.getDay() === 1;
      const isMonthStart = d.getDate() === 1;

      if (zoom === 1 || (zoom === 2 && isWeekStart) || (zoom === 3 && isMonthStart)) {
        let label: string;
        if (zoom === 1) {
          label = d.toLocaleDateString("en", { day: "numeric", month: "short" });
        } else if (zoom === 2) {
          label = d.toLocaleDateString("en", { day: "numeric", month: "short" });
        } else {
          label = d.toLocaleDateString("en", { month: "long", year: "numeric" });
        }
        headers.push({ date: new Date(d), x, label, isToday, isWeekStart, isMonthStart });
      }

      d.setDate(d.getDate() + 1);
    }
    return headers;
  }, [start, days, pxPerDay, zoom]);

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={scrollToToday} className="text-xs">Today</Button>
          <div className="flex items-center rounded-md border border-border">
            <Button variant="ghost" size="sm" onClick={() => setZoom(Math.max(1, zoom - 1))} disabled={zoom <= 1}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2 text-xs text-muted-foreground">{zoom === 1 ? "Day" : zoom === 2 ? "Week" : "Month"}</span>
            <Button variant="ghost" size="sm" onClick={() => setZoom(Math.min(3, zoom + 1))} disabled={zoom >= 3}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex max-h-[600px] overflow-auto" ref={scrollRef} onScroll={handleScroll}>
        {/* Labels */}
        <div className="sticky left-0 z-20 w-56 shrink-0 border-r border-border bg-card">
          <div className="h-10 border-b border-border bg-muted/50 px-3 flex items-center">
            <span className="text-xs font-medium text-muted-foreground">Project / Task</span>
          </div>
          {items.map((item, i) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-2 border-b border-border px-3 hover:bg-muted/30 cursor-pointer",
                onItemClick && "hover:bg-muted/50"
              )}
              style={{ height: rowHeight }}
              onClick={() => onItemClick?.(item)}
            >
              <div className={cn("h-2 w-2 shrink-0 rounded-full", statusColors[item.status] ?? "bg-muted")} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{item.name}</div>
                {item.priority && (
                  <Badge variant="secondary" className={cn("mt-0.5 text-[9px]", statusBadgeColors[item.status])}>{item.priority}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="flex-1 overflow-hidden">
          {/* Date headers */}
          <div className="relative h-10 border-b border-border bg-muted/50" style={{ width: totalWidth }}>
            {dateHeaders.map((h, i) => (
              <div
                key={i}
                className={cn(
                  "absolute top-0 flex h-full items-center border-l border-border px-1",
                  h.isToday && "bg-primary/10 font-medium",
                )}
                style={{ left: h.x, minWidth: zoom === 1 ? pxPerDay * 3 : undefined }}
              >
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{h.label}</span>
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="relative" style={{ width: totalWidth }}>
            {/* Today line */}
            <div
              className="absolute top-0 bottom-0 z-10 w-px bg-primary/60"
              style={{ left: ((Date.now() - start) / DAY_MS) * pxPerDay }}
            />

            {/* Row backgrounds & bars */}
            {items.map((item, i) => {
              const y = i * rowHeight;
              const itemStart = item.start_date ? new Date(item.start_date).getTime() : null;
              const itemEnd = item.end_date ? new Date(item.end_date).getTime() : null;

              if (!itemStart || !itemEnd) {
                return (
                  <div
                    key={item.id}
                    className="border-b border-border hover:bg-muted/20"
                    style={{ height: rowHeight, top: y }}
                  />
                );
              }

              const barX = ((itemStart - start) / DAY_MS) * pxPerDay;
              const barWidth = Math.max(MIN_BAR_WIDTH, ((itemEnd - itemStart) / DAY_MS) * pxPerDay);

              return (
                <div
                  key={item.id}
                  className="absolute border-b border-border hover:bg-muted/20"
                  style={{ height: rowHeight, top: y, width: totalWidth }}
                >
                  {/* Bar */}
                  <div
                    className="absolute top-2 flex items-center rounded-md border border-primary/20 bg-primary/10 hover:bg-primary/15 transition-colors"
                    style={{ left: barX, width: barWidth, height: rowHeight - 16 }}
                    onClick={() => onItemClick?.(item)}
                  >
                    {/* Progress fill */}
                    {showProgress && (
                      <div
                        className={cn("absolute inset-y-0 left-0 rounded-l-md opacity-30", statusColors[item.status] ?? "bg-primary")}
                        style={{ width: `${item.progress}%` }}
                      />
                    )}
                    {/* Label */}
                    {barWidth > 60 && (
                      <span className="relative z-10 truncate px-2 text-[10px] font-medium text-foreground">
                        {item.name}
                        {barWidth > 120 && showProgress && ` · ${item.progress}%`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
