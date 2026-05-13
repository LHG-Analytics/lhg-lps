"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ThreeDMarquee, type MarqueeImage } from "../_components/ThreeDMarquee";

const MARQUEE_IMAGES: MarqueeImage[] = [
  { src: "/brands/lush/units/fachada-ipiranga.png" },
  { src: "/brands/lush/units/fachada-lapa.png" },
  { src: "/brands/andardecima/units/fachada-adc.png" },
  { src: "/brands/tout/units/fachada-tout.jpg" },
  { src: "/brands/lush/logo-lush.png", logo: true },
  { src: "/brands/andardecima/units/svg-adc.png", logo: true },
  { src: "/brands/tout/units/svg-tout.png", logo: true },
  { src: "/brands/lush/units/fachada-lapa.png" },
  { src: "/brands/andardecima/units/fachada-adc.png" },
  { src: "/brands/tout/units/fachada-tout.jpg" },
  { src: "/brands/lush/units/fachada-ipiranga.png" },
  { src: "/brands/lhg/logos/logo-white.png", logo: true },
];

const URL_ERRORS: Record<string, string> = {
  not_invited:    "Seu e-mail não tem acesso ao CMS. Solicite um convite ao administrador.",
  invite_expired: "Seu convite expirou. Solicite um novo convite ao administrador.",
  auth:           "Erro na autenticação. Tente novamente.",
};

function LoginContent() {
  const searchParams = useSearchParams();
  const urlError     = searchParams.get("error");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(urlError ? (URL_ERRORS[urlError] ?? "Erro desconhecido.") : "");

  async function handleGoogle() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError("Não foi possível conectar com o Google. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="login-card" style={{ position: "relative", zIndex: 10 }}>
      <div className="login-logo">
        <Image
          src="/brands/lhg/logos/logo-white.png"
          alt="LHG"
          width={160}
          height={40}
          priority
          style={{ width: "auto", height: 36 }}
        />
      </div>

      <h1 className="login-title">Gerenciador de Campanhas</h1>
      <p className="login-sub">Acesso restrito à equipe LHG.</p>

      {error && (
        <p className="login-error" style={{
          background: urlError === "not_invited" ? "rgba(224,82,96,0.12)" : undefined,
          border:     urlError === "not_invited" ? "1px solid rgba(224,82,96,0.3)" : undefined,
          borderRadius: 7, padding: urlError === "not_invited" ? "10px 14px" : undefined,
          lineHeight: 1.5,
        }}>
          {error}
        </p>
      )}

      <button onClick={handleGoogle} className="login-btn-google" disabled={loading}>
        <GoogleIcon />
        {loading ? "Redirecionando…" : "Entrar com Google"}
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="login-wrap" style={{ position: "relative" }}>
      <ThreeDMarquee images={MARQUEE_IMAGES} />
      <Suspense fallback={<div className="login-card" style={{ position: "relative", zIndex: 10 }} />}>
        <LoginContent />
      </Suspense>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
