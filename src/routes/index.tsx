import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, MonitorPlay, QrCode, Sparkles, HandCoins, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-gold shadow-soft">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="font-serif text-2xl font-semibold tracking-tight text-primary">Lumen</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
          <Button asChild size="sm"><Link to="/auth">Get started</Link></Button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-20 text-center md:py-28">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-gold/40 bg-card px-4 py-1.5 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            For churches, non-profits & events
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl leading-[1.05] text-foreground md:text-7xl">
            Every gift, every prayer, <span className="italic text-primary">seen and celebrated.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Attendees give, share prayers, and send messages from their phones. Approved submissions appear live on your projector — beautifully.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="shadow-soft">
              <Link to="/auth">Create your first event</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how">See how it works</a>
            </Button>
          </div>
        </section>

        <section id="how" className="grid gap-6 pb-20 md:grid-cols-3">
          {[
            { icon: QrCode, title: "Scan & submit", body: "Attendees scan a QR code on the screen and share a donation, prayer, or thanksgiving in seconds." },
            { icon: Shield, title: "Approve in one tap", body: "Moderators review submissions in real time. Pin, feature, hide or edit — you're in control." },
            { icon: MonitorPlay, title: "Live on any screen", body: "A cinematic display mode with live totals, a scrolling ticker, and beautiful transitions." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-7 shadow-soft">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-gold text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-2xl">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mb-24 rounded-3xl border bg-card p-10 text-center shadow-elevated">
          <HandCoins className="mx-auto h-8 w-8 text-gold" />
          <h2 className="mt-4 text-4xl">Made for the moment.</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Sunday services, conferences, fundraising dinners, youth events — one platform for the whole story of your gathering.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/auth">Start free <Heart className="ml-2 h-4 w-4" /></Link>
          </Button>
        </section>
      </main>

      <footer className="border-t bg-card/50 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Lumen — Live Giving & Prayer Display
      </footer>
    </div>
  );
}
