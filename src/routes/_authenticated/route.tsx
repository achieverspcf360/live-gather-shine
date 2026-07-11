import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles, LayoutDashboard } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedShell,
});

function AuthedShell() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-gold">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="font-serif text-xl text-primary">Lumen</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              to="/dashboard"
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${pathname === "/dashboard" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground md:inline">{user.email}</span>
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="mr-1.5 h-4 w-4" />Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
