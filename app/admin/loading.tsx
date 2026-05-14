import { Skeleton, SkeletonShell } from "@/app/admin/_components/Skeleton";

export default function AdminDashboardLoading() {
  return (
    <SkeletonShell>
      {/* header */}
      <div className="admin-header">
        <Skeleton width={160} height={26} />
        <Skeleton width={120} height={34} radius={8} />
      </div>

      {/* brand grid section */}
      <div className="admin-section">
        <Skeleton width={80} height={12} radius={4} />
        <div className="brand-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="brand-card" style={{ pointerEvents: "none" }}>
              <div className="brand-card__header">
                <Skeleton width={100} height={24} />
              </div>
              <div className="brand-card__body">
                <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
                <Skeleton width="40%" height={12} />
              </div>
              <div className="brand-card__footer">
                <Skeleton width={80} height={12} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* recent campaigns section */}
      <div className="admin-section">
        <Skeleton width={130} height={12} radius={4} />
        <SkeletonTable cols={5} rows={5} />
      </div>
    </SkeletonShell>
  );
}

function SkeletonTable({ cols, rows }: { cols: number; rows: number }) {
  return (
    <table className="admin-table">
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i}><Skeleton width={60} height={10} radius={3} /></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c}>
                <Skeleton
                  width={c === 0 ? "80%" : c === cols - 1 ? 60 : "60%"}
                  height={14}
                  radius={4}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
