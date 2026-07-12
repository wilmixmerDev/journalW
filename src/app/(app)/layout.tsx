import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Sidebar } from "@/components/app-shell/sidebar";
import { MobileHeader } from "@/components/app-shell/mobile-header";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { PageTransition } from "@/components/app-shell/page-transition";
import { NewTradeDialog } from "@/components/trades/new-trade-dialog";
import { TradeDetailSheet } from "@/components/trades/trade-detail-sheet";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  let email: string | null = null;
  let displayName: string | null = null;
  let isAdmin = false;

  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, first_name, last_name")
        .eq("id", user.id)
        .single();
      isAdmin = profile?.role === "admin";
      const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
      displayName = fullName || null;
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar email={email} displayName={displayName} isDemo={!configured} isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader email={email} displayName={displayName} />
        <main className="flex-1 pb-20 lg:pb-0">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <MobileNav isAdmin={isAdmin} />
      <NewTradeDialog />
      <TradeDetailSheet />
    </div>
  );
}
