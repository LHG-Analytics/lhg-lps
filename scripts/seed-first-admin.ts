/**
 * seed-first-admin.ts
 *
 * Cria o primeiro admin_profile manualmente, quebrando o catch-22
 * do invite system quando o banco está vazio.
 *
 * USO:
 *   1. Faça login no Supabase Dashboard → Authentication → Users
 *   2. Copie o UUID do usuário que deve ser admin
 *   3. Execute:
 *        SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *        npx tsx scripts/seed-first-admin.ts <uuid> <email> <nome>
 *
 * A SERVICE_ROLE_KEY bypassa RLS e só deve ser usada neste script.
 * Nunca exponha esta chave no frontend ou nos env vars do Vercel
 * (use SUPABASE_SERVICE_ROLE_KEY apenas em scripts locais/CI server).
 */

import { createClient } from "@supabase/supabase-js";

const [,, userId, email, name] = process.argv;

if (!userId || !email) {
  console.error("Uso: npx tsx scripts/seed-first-admin.ts <user-uuid> <email> [nome]");
  process.exit(1);
}

const supabaseUrl      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas env vars.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const { error } = await supabase.from("admin_profiles").upsert({
  id:   userId,
  email,
  name: name ?? email,
  role: "admin",
}, { onConflict: "id" });

if (error) {
  console.error("Erro ao criar admin_profile:", error.message);
  process.exit(1);
}

console.log(`✓ admin_profile criado com sucesso para ${email} (${userId})`);
console.log("  Agora o usuário pode fazer login com Google e terá acesso de admin.");
