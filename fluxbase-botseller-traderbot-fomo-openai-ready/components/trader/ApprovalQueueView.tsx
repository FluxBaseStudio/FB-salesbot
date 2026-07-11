"use client";

import { EmptyState, Panel, StatusBadge, TableCard } from "@/components/admin/ui";
import { traderCopy } from "@/components/trader/copy";
import { formatDateTime, formatMoney } from "@/components/trader/format";
import type { TraderApprovalRequest } from "@/lib/trader/types";

export default function ApprovalQueueView({
  approvals,
  busy,
  onApprove,
  onReject,
}: {
  approvals: TraderApprovalRequest[];
  busy: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const pending = approvals.filter((approval) => approval.status === "pending");
  return (
    <Panel eyebrow="Akceptacja administratora" title="Zlecenia do akceptacji">
      {!pending.length ? (
        <EmptyState>Brak propozycji oczekujących na decyzję.</EmptyState>
      ) : (
        <TableCard
          rows={pending}
          empty="Brak propozycji."
          columns={["Rynek", "Strona", "Kwota", "Cena", "Ryzyko", "Wygasa", "Akcja"]}
          render={(approval) => (
            <tr key={approval.id}>
              <td>{approval.pair}<span>{approval.exchange}</span></td>
              <td>{approval.side}</td>
              <td>{formatMoney(approval.proposed_amount)}</td>
              <td>{formatMoney(approval.current_price)}</td>
              <td><StatusBadge status={approval.risk_level}>{traderCopy.pl.statuses[approval.risk_level]}</StatusBadge><span>{approval.rationale}</span></td>
              <td>{formatDateTime(approval.expires_at)}</td>
              <td>
                <div className="row-actions">
                  <button className="button primary small" type="button" onClick={() => onApprove(approval.id)} disabled={busy}>Zatwierdź</button>
                  <button className="button danger-soft small" type="button" onClick={() => onReject(approval.id)} disabled={busy}>Odrzuć</button>
                </div>
              </td>
            </tr>
          )}
        />
      )}
    </Panel>
  );
}
