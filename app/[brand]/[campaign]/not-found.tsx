import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ padding: "160px 24px", maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
      <h1 style={{ fontFamily: "var(--font-display), serif", fontSize: 56, margin: "0 0 12px" }}>
        Campanha não encontrada
      </h1>
      <p style={{ color: "var(--ink-mut)", marginBottom: 32 }}>
        Esta landing page não existe ou foi despublicada.
      </p>
      <Link
        href="/"
        style={{ color: "var(--lav)", textDecoration: "underline", fontFamily: "var(--font-sans)" }}
      >
        Voltar à página inicial
      </Link>
    </main>
  );
}
