import { Skeleton, SkeletonShell } from "@/app/admin/_components/Skeleton";

export default function CampaignsLoading() {
  return (
    <SkeletonShell>
      <div className="admin-header">
        <Skeleton width={140} height={26} />
        <Skeleton width={140} height={34} radius={8} />
      </div>

      <div className="admin-section">
        <table className="admin-table">
          <thead>
            <tr>
              {["Campanha", "Marca", "Slug", "Status", "Datas", ""].map((_, i) => (
                <th key={i}><Skeleton width={i === 5 ? 32 : 70} height={10} radius={3} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 7 }).map((_, r) => (
              <tr key={r}>
                <td><Skeleton width="75%" height={14} radius={4} /></td>
                <td><Skeleton width={90} height={20} radius={10} /></td>
                <td><Skeleton width={110} height={13} radius={4} /></td>
                <td><Skeleton width={72} height={20} radius={99} /></td>
                <td><Skeleton width={95} height={13} radius={4} /></td>
                <td><Skeleton width={28} height={28} radius={6} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SkeletonShell>
  );
}
