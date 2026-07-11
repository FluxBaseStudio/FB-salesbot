"use client";

import { Panel, StatusBadge, TableCard } from "@/components/admin/ui";
import { formatDateTime, formatMoney } from "@/components/trader/format";
import type { TraderOrder, TraderTrade } from "@/lib/trader/types";

export default function HistoryView({ orders, trades }: { orders: TraderOrder[]; trades: TraderTrade[] }) {
  return (
    <>
      <Panel eyebrow="Historia" title="Zlecenia">
        <TableCard
          rows={orders}
          empty="Brak zleceń."
          columns={["Symbol", "Strona", "Kwota", "Status", "Idempotency key", "Data"]}
          render={(order) => (
            <tr key={order.id}>
              <td>{order.symbol}<span>{order.exchange}</span></td>
              <td>{order.side}</td>
              <td>{formatMoney(order.amount)}</td>
              <td><StatusBadge status={order.status}>{order.status}</StatusBadge></td>
              <td><code>{order.idempotency_key}</code></td>
              <td>{formatDateTime(order.created_at)}</td>
            </tr>
          )}
        />
      </Panel>
      <Panel eyebrow="Historia" title="Transakcje paper/live">
        <TableCard
          rows={trades}
          empty="Brak transakcji."
          columns={["Symbol", "Strona", "Cena", "Ilość", "Fee", "P/L", "Data"]}
          render={(trade) => (
            <tr key={trade.id}>
              <td>{trade.symbol}</td>
              <td>{trade.side}</td>
              <td>{formatMoney(trade.price)}</td>
              <td>{trade.quantity}</td>
              <td>{formatMoney(trade.fee)}</td>
              <td>{trade.realized_pnl ? formatMoney(trade.realized_pnl) : "-"}</td>
              <td>{formatDateTime(trade.traded_at)}</td>
            </tr>
          )}
        />
      </Panel>
    </>
  );
}
