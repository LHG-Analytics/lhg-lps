import Link from "next/link";
import { getAllCampaigns } from "@/lib/content";

export const dynamic = "force-static";

export default async function Index() {
  const campaigns = await getAllCampaigns();

  return (
    <main style={{ padding: "120px 24px", maxWidth: 720, margin: "0 auto" }}>
      <h1
        style={{
          fontFamily: "var(--font-display), serif",
          fontSize: 48,
          margin: "0 0 12px",
        }}
      >
        Lush Hotel Group
      </h1>
      <p style={{ color: "var(--ink-mut)", marginBottom: 32 }}>
        Landing pages disponíveis. Em produção, cada uma é servida pelo seu
        próprio subdomínio via rewrites.
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {campaigns.map(({ brand, campaign }) => (
          <li key={`${brand}/${campaign}`} style={{ marginBottom: 12 }}>
            <Link
              href={`/${brand}/${campaign}` as never}
              style={{
                color: "var(--lav)",
                textDecoration: "underline",
                fontFamily: "var(--font-sans)",
              }}
            >
              /{brand}/{campaign}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
