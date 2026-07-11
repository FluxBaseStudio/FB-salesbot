"use client";

import { useEffect, useRef, useState } from "react";

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

function formatCountdown(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function SessionGuard({
  timeoutMinutes,
  warningMinutes = 2,
  onLogout,
  panelLabel = "panelu",
}: {
  timeoutMinutes: number;
  warningMinutes?: number;
  onLogout: () => void | Promise<void>;
  panelLabel?: string;
}) {
  const [warningVisible, setWarningVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(warningMinutes * 60);
  const lastActivityRef = useRef(Date.now());
  const warningRef = useRef(false);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    warningRef.current = warningVisible;
  }, [warningVisible]);

  useEffect(() => {
    function registerActivity() {
      // Po pokazaniu ostrzeżenia licznik odnawia tylko świadome kliknięcie
      // przycisku "Zostań zalogowany", nie przypadkowy ruch myszką.
      if (warningRef.current || loggingOutRef.current) return;
      lastActivityRef.current = Date.now();
    }

    ACTIVITY_EVENTS.forEach((eventName) => window.addEventListener(eventName, registerActivity, { passive: true }));

    // Gdy przeglądarka przywraca stronę z bfcache (przycisk Wstecz),
    // wymuszamy pełne przeładowanie, żeby nie pokazać danych bez ważnej sesji.
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", onPageShow);

    const timeoutMs = timeoutMinutes * 60_000;
    const warningMs = Math.max(timeoutMs - warningMinutes * 60_000, 0);

    const interval = window.setInterval(() => {
      if (loggingOutRef.current) return;
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= timeoutMs) {
        loggingOutRef.current = true;
        setWarningVisible(false);
        void Promise.resolve(onLogout()).catch(() => {
          loggingOutRef.current = false;
        });
        return;
      }

      if (elapsed >= warningMs) {
        setSecondsLeft(Math.ceil((timeoutMs - elapsed) / 1000));
        setWarningVisible(true);
      } else if (warningRef.current) {
        setWarningVisible(false);
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, registerActivity));
      window.removeEventListener("pageshow", onPageShow);
      window.clearInterval(interval);
    };
  }, [timeoutMinutes, warningMinutes, onLogout]);

  function stayLoggedIn() {
    lastActivityRef.current = Date.now();
    setWarningVisible(false);
  }

  if (!warningVisible) return null;

  return (
    <div className="session-modal-backdrop" role="dialog" aria-modal="true" aria-label="Sesja wkrótce wygaśnie">
      <section className="session-modal">
        <div className="session-modal-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </div>
        <h2>Twoja sesja zaraz wygaśnie</h2>
        <p>
          Z powodu braku aktywności za chwilę wylogujemy Cię z {panelLabel}. To zabezpieczenie na wypadek,
          gdyby komputer został bez opieki.
        </p>
        <div className="session-modal-countdown" aria-live="polite">
          <strong>{formatCountdown(secondsLeft)}</strong>
          <span>do automatycznego wylogowania</span>
        </div>
        <div className="session-modal-actions">
          <button className="button primary" type="button" onClick={stayLoggedIn} autoFocus>
            Zostań zalogowany
          </button>
          <button
            className="button ghost"
            type="button"
            onClick={() => {
              loggingOutRef.current = true;
              setWarningVisible(false);
              void Promise.resolve(onLogout());
            }}
          >
            Wyloguj teraz
          </button>
        </div>
      </section>
    </div>
  );
}
