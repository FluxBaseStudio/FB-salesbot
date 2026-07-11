"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const COOKIE_KEY = "fluxbase-botseller-cookie-consent";

export default function CookieBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith("/admin") || pathname?.startsWith("/client")) return;
    setVisible(!window.localStorage.getItem(COOKIE_KEY));
  }, [pathname]);

  function choose(value: "accepted" | "rejected") {
    window.localStorage.setItem(COOKIE_KEY, value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Informacja o plikach cookies">
      <div>
        <strong>Cookies i dane techniczne</strong>
        <p>
          Używamy plików cookies do działania strony, poprawy wygody korzystania i obsługi formularzy. Szczegóły znajdziesz w naszej{" "}
          <Link href="/cookies">polityce cookies</Link> i <Link href="/polityka-prywatnosci">polityce prywatności</Link>.
        </p>
      </div>
      <div className="cookie-actions">
        <button className="secondary" type="button" onClick={() => choose("rejected")}>Odrzuć</button>
        <button type="button" onClick={() => choose("accepted")}>Akceptuję</button>
      </div>
    </div>
  );
}
