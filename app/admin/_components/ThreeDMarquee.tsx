"use client";
import { motion } from "framer-motion";

export interface MarqueeImage {
  src: string;
  logo?: boolean; // true = contain + padding, false/undefined = cover
}

interface Props {
  images: MarqueeImage[];
}

export function ThreeDMarquee({ images }: Props) {
  const cols: MarqueeImage[][] = [[], [], [], []];
  images.forEach((img, i) => cols[i % 4]!.push(img));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        perspective: "900px",
        perspectiveOrigin: "center center",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          padding: "12px",
          transform: "rotateX(18deg) rotateZ(-8deg) scale(1.3)",
          transformOrigin: "center top",
          height: "100%",
        }}
      >
        {cols.map((col, ci) => (
          <MarqueeCol key={ci} images={col} reverse={ci % 2 === 1} />
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(13,13,18,0.65) 0%, rgba(13,13,18,0.92) 100%)",
        }}
      />
    </div>
  );
}

function MarqueeCol({ images, reverse }: { images: MarqueeImage[]; reverse: boolean }) {
  const list = [...images, ...images, ...images];
  const totalH = list.length * (180 + 12);

  return (
    <div style={{ overflow: "hidden", height: "100dvh" }}>
      <motion.div
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
        animate={{ y: reverse ? [0, -totalH / 3] : [-totalH / 3, 0] }}
        transition={{ duration: 18, ease: "linear", repeat: Infinity }}
      >
        {list.map((item, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              height: 180,
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.07)",
              background: item.logo ? "#16161F" : undefined,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: item.logo ? "24px 20px" : undefined,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.src}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: item.logo ? "contain" : "cover",
              }}
              loading="lazy"
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
