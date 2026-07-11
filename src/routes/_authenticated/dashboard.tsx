import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, CalendarDays, Building2, ArrowRight } from "lucide-react";
import { slugify } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const orgsQ = useQuery({
    queryKey: ["my-orgs", user.id],
    queryFn: async () => {
      const { data: roles, error: rErr } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id);
      if (rErr) throw rErr;
      const ids = [...new Set((roles ?? []).map((r) => r.organization_id))];
      if (ids.length === 0) return [];
      const { data, error } = await supabase.from("organizations").select("*").in("id", ids).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [orgId, setOrgId] = useState<string | null>(null);
  useEffect(() => {
    if (orgsQ.data && orgsQ.data.length > 0 && !orgId) setOrgId(orgsQ.data[0].id);
  }, [orgsQ.data, orgId]);

  const eventsQ = useQuery({
    queryKey: ["events", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from("events").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const currentOrg = useMemo(() => orgsQ.data?.find((o) => o.id === orgId), [orgsQ.data, orgId]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Manage your organizations and live events.</p>
        </div>
        <div className="flex gap-2">
          <NewOrgDialog onCreated={(id) => { qc.invalidateQueries({ queryKey: ["my-orgs"] }); setOrgId(id); }} />
          {currentOrg && <NewEventDialog orgId={currentOrg.id} onCreated={() => qc.invalidateQueries({ queryKey: ["events"] })} />}
        </div>
      </div>

      {orgsQ.isLoading && <p className="text-muted-foreground">Loading…</p>}

      {orgsQ.data && orgsQ.data.length === 0 && (
        <Card className="p-10 text-center">
          <Building2 className="mx-auto h-10 w-10 text-gold" />
          <h2 className="mt-4 text-2xl">Create your first organization</h2>
          <p className="mt-1 text-sm text-muted-foreground">You need an organization before you can host events.</p>
          <div className="mt-6 inline-block"><NewOrgDialog onCreated={(id) => { qc.invalidateQueries({ queryKey: ["my-orgs"] }); setOrgId(id); }} /></div>
        </Card>
      )}

      {orgsQ.data && orgsQ.data.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {orgsQ.data.map((o) => (
              <button
                key={o.id}
                onClick={() => setOrgId(o.id)}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${orgId === o.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-gold"}`}
              >
                {o.name}
              </button>
            ))}
          </div>

          <section>
            <h2 className="mb-4 text-2xl">Events</h2>
            {eventsQ.data && eventsQ.data.length === 0 && (
              <Card className="p-8 text-center text-muted-foreground">
                No events yet. Create your first event to get a QR code and shareable link.
              </Card>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {eventsQ.data?.map((e) => (
                <Link key={e.id} to="/_authenticated/events/$eventId" params={{ eventId: e.id }} className="group">
                  <Card className="overflow-hidden p-0 transition hover:shadow-elevated">
                    <div className="h-24 bg-gradient-gold" />
                    <div className="p-5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {e.start_at ? new Date(e.start_at).toLocaleString() : "No date set"}
                      </div>
                      <h3 className="mt-2 font-serif text-2xl">{e.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{e.description || "—"}</p>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Goal: {e.currency} {Number(e.fundraising_goal || 0).toLocaleString()}</span>
                        <span className="inline-flex items-center gap-1 text-primary group-hover:gap-2 transition-all">Open <ArrowRight className="h-4 w-4" /></span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function NewOrgDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const m = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase.from("organizations").insert({
        owner_id: u.user.id, name, description, slug,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => { toast.success("Organization created"); setOpen(false); setName(""); setDescription(""); onCreated(data.id); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Building2 className="mr-2 h-4 w-4" />New organization</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create organization</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
          <div><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Grace Community Church" /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <Button type="submit" disabled={m.isPending} className="w-full">Create</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewEventDialog({ orgId, onCreated }: { orgId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [goal, setGoal] = useState("");
  const [currency, setCurrency] = useState("USD");

  const m = useMutation({
    mutationFn: async () => {
      const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase.from("events").insert({
        organization_id: orgId, title, description, slug,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        fundraising_goal: goal ? Number(goal) : 0,
        currency,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Event created"); setOpen(false); setTitle(""); setDescription(""); setStartAt(""); setGoal(""); onCreated(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New event</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create event</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
          <div><Label>Title</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sunday Service" /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></div>
            <div><Label>Currency</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} /></div>
          </div>
          <div><Label>Fundraising goal</Label><Input type="number" min="0" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="10000" /></div>
          <Button type="submit" disabled={m.isPending} className="w-full">Create event</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
