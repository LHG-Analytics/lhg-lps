import type { CSSProperties } from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: number;
  style?: CSSProperties;
}

export function Skeleton({ width = "100%", height = 16, radius = 6, style }: SkeletonProps) {
  return (
    <div
      className="adm-skeleton"
      style={{ width, height, borderRadius: radius, flexShrink: 0, ...style }}
    />
  );
}

/* Skeleton sidebar + main — used by all loading.tsx files */
export function SkeletonShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      {/* sidebar skeleton */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <Skeleton width={80} height={22} />
        </div>
        <nav className="admin-nav" style={{ gap: 6 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={36} radius={8} />
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <Skeleton width="70%" height={12} radius={4} />
          <Skeleton height={30} radius={6} />
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
