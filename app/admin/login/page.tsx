"use client";
import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ThreeDMarquee } from "../_components/ThreeDMarquee";

const MARQUEE_IMAGES = [
  "/brands/lush/units/fachada-ipiranga.png",
  "/brands/lush/units/fachada-lapa.png",
  "/brands/andardecima/units/fachada-adc.png",
  "/brands/tout/units/fachada-tout.jpg",
  "/brands/tout/units/fachada-tout.jpg",
  "/brands/lush/units/fachada-lapa.png",
  "/brands/andardecima/units/fachada-adc.png",
  "/brands/lush/units/fachada-ipiranga.png",
  "/brands/andardecima/units/fachada-adc.png",
  "/brands/lush/units/fachada-ipiranga.png",
  "/brands/tout/units/fachada-tout.jpg",
  "/brands/lush/units/fachada-lapa.png",
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogle() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError("Não foi possível conectar com o Google. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap" style={{ position: "relative" }}>
      <ThreeDMarquee images={MARQUEE_IMAGES} />

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

        {error && <p className="login-error">{error}</p>}

        <button
          onClick={handleGoogle}
          className="login-btn-google"
          disabled={loading}
        >
          <GoogleIcon />
          {loading ? "Redirecionando…" : "Entrar com Google"}
        </button>
      </div>
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
