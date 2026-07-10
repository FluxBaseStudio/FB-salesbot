import React from "react";

import BotSellerLogo from "@/components/brand/BotSellerLogo";

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  min?: number;
  max?: number;
  span?: boolean;
  help?: string;
};

type SelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  children: React.ReactNode;
  span?: boolean;
  help?: string;
};

type ShellNavItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
};

type LinePoint = {
  label: string;
  value: number;
  secondary?: number;
};

type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

export function DashboardShell({
  sidebar,
  children,
  className = "",
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`app-shell ${className}`.trim()}>
      {sidebar}
      <main className="content">{children}</main>
    </div>
  );
}

export function Sidebar({
  title,
  subtitle,
  items,
  activeId,
  onSelect,
  footer,
  cta,
}: {
  title: string;
  subtitle: string;
  items: ShellNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  footer?: React.ReactNode;
  cta?: React.ReactNode;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand" aria-label={`${title} ${subtitle}`}>
        <BotSellerLogo variant="sidebar" />
      </div>
      <nav aria-label="Nawigacja panelu">
        {items.map((item) => (
          <button
            className={activeId === item.id ? "nav-item active" : "nav-item"}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            {item.icon ? <span className="nav-icon">{item.icon}</span> : null}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      {cta ? <div className="sidebar-cta">{cta}</div> : null}
      {footer ? <div className="sidebar-footer">{footer}</div> : null}
    </aside>
  );
}

export function TopBar({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return <ScreenHeader title={title} subtitle={subtitle} action={action} />;
}

export function ScreenHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="screen-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action ? <div className="screen-actions">{action}</div> : null}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  trend,
  icon,
  tone = "blue",
}: {
  label: string;
  value: number | string;
  detail?: string;
  trend?: string;
  icon?: React.ReactNode;
  tone?: "blue" | "green" | "violet" | "amber";
}) {
  return (
    <section className={`metric-card ${tone}`}>
      <div className="metric-top">
        <span>{label}</span>
        {icon ? <div className="metric-icon">{icon}</div> : null}
      </div>
      <strong>{value}</strong>
      {trend || detail ? (
        <small>
          {trend ? <b>{trend}</b> : null}
          {detail ? <span>{detail}</span> : null}
        </small>
      ) : null}
    </section>
  );
}

export function Panel({
  title,
  eyebrow,
  children,
  footer,
  className = "",
}: {
  title?: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`.trim()}>
      {eyebrow || title ? (
        <div className="panel-title">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          {title ? <h2>{title}</h2> : null}
        </div>
      ) : null}
      {children}
      {footer ? <div className="panel-footer">{footer}</div> : null}
    </section>
  );
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel chart-card">
      <div className="panel-head">
        <div>
          <span>{subtitle}</span>
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Button({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button className={`button ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />;
}

export function InputField({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
  inputMode,
  min,
  max,
  span,
  help,
}: FieldProps) {
  return (
    <label className={span ? "field span" : "field"}>
      <span>{label}</span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        placeholder={placeholder}
        inputMode={inputMode}
        min={min}
        max={max}
      />
      {help ? <small className="field-help">{help}</small> : null}
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  required,
  span = true,
  help,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  span?: boolean;
  help?: string;
  placeholder?: string;
}) {
  return (
    <label className={span ? "field span" : "field"}>
      <span>{label}</span>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} />
      {help ? <small className="field-help">{help}</small> : null}
    </label>
  );
}

export function SelectField({ label, value, onChange, required, children, span, help }: SelectProps) {
  return (
    <label className={span ? "field span" : "field"}>
      <span>{label}</span>
      <Select value={value} onChange={(event) => onChange(event.target.value)} required={required}>
        {children}
      </Select>
      {help ? <small className="field-help">{help}</small> : null}
    </label>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <section className="modal-panel">
        <div className="panel-head">
          <h2>{title}</h2>
          <button className="button small" type="button" onClick={onClose}>
            Zamknij
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function Notice({
  tone,
  children,
}: {
  tone: "info" | "success" | "warning" | "danger";
  children: React.ReactNode;
}) {
  return <div className={`notice ${tone}`}>{children}</div>;
}

export function StatusBadge({ status, children }: { status: string; children: React.ReactNode }) {
  const tone =
    ["active", "draft_generated", "approved", "sent", "delivered", "opened", "replied", "follow_up_sent", "email_found", "paid", "completed"].includes(status) ? "success"
    : ["paused", "email_missing", "skipped_no_email", "draft", "queued", "sending", "follow_up_scheduled", "pending_payment", "payment_failed", "running", "partial", "cancel_requested"].includes(status) ? "warning"
    : ["cancelled", "do_not_contact", "failed", "bounced", "spam", "unsubscribed"].includes(status) ? "danger"
    : "neutral";

  return <span className={`status-badge ${tone}`}>{children}</span>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

function withMobileTableLabels(rowNode: React.ReactNode, columns: string[], fallbackKey: React.Key): React.ReactNode {
  if (!React.isValidElement(rowNode)) return rowNode;

  const rowElement = rowNode as React.ReactElement<{ children?: React.ReactNode }>;
  const labelledCells = React.Children.map(rowElement.props.children, (cell, index) => {
    if (!React.isValidElement(cell)) return cell;
    return React.cloneElement(
      cell as React.ReactElement<Record<string, unknown>>,
      { "data-label": columns[index] || "" }
    );
  });

  return React.cloneElement(rowElement, { key: rowElement.key ?? fallbackKey }, labelledCells);
}

export function DataTable<T>({
  rows,
  empty,
  columns,
  render,
}: {
  rows: T[];
  empty: string;
  columns: string[];
  render: (row: T) => React.ReactNode;
}) {
  return (
    <section className="table-card">
      {rows.length === 0 ? (
        <EmptyState>{empty}</EmptyState>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>{rows.map((row, index) => withMobileTableLabels(render(row), columns, index))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export const TableCard = DataTable;

export function LineChart({
  points,
  secondaryLabel = "Odpowiedzi",
  primaryLabel = "Wiadomości",
}: {
  points: LinePoint[];
  secondaryLabel?: string;
  primaryLabel?: string;
}) {
  const hasData = points.some((point) => point.value > 0 || (point.secondary || 0) > 0);
  if (!hasData) return <EmptyState>Brak danych do wykresu.</EmptyState>;

  const width = 520;
  const height = 220;
  const padding = 28;
  const max = Math.max(...points.flatMap((point) => [point.value, point.secondary || 0]), 1);
  const xStep = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  function coords(key: "value" | "secondary") {
    return points
      .map((point, index) => {
        const raw = key === "value" ? point.value : point.secondary || 0;
        const x = padding + index * xStep;
        const y = height - padding - (raw / max) * (height - padding * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <div className="line-chart">
      <div className="chart-legend">
        <span><i className="legend-line blue" />{primaryLabel}</span>
        <span><i className="legend-line green" />{secondaryLabel}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Wykres liniowy">
        {[0, 1, 2, 3].map((line) => {
          const y = padding + line * ((height - padding * 2) / 3);
          return <line key={line} x1={padding} x2={width - padding} y1={y} y2={y} />;
        })}
        <polyline className="chart-primary" points={coords("value")} />
        <polyline className="chart-secondary" points={coords("secondary")} />
        {points.map((point, index) => (
          <text key={point.label} x={padding + index * xStep} y={height - 7} textAnchor="middle">
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function DonutChart({
  segments,
  center,
}: {
  segments: DonutSegment[];
  center?: React.ReactNode;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (!total) return <EmptyState>Brak danych do podziału.</EmptyState>;

  let cursor = 0;
  const gradient = segments
    .map((segment) => {
      const start = cursor;
      const end = cursor + (segment.value / total) * 100;
      cursor = end;
      return `${segment.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="donut-chart">
      <div className="donut-visual" style={{ "--donut": `conic-gradient(${gradient})` } as React.CSSProperties}>
        <div>{center || <><strong>{total}</strong><span>łącznie</span></>}</div>
      </div>
      <ul>
        {segments.map((segment) => (
          <li key={segment.label}>
            <span><i style={{ background: segment.color }} />{segment.label}</span>
            <strong>{Math.round((segment.value / total) * 100)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProgressBar({
  label,
  value,
  max,
  tone = "blue",
}: {
  label: string;
  value: number;
  max: number;
  tone?: "blue" | "green" | "violet";
}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div className={`progress-row ${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value.toLocaleString("pl-PL")} / {max.toLocaleString("pl-PL")}</strong>
      </div>
      <div className="progress-track" aria-label={`${label}: ${percent}%`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <b>{percent}%</b>
    </div>
  );
}
