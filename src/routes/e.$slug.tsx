import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Sparkles, HandHeart, Check } from "lucide-react";

export const Route = createFileRoute("/e/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `Give — ${params.slug}` }, { name: "description", content: "Submit your gift, prayer, or message." }],
  }),
  component: SubmitPage,
});

type Kind = "donation" | "prayer" | "thanksgiving" | "support";

function SubmitPage() {
  const { slug } = Route.useParams();
  const [done, setDone] = useState(false);

  const eventQ = useQuery({
    queryKey: ["public-event", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*, organizations(name, logo_url)").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [kind, setKind] = useState<Kind>("donation");
  const [fullName, setFullName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const submitM = useMutation({
    mutationFn: async () => {
      if (!eventQ.data) throw new Error("Event unavailable");
      const { error } = await supabase.from("submissions").insert({
        event_id: eventQ.data.id,
        organization_id: eventQ.data.organization_id,
        kind,
        status: eventQ.data.auto_approve ? "approved" : "pending",
        full_name: fullName || null,
        group_name: groupName || null,
        phone: phone || null,
        email: email || null,
        amount: amount ? Number(amount) : 0,
        currency: eventQ.data.currency,
        message: message || null,
        is_anonymous: anonymous,
        approved_at: eventQ.data.auto_approve ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => setDone(true),
    onError: (e: Error) => toast.error(e.message),
  });

  if (eventQ.isLoading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!eventQ.data) return <div className="grid min-h-screen place-items-center text-muted-foreground">Event not found.</div>;

  if (done) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-warm p-4">
        <div className="max-w-md rounded-3xl border bg-card p-10 text-center shadow-elevated">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-gold">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mt-6 font-serif text-3xl">Thank you.</h1>
          <p className="mt-2 text-muted-foreground">Your submission has been received. May it be a blessing.</p>
          <Button className="mt-6" onClick={() => { setDone(false); setAmount(""); setMessage(""); }}>Submit another</Button>
        </div>
      </div>
    );
  }

  const event = eventQ.data;
  const org = event.organizations as { name: string; logo_url: string | null } | null;

  return (
    <div className="min-h-screen bg-gradient-warm px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gradient-gold">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">{org?.name}</p>
          <h1 className="mt-1 font-serif text-3xl text-primary">{event.title}</h1>
          {event.description && <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>}
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-elevated">
          <div className="mb-4 grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
            {(["donation", "prayer", "thanksgiving", "support"] as Kind[]).map((k) => (
              <button key={k} onClick={() => setKind(k)}
                className={`rounded-md py-2 text-xs font-medium capitalize transition ${kind === k ? "bg-card shadow-sm text-primary" : "text-muted-foreground"}`}>
                {k}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); submitM.mutate(); }} className="space-y-3">
            <div>
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={anonymous} placeholder={anonymous ? "Anonymous" : "Your name"} />
            </div>
            {kind === "donation" && (
              <div>
                <Label>Amount ({event.currency})</Label>
                <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>
            )}
            <div>
              <Label>{kind === "donation" ? "Message (optional)" : "Your message"}</Label>
              <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500}
                placeholder={
                  kind === "prayer" ? "Share your prayer request…" :
                  kind === "thanksgiving" ? "What are you thankful for?" :
                  kind === "support" ? "Words of encouragement…" : "A note with your gift…"
                } />
            </div>
            <details className="text-sm text-muted-foreground">
              <summary className="cursor-pointer">More details (optional)</summary>
              <div className="mt-3 space-y-3">
                <div><Label>Group or organization</Label><Input value={groupName} onChange={(e) => setGroupName(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                  <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                </div>
              </div>
            </details>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div><div className="text-sm font-medium">Post anonymously</div><div className="text-xs text-muted-foreground">Hide your name on the display</div></div>
              <Switch checked={anonymous} onCheckedChange={setAnonymous} />
            </div>
            <Button type="submit" className="w-full shadow-soft" size="lg" disabled={submitM.isPending}>
              <HandHeart className="mr-2 h-4 w-4" />{submitM.isPending ? "Submitting…" : "Submit"}
            </Button>
            {!event.auto_approve && <p className="text-center text-xs text-muted-foreground">A moderator will review before it appears on screen.</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
