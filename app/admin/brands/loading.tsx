import { Skeleton, SkeletonShell } from "@/app/admin/_components/Skeleton";

export default function BrandsLoading() {
  return (
    <SkeletonShell>
      <div className="admin-header">
        <Skeleton width={100} height={26} />
        <Skeleton width={130} height={34} radius={8} />
      </div>

      <div className="admin-section">
        <Skeleton width={60} height={12} radius={4} />
        <div className="brand-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="brand-card" style={{ pointerEvents: "none" }}>
              <div className="brand-card__header">
                <Skeleton width={90} height={22} />
              </div>
              <div className="brand-card__body">
                <Skeleton width="65%" height={16} style={{ marginBottom: 8 }} />
                <Skeleton width="45%" height={12} />
              </div>
              <div className="brand-card__footer">
                <Skeleton width={90} height={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonShell>
  );
}
