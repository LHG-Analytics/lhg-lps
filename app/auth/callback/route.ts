import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet) => {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      return NextResponse.redirect(`${origin}/admin/login?error=auth`);
    }

    const { user } = data;
    const email = user.email ?? "";
    const name  = (user.user_metadata?.full_name as string | undefined) ?? email;

    // Usuário já tem perfil cadastrado → atualiza email/name e libera
    const { data: existing } = await supabase
      .from("admin_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("admin_profiles")
        .update({ email, name })
        .eq("id", user.id);
      return NextResponse.redirect(`${origin}/admin`);
    }

    // Verifica se há um convite válido (não expirado) para este e-mail
    const { data: invite } = await supabase
      .from("admin_invites")
      .select("role, expires_at")
      .eq("email", email)
      .maybeSingle();

    if (invite) {
      const expired = invite.expires_at && new Date(invite.expires_at) < new Date();
      if (expired) {
        // Convite expirado — limpa e rejeita
        await supabase.from("admin_invites").delete().eq("email", email);
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/admin/login?error=invite_expired`);
      }
      // Aceita o convite: cria perfil e remove o convite
      await supabase.from("admin_profiles").insert({
        id:    user.id,
        email,
        name,
        role:  invite.role,
      });
      await supabase.from("admin_invites").delete().eq("email", email);
      return NextResponse.redirect(`${origin}/admin`);
    }

    // Não convidado → encerra a sessão
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/admin/login?error=not_invited`);
  }

  return NextResponse.redirect(`${origin}/admin/login?error=auth`);
}
