type BotSellerLogoProps = {
  variant?: "sidebar" | "header" | "landing" | "compact";
  subtitle?: string;
  className?: string;
};

export default function BotSellerLogo({ variant = "header", subtitle, className = "" }: BotSellerLogoProps) {
  const classes = ["botseller-logo", `botseller-logo-${variant}`, className].filter(Boolean).join(" ");
  const showText = variant !== "compact";

  return (
    <span className={classes} aria-label="FluxBase BotSeller">
      <span className="botseller-logo-mark" aria-hidden="true">
        <svg viewBox="0 0 64 54" role="img">
          <path className="bot-shadow" d="M16 49h25c9.8 0 17.8-7.7 17.8-17.2S50.8 14.6 41 14.6H17.8C8 14.6 1.2 22.1 1.2 31.6c0 4.3 1.7 8.4 4.7 11.5L4 52l8.9-4.5c1 .8 2 1.2 3.1 1.5Z" />
          <path className="bot-body" d="M17.7 47.2h24.6c8.8 0 15.9-6.9 15.9-15.5S51.1 16.2 42.3 16.2H17.7C8.9 16.2 1.8 23.1 1.8 31.7c0 4.1 1.7 8.1 4.7 11l-1.3 8 7.3-4c1.6.4 3.3.5 5.2.5Z" />
          <path className="bot-antenna" d="M32 16.2V8.7" />
          <circle className="bot-node" cx="32" cy="6.1" r="3.4" />
          <path className="bot-ear" d="M1.8 29.3H0v-6.6h2.3M58.2 22.7H62v15.8h-3.8" />
          <circle className="bot-eye" cx="21.5" cy="31" r="4.1" />
          <circle className="bot-eye" cx="40.2" cy="31" r="4.1" />
          <path className="bot-mouth" d="M26.3 40.2h10.9" />
        </svg>
      </span>
      {showText ? (
        <span className="botseller-logo-copy">
          <strong>FluxBase</strong>
          <span>{subtitle || "BotSeller"}</span>
        </span>
      ) : null}
    </span>
  );
}
