"use client";
import { useRef, useEffect, useState } from "react";

type Device = "desktop" | "tablet" | "mobile";

export { type Device };

interface Props {
  device: Device;
  children: React.ReactNode;
}

// Dimensões reais (px) de cada dispositivo — o frame é construído em torno delas
const DEVICE_DIMS = {
  desktop: { w: 1280, h: 800 },
  tablet:  { w: 820,  h: 1180 },
  mobile:  { w: 393,  h: 852 },
};

export function DeviceFrame({ device, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Calcula o scale para caber no container
  useEffect(() => {
    function compute() {
      const el = containerRef.current;
      if (!el) return;
      const { w, h } = DEVICE_DIMS[device];
      // Margem extra para a moldura
      const frameW = device === "desktop" ? w + 40  : device === "tablet" ? w + 56 : w + 28;
      const frameH = device === "desktop" ? h + 130 : device === "tablet" ? h + 80 : h + 90;
      const scaleW = (el.clientWidth  - 40) / frameW;
      const scaleH = (el.clientHeight - 40) / frameH;
      setScale(Math.min(scaleW, scaleH, 1));
    }
    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [device]);

  const { w, h } = DEVICE_DIMS[device];

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        background: device === "desktop"
          ? "radial-gradient(ellipse at 50% 30%, #1a1a2e 0%, #0D0D12 100%)"
          : "#111318",
        overflow: "hidden", position: "relative",
      }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: "center center", transition: "transform 0.3s" }}>
        {device === "desktop" && <IMacFrame w={w} h={h}>{children}</IMacFrame>}
        {device === "tablet"  && <IPadFrame w={w} h={h}>{children}</IPadFrame>}
        {device === "mobile"  && <IPhoneFrame w={w} h={h}>{children}</IPhoneFrame>}
      </div>
    </div>
  );
}

/* ── iMac ───────────────────────────────────────────── */
function IMacFrame({ w, h, children }: { w: number; h: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Monitor body */}
      <div style={{
        background: "linear-gradient(180deg, #2d2d2f 0%, #1d1d1f 100%)",
        borderRadius: 18,
        padding: "12px 12px 44px",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 0 1px #111, 0 40px 80px rgba(0,0,0,0.7)",
        position: "relative",
      }}>
        {/* Screen glass reflection */}
        <div style={{
          position: "absolute", inset: "12px 12px 44px",
          borderRadius: 10,
          background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%)",
          pointerEvents: "none", zIndex: 2,
        }} />
        {/* Screen */}
        <div style={{ width: w, height: h, borderRadius: 6, overflow: "hidden", background: "#000", position: "relative" }}>
          {children}
        </div>
        {/* Chin camera dot */}
        <div style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          width: 8, height: 8, borderRadius: "50%",
          background: "radial-gradient(circle, #555 30%, #333 100%)",
          boxShadow: "0 0 0 1px #222",
        }} />
      </div>

      {/* Neck */}
      <div style={{
        width: 120, height: 44,
        background: "linear-gradient(180deg, #3a3a3c 0%, #2c2c2e 100%)",
        clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",
      }} />

      {/* Base */}
      <div style={{
        width: 320, height: 14, borderRadius: "0 0 12px 12px",
        background: "linear-gradient(180deg, #3a3a3c 0%, #2c2c2e 100%)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }} />
    </div>
  );
}

/* ── iPad ───────────────────────────────────────────── */
function IPadFrame({ w, h, children }: { w: number; h: number; children: React.ReactNode }) {
  return (
    <div style={{
      background: "linear-gradient(160deg, #2d2d2f 0%, #1c1c1e 100%)",
      borderRadius: 28,
      padding: "26px 20px",
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px #111, 0 30px 70px rgba(0,0,0,0.7)",
      position: "relative",
    }}>
      {/* Camera + Face ID bar */}
      <div style={{
        position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
        width: 100, height: 5, borderRadius: 99,
        background: "#3a3a3c",
      }} />

      {/* Side buttons */}
      {[0.25, 0.38].map((t, i) => (
        <div key={i} style={{
          position: "absolute", right: -4, top: `${t * 100}%`,
          width: 4, height: 40, borderRadius: "0 4px 4px 0",
          background: "#3a3a3c",
        }} />
      ))}
      <div style={{
        position: "absolute", left: -4, top: "28%",
        width: 4, height: 60, borderRadius: "4px 0 0 4px",
        background: "#3a3a3c",
      }} />

      {/* Screen */}
      <div style={{ width: w, height: h, borderRadius: 8, overflow: "hidden", background: "#000" }}>
        {children}
      </div>

      {/* Glass reflection */}
      <div style={{
        position: "absolute", inset: "26px 20px",
        borderRadius: 10,
        background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 40%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}

/* ── iPhone ─────────────────────────────────────────── */
function IPhoneFrame({ w, h, children }: { w: number; h: number; children: React.ReactNode }) {
  return (
    <div style={{
      background: "linear-gradient(160deg, #2d2d2f 0%, #1c1c1e 100%)",
      borderRadius: 52,
      padding: "14px",
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.4), 0 0 0 1px #111, 0 30px 70px rgba(0,0,0,0.8)",
      position: "relative",
    }}>
      {/* Power button */}
      <div style={{
        position: "absolute", right: -4, top: "22%",
        width: 4, height: 72, borderRadius: "0 4px 4px 0",
        background: "#3a3a3c",
      }} />
      {/* Volume buttons */}
      {[0.18, 0.30].map((t, i) => (
        <div key={i} style={{
          position: "absolute", left: -4, top: `${t * 100}%`,
          width: 4, height: 44, borderRadius: "4px 0 0 4px",
          background: "#3a3a3c",
        }} />
      ))}

      {/* Screen */}
      <div style={{ width: w, height: h, borderRadius: 40, overflow: "hidden", background: "#000", position: "relative" }}>
        {children}

        {/* Dynamic Island */}
        <div style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          width: 120, height: 34, borderRadius: 20,
          background: "#000",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
          zIndex: 10, pointerEvents: "none",
        }} />
      </div>

      {/* Glass reflection */}
      <div style={{
        position: "absolute", inset: 14,
        borderRadius: 38,
        background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 40%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}
