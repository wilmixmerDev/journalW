import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Sidebar } from "@/components/app-shell/sidebar";
import { MobileHeader } from "@/components/app-shell/mobile-header";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { NewTradeDialog } from "@/components/trades/new-trade-dialog";
import { TradeDetailSheet } from "@/components/trades/trade-detail-sheet";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  let email: string | null = null;

  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar email={email} isDemo={!configured} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader email={email} />
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      </div>
      <MobileNav />
      <NewTradeDialog />
      <TradeDetailSheet />
    </div>
  );
}
