"use client";

import Link from "next/link";

import { Sidebar } from "@/components/admin/ui";
import { traderCopy } from "@/components/trader/copy";
import type { TraderTab } from "@/lib/trader/types";

function Icon({ children }: { children: React.ReactNode }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
}

const tabs: Array<{ id: TraderTab; label: string; icon: React.ReactNode }> = [
  { id: "market", label: traderCopy.pl.tabs.market, icon: <Icon><path d="M4 18 9 9l4 5 4-8 3 12" /><path d="M4 20h16" /></Icon> },
  { id: "paper", label: traderCopy.pl.tabs.paper, icon: <Icon><path d="M5 5h14v14H5Z" /><path d="M8 9h8M8 13h5" /></Icon> },
  { id: "live", label: traderCopy.pl.tabs.live, icon: <Icon><path d="M12 3v18" /><path d="m5 10 7-7 7 7" /><path d="M5 19h14" /></Icon> },
  { id: "approvals", label: traderCopy.pl.tabs.approvals, icon: <Icon><path d="M5 12l4 4L19 6" /><path d="M4 20h16" /></Icon> },
  { id: "history", label: traderCopy.pl.tabs.history, icon: <Icon><path d="M12 8v5l4 2" /><circle cx="12" cy="12" r="8" /></Icon> },
  { id: "settings", label: traderCopy.pl.tabs.settings, icon: <Icon><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></Icon> },
  { id: "exchange", label: traderCopy.pl.tabs.exchange, icon: <Icon><path d="M7 8h10v8H7Z" /><path d="M12 4v4M12 16v4" /><path d="M4 12h3M17 12h3" /></Icon> },
];

export default function TraderSidebar({
  activeId,
  onSelect,
  email,
  onEmergencyStop,
  emergencyActive,
}: {
  activeId: TraderTab;
  onSelect: (id: TraderTab) => void;
  email?: string | null;
  onEmergencyStop: () => void;
  emergencyActive: boolean;
}) {
  return (
    <Sidebar
      title="FluxBase"
      subtitle="TraderBot"
      items={tabs}
      activeId={activeId}
      onSelect={(id) => onSelect(id as TraderTab)}
      cta={
        <>
          <span>Spot trading only</span>
          <strong>{emergencyActive ? "Zatrzymany" : "Ryzyko aktywne"}</strong>
          <button className="button danger span" type="button" onClick={onEmergencyStop}>
            ZATRZYMAJ TRADING
          </button>
        </>
      }
      footer={
        <>
          <Link className="button primary-soft span" href="/admin">Wróć do SalesBota</Link>
          <Link className="button ghost span" href="/">Strona główna</Link>
          {email ? <span>{email}</span> : null}
        </>
      }
    />
  );
}
