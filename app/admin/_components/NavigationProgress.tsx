"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const prevPath = useRef(pathname);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const a = (e.target as HTMLElement).closest("a");
      if (!a?.href) return;
      try {
        const url = new URL(a.href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === pathname) return;
        start();
      } catch { /* external href */ }
    }
    document.addEventListener("click", onLinkClick);
    return () => document.removeEventListener("click", onLinkClick);
  }, [pathname]);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      finish();
    }
  }, [pathname]);

  function start() {
    if (timer.current) clearInterval(timer.current);
    setVisible(true);
    setProgress(12);
    let p = 12;
    timer.current = setInterval(() => {
      p += (88 - p) * 0.12;
      setProgress(Math.min(p, 82));
    }, 180);
  }

  function finish() {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setProgress(100);
    setTimeout(() => { setVisible(false); setProgress(0); }, 380);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="nprogress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
          style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, zIndex: 9999 }}
        >
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            style={{
              height: "100%",
              background: "linear-gradient(to right, #A67CFF, #C8AAFF)",
              boxShadow: "0 0 10px 1px rgba(166,124,255,0.55)",
              borderRadius: "0 2px 2px 0",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
