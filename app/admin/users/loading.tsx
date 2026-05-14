import { Skeleton, SkeletonShell } from "@/app/admin/_components/Skeleton";

export default function UsersLoading() {
  return (
    <SkeletonShell>
      <div className="admin-header">
        <Skeleton width={110} height={26} />
        <Skeleton width={120} height={34} radius={8} />
      </div>

      <div className="admin-section">
        <table className="admin-table">
          <thead>
            <tr>
              {[110, 140, 80, 60, 40].map((w, i) => (
                <th key={i}><Skeleton width={w} height={10} radius={3} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, r) => (
              <tr key={r}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Skeleton width={32} height={32} radius={99} />
                    <Skeleton width="55%" height={13} radius={4} />
                  </div>
                </td>
                <td><Skeleton width="70%" height={13} radius={4} /></td>
                <td><Skeleton width={64} height={20} radius={99} /></td>
                <td><Skeleton width={80} height={13} radius={4} /></td>
                <td><Skeleton width={28} height={28} radius={6} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SkeletonShell>
  );
}
