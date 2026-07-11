import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, timeAgo } from "@/lib/format";
import { Sparkles, Heart, Pin } from "lucide-react";

export const Route = createFileRoute("/display/$slug")({
  component: DisplayPage,
});

function DisplayPage() {
  const { slug } = Route.useParams();
  const qc = useQueryClient();

  const eventQ = useQuery({
    queryKey: ["display-event", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*, organizations(name, logo_url)").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const subsQ = useQuery({
    queryKey: ["display-subs", eventQ.data?.id],
    queryFn: async () => {
      if (!eventQ.data) return [];
      const { data, error } = await supabase.from("submissions").select("*")
        .eq("event_id", eventQ.data.id).eq("status", "approved")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!eventQ.data,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!eventQ.data) return;
    const ch = supabase.channel(`display-${eventQ.data.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions", filter: `event_id=eq.${eventQ.data.id}` },
        () => qc.invalidateQueries({ queryKey: ["display-subs", eventQ.data!.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [eventQ.data, qc]);

  const total = useMemo(() => (subsQ.data ?? []).reduce((s, x) => s + Number(x.amount || 0), 0), [subsQ.data]);
  const featured = useMemo(() => (subsQ.data ?? []).find((s) => s.is_featured) ?? (subsQ.data ?? [])[0], [subsQ.data]);

  if (!eventQ.data) return <div className="grid min-h-screen place-items-center bg-primary text-primary-foreground">Loading…</div>;
  const event = eventQ.data;
  const goal = Number(event.fundraising_goal || 0);
  const pct = goal > 0 ? Math.min(100, (total / goal) * 100) : 0;
  const org = event.organizations as { name: string; logo_url: string | null } | null;
  const items = subsQ.data ?? [];
  // Duplicate for seamless ticker loop
  const tickerItems = items.length > 0 ? [...items, ...items] : [];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-primary text-primary-foreground">
      {/* Decorative gold glow */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[32rem] w-[32rem] rounded-full bg-gold/10 blur-3xl" />

      {/* Header */}
      <header className="relative flex items-center justify-between px-12 py-8">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-gold">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold">{org?.name}</div>
            <div className="font-serif text-4xl">{event.title}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-primary-foreground/70">Submit at</div>
          <div className="font-mono text-lg text-gold">/e/{event.slug}</div>
        </div>
      </header>

      {/* Main split */}
      <div className="relative grid flex-1 grid-cols-1 gap-10 px-12 pb-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: total + featured */}
        <div className="flex flex-col justify-center">
          <div className="text-xs uppercase tracking-[0.3em] text-gold">Raised together</div>
          <div className="mt-3 font-serif text-8xl leading-none md:text-9xl">
            {formatCurrency(total, event.currency ?? "USD")}
          </div>
          {goal > 0 && (
            <>
              <div className="mt-6 h-3 w-full max-w-xl overflow-hidden rounded-full bg-primary-foreground/10">
                <div className="h-full bg-gradient-gold transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 text-sm text-primary-foreground/70">
                {pct.toFixed(0)}% of {formatCurrency(goal, event.currency ?? "USD")} goal
              </div>
            </>
          )}

          {featured && (
            <div key={featured.id} className="animate-slide-in-up mt-12 max-w-xl rounded-3xl border border-gold/30 bg-primary-foreground/5 p-8 backdrop-blur">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold">
                {featured.is_pinned ? <Pin className="h-3.5 w-3.5" /> : <Heart className="h-3.5 w-3.5" />}
                {featured.kind}
              </div>
              {featured.message && <p className="mt-4 font-serif text-3xl leading-snug italic">"{featured.message}"</p>}
              <div className="mt-6 flex items-center justify-between">
                <div className="font-medium text-gold">— {featured.is_anonymous ? "A friend" : featured.full_name || "A friend"}</div>
                {Number(featured.amount) > 0 && <div className="font-serif text-2xl">{formatCurrency(featured.amount, featured.currency || event.currency || "USD")}</div>}
              </div>
            </div>
          )}
        </div>

        {/* Right: ticker */}
        <div className="relative overflow-hidden rounded-3xl border border-gold/20 bg-primary-foreground/5 p-6 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.3em] text-gold">Live feed</div>
            <div className="flex items-center gap-1.5 text-xs text-primary-foreground/70">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" /> {items.length}
            </div>
          </div>
          {items.length === 0 ? (
            <div className="grid h-96 place-items-center text-center text-primary-foreground/60">
              <div>
                <Heart className="mx-auto h-8 w-8 text-gold/60" />
                <p className="mt-3 font-serif text-xl">Awaiting first submission…</p>
                <p className="mt-1 text-sm">Scan the QR or visit /e/{event.slug}</p>
              </div>
            </div>
          ) : (
            <div className="relative h-[70vh] overflow-hidden [mask-image:linear-gradient(180deg,transparent,black_10%,black_90%,transparent)]">
              <div className="space-y-3" style={{ animation: `ticker-scroll ${Math.max(20, items.length * 4)}s linear infinite` }}>
                {tickerItems.map((s, i) => (
                  <div key={`${s.id}-${i}`} className="rounded-xl border border-gold/10 bg-primary-foreground/5 p-4">
                    <div className="flex items-center justify-between text-xs text-primary-foreground/70">
                      <span className="uppercase tracking-widest text-gold">{s.kind}</span>
                      <span>{timeAgo(s.created_at)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="font-medium">{s.is_anonymous ? "Anonymous" : s.full_name || "A friend"}</span>
                      {Number(s.amount) > 0 && <span className="font-serif text-xl text-gold">{formatCurrency(s.amount, s.currency || event.currency || "USD")}</span>}
                    </div>
                    {s.message && <p className="mt-1.5 line-clamp-2 text-sm text-primary-foreground/80">{s.message}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
