declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type EventParams = Record<string, string | number | boolean | undefined>;

/** Dispara um evento GA4 via gtag. No-op se gtag não estiver carregado. */
export function track(eventName: string, params?: EventParams) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", eventName, params);
}
