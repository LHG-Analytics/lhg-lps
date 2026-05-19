import { Resend } from "resend";

const FROM = process.env.RESEND_FROM ?? "LHG CMS <cms@lhgmoteis.com.br>";

export async function sendInviteEmail({
  to,
  role,
  invitedByEmail,
  loginUrl,
}: {
  to: string;
  role: "admin" | "editor";
  invitedByEmail: string | undefined;
  loginUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);

  const roleLabel = role === "admin" ? "Administrador" : "Editor";

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Você foi convidado para o LHG CMS",
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D0D14;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D14;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#16161F;border-radius:12px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;">
        <tr>
          <td style="padding:32px 40px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <img src="https://lhg-lps.vercel.app/brands/lhg/logos/logo-white.png" alt="LHG" height="28" style="display:block;">
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#F0EEF8;letter-spacing:-0.02em;">
              Você foi convidado
            </h1>
            <p style="margin:0 0 24px;font-size:15px;color:#8E8AA8;line-height:1.6;">
              ${invitedByEmail ? `<strong style="color:#C4BFDE;">${invitedByEmail}</strong> convidou você` : "Você foi convidado"} para acessar o <strong style="color:#C4BFDE;">LHG CMS</strong> com o perfil de <strong style="color:#A67CFF;">${roleLabel}</strong>.
            </p>
            <p style="margin:0 0 32px;font-size:14px;color:#55526A;line-height:1.6;">
              Este convite expira em 7 dias. Faça login com a conta Google vinculada a este e-mail.
            </p>
            <a href="${loginUrl}"
               style="display:inline-block;background:#A67CFF;color:#0D0D14;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:8px;letter-spacing:0.01em;">
              Acessar o CMS →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0;font-size:12px;color:#3A3750;line-height:1.5;">
              Se você não esperava este convite, ignore este e-mail. Nenhuma ação é necessária.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
