import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Pin, Star, Trash2, MonitorPlay, Copy, ExternalLink, Search } from "lucide-react";
import { formatCurrency, timeAgo } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type Submission = Database["public"]["Tables"]["submissions"]["Row"];

export const Route = createFileRoute("/_authenticated/events/$eventId")({
  component: EventPage,
});

function EventPage() {
  const { eventId } = Route.useParams();
  const qc = useQueryClient();

  const eventQ = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId).single();
      if (error) throw error;
      return data;
    },
  });

  const subsQ = useQuery({
    queryKey: ["subs", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from("submissions").select("*").eq("event_id", eventId).order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`admin-subs-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions", filter: `event_id=eq.${eventId}` }, () => {
        qc.invalidateQueries({ queryKey: ["subs", eventId] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [eventId, qc]);

  const updateM = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Submission> }) => {
      const { error } = await supabase.from("submissions").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subs", eventId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("submissions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["subs", eventId] }); },
  });

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending");

  if (eventQ.isLoading) return <p>Loading…</p>;
  if (!eventQ.data) return <p>Event not found.</p>;
  const event = eventQ.data;

  const submitUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/e/${event.slug}`;
  const displayUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/display/${event.slug}`;

  const approved = (subsQ.data ?? []).filter((s) => s.status === "approved");
  const total = approved.reduce((sum, s) => sum + Number(s.amount || 0), 0);

  const filtered = (subsQ.data ?? []).filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    if (q) {
      const t = q.toLowerCase();
      return (s.full_name?.toLowerCase().includes(t) || s.message?.toLowerCase().includes(t));
    }
    return true;
  });

  return (
    <div className="space-y-8">
      <div>
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Back to dashboard</Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl">{event.title}</h1>
            <p className="mt-1 text-muted-foreground">{event.description}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><a href={submitUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Submit page</a></Button>
            <Button asChild><a href={displayUrl} target="_blank" rel="noreferrer"><MonitorPlay className="mr-2 h-4 w-4" />Open display</a></Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground">Raised</div><div className="mt-1 font-serif text-3xl text-primary">{formatCurrency(total, event.currency ?? "USD")}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground">Goal</div><div className="mt-1 font-serif text-3xl">{formatCurrency(event.fundraising_goal ?? 0, event.currency ?? "USD")}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground">Approved</div><div className="mt-1 font-serif text-3xl">{approved.length}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground">Pending</div><div className="mt-1 font-serif text-3xl text-gold">{(subsQ.data ?? []).filter((s) => s.status === "pending").length}</div></Card>
      </div>

      <Card className="p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Share this event</div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <CopyRow label="Submit link" value={submitUrl} />
          <CopyRow label="Display link" value={displayUrl} />
        </div>
      </Card>

      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border bg-card p-1">
            {(["pending", "approved", "all"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1.5 text-sm capitalize ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or message…" className="pl-9" />
          </div>
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && <Card className="p-8 text-center text-muted-foreground">No submissions yet.</Card>}
          {filtered.map((s) => (
            <Card key={s.id} className="flex flex-wrap items-start justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.is_anonymous ? "Anonymous" : s.full_name || "—"}</span>
                  <Badge variant="outline" className="capitalize">{s.kind}</Badge>
                  <Badge className={
                    s.status === "approved" ? "bg-primary" :
                    s.status === "rejected" ? "bg-destructive" :
                    s.status === "hidden" ? "bg-muted text-muted-foreground" : "bg-gold text-gold-foreground"
                  }>{s.status}</Badge>
                  {s.is_pinned && <Pin className="h-3.5 w-3.5 text-gold" />}
                  {s.is_featured && <Star className="h-3.5 w-3.5 text-gold" />}
                  <span className="text-xs text-muted-foreground">{timeAgo(s.created_at)}</span>
                </div>
                {Number(s.amount) > 0 && (
                  <div className="mt-1 font-serif text-xl text-primary">{formatCurrency(s.amount, s.currency || event.currency || "USD")}</div>
                )}
                {s.message && <p className="mt-1 text-sm text-foreground/90">{s.message}</p>}
              </div>
              <div className="flex flex-wrap gap-1">
                {s.status !== "approved" && <Button size="sm" onClick={() => updateM.mutate({ id: s.id, patch: { status: "approved", approved_at: new Date().toISOString() } })}><Check className="h-4 w-4" /></Button>}
                {s.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => updateM.mutate({ id: s.id, patch: { status: "rejected" } })}><X className="h-4 w-4" /></Button>}
                <Button size="sm" variant="outline" onClick={() => updateM.mutate({ id: s.id, patch: { is_pinned: !s.is_pinned } })}><Pin className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => updateM.mutate({ id: s.id, patch: { is_featured: !s.is_featured } })}><Star className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this submission?")) deleteM.mutate(s.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate text-sm">{value}</div>
      </div>
      <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}>
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}
