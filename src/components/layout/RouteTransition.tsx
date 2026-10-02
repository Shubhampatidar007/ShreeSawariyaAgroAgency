import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";

const TRANSITION_MS = 420;

type TransitionDirection = "forward" | "backward";

export function RouteTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const previousPathRef = useRef(location.pathname + location.search + location.hash);
  const [transition, setTransition] = useState<{ key: string; direction: TransitionDirection } | null>(null);

  useEffect(() => {
    const nextPath = location.pathname + location.search + location.hash;
    if (nextPath === previousPathRef.current) return;

    const nextDirection: TransitionDirection = location.pathname < previousPathRef.current ? "backward" : "forward";
    previousPathRef.current = nextPath;
    setTransition({ key: nextPath, direction: nextDirection });

    const timeout = window.setTimeout(() => setTransition(null), TRANSITION_MS);
    return () => window.clearTimeout(timeout);
  }, [location.pathname, location.search, location.hash]);

  return (
    <div className="route-transition" data-transitioning={transition ? "true" : "false"}>
      <div
        key={transition?.key ?? "idle"}
        className={transition ? `route-transition__incoming route-transition__incoming--${transition.direction}` : "route-transition__incoming"}
      >
        {children}
      </div>
      {transition ? <span className="route-transition__wipe" aria-hidden="true" /> : null}
    </div>
  );
}
