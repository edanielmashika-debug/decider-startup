import { useEffect, useRef, useState } from "react";

// Makes the app installable (Step 10): registers the service worker and catches the
// browser's "install" offer so the menu can show an "Install app" item.
// Chrome on Android makes the offer. iPhone Safari never does: there the person uses
// Share, then "Add to Home Screen".

// This event is not in TypeScript's built-in types
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function usePwa() {
  const offer = useRef<InstallEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // The service worker is only registered in the real (built) app, so the dev server
    // never serves you old cached copies while you are coding.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // not allowed here (private mode, old browser): the app still works online
      });
    }

    function onOffer(e: Event) {
      e.preventDefault(); // keep the offer so our own menu item can show it
      offer.current = e as InstallEvent;
      setCanInstall(true);
    }
    function onInstalled() {
      offer.current = null;
      setCanInstall(false);
    }
    window.addEventListener("beforeinstallprompt", onOffer);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onOffer);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Call from a tap: shows the phone's install box
  async function install() {
    const e = offer.current;
    if (!e) return;
    try {
      await e.prompt();
      await e.userChoice;
    } catch {
      // the box could not be shown: nothing to do
    }
    offer.current = null; // an offer can only be used once
    setCanInstall(false);
  }

  return { canInstall, install };
}