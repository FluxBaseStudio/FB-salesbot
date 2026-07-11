import { StatusBadge } from "@/components/admin/ui";
import { formatDateTime, formatMoney } from "@/components/trader/format";
import type { TraderPosition } from "@/lib/trader/types";

export default function PositionCard({ position }: { position: TraderPosition }) {
  const pnlNegative = (position.realized_pnl || position.unrealized_pnl || "0").startsWith("-");
  return (
    <article className="trader-position-card">
      <div className="trader-position-head">
        <div>
          <strong>{position.pair}</strong>
          <span>{position.exchange} · {formatDateTime(position.opened_at)}</span>
        </div>
        <StatusBadge status={position.status}>{position.status}</StatusBadge>
      </div>
      <dl>
        <div><dt>Wejście</dt><dd>{formatMoney(position.entry_price)}</dd></div>
        <div><dt>Aktualnie</dt><dd>{formatMoney(position.current_price || position.exit_price)}</dd></div>
        <div><dt>Ilość</dt><dd>{position.quantity}</dd></div>
        <div><dt>P/L</dt><dd className={pnlNegative ? "negative" : "positive"}>{formatMoney(position.realized_pnl !== "0" ? position.realized_pnl : position.unrealized_pnl)}</dd></div>
      </dl>
    </article>
  );
}
