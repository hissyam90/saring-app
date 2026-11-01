export const PASSWORD_RESET_SUBJECT = "Reset kata sandi akun Saring";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export interface PasswordResetEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Template email reset kata sandi. Sengaja sederhana dan tanpa data sensitif
 * selain tautan sekali pakai: tidak ada nama, email, atau isi akun.
 */
export function passwordResetEmail(input: {
  resetUrl: string;
  expiresInMinutes: number;
}): PasswordResetEmail {
  const url = escapeHtml(input.resetUrl);
  const minutes = input.expiresInMinutes;

  const text = [
    "Saring — Pendamping Kepercayaan Digital",
    "",
    "Kami menerima permintaan untuk mengatur ulang kata sandi akun Saring yang memakai alamat email ini.",
    "",
    "Buka tautan berikut untuk membuat kata sandi baru:",
    input.resetUrl,
    "",
    `Tautan berlaku ${minutes} menit dan hanya dapat dipakai satu kali.`,
    "Jika Anda tidak meminta reset kata sandi, abaikan email ini. Kata sandi Anda tidak berubah.",
    "",
    "Jangan teruskan email ini ke siapa pun. Petugas Saring tidak pernah meminta kata sandi atau tautan reset.",
    "",
    "Saring tidak dapat memastikan keamanan akun Anda di luar aplikasi. Selalu periksa alamat situs sebelum memasukkan kata sandi.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="id">
  <body style="margin:0;padding:24px;background:#f5f2ea;font-family:Arial,Helvetica,sans-serif;color:#111111;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:2px solid #111111;">
      <div style="background:#111111;color:#f5f2ea;padding:16px 20px;">
        <p style="margin:0;font-size:14px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;">Saring</p>
        <p style="margin:4px 0 0;font-size:12px;color:#c9f36b;">Saring Sebelum Sharing. Periksa Sebelum Percaya.</p>
      </div>
      <div style="padding:20px;">
        <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">Reset kata sandi akun Saring</h1>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;">
          Kami menerima permintaan untuk mengatur ulang kata sandi akun Saring yang memakai alamat email ini.
        </p>
        <p style="margin:0 0 16px;">
          <a href="${url}" style="display:inline-block;border:2px solid #111111;background:#c9f36b;color:#111111;padding:12px 18px;font-size:14px;font-weight:bold;text-decoration:none;">
            Buat kata sandi baru
          </a>
        </p>
        <p style="margin:0 0 12px;font-size:13px;line-height:1.6;">
          Tautan berlaku <strong>${minutes} menit</strong> dan hanya dapat dipakai satu kali.
        </p>
        <p style="margin:0 0 12px;font-size:13px;line-height:1.6;">
          Jika Anda tidak meminta reset kata sandi, abaikan email ini. Kata sandi Anda tidak berubah.
        </p>
        <p style="margin:0;font-size:12px;line-height:1.6;color:#555555;">
          Jangan teruskan email ini ke siapa pun. Petugas Saring tidak pernah meminta kata sandi atau tautan reset.
        </p>
      </div>
    </div>
  </body>
</html>`;

  return { subject: PASSWORD_RESET_SUBJECT, html, text };
}