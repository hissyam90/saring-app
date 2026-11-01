import { passwordResetEmail } from "./password-reset-email";

/**
 * Pengiriman email lewat Resend (HTTP API resmi).
 *
 * Proyek ini tidak menambahkan SDK: satu permintaan `fetch` sudah cukup dan
 * tidak menambah dependency baru. Kunci hanya dibaca di server; route handler
 * tidak pernah mengirimkannya ke klien.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TIMEOUT_MS = 8000;

export type EmailDeliveryStatus = "sent" | "not-configured" | "error";

export interface EmailDeliveryResult {
  ok: boolean;
  status: EmailDeliveryStatus;
}

export function resendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

/**
 * Mengirim tautan reset. Tidak pernah mencatat tautan atau token ke log.
 * Kegagalan konfigurasi/jaringan hanya dikembalikan sebagai status, sehingga
 * pemanggil tetap dapat memberi respons publik yang seragam.
 */
export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) return { ok: false, status: "not-configured" };

  const { subject, html, text } = passwordResetEmail({
    resetUrl: input.resetUrl,
    expiresInMinutes: input.expiresInMinutes,
  });

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [input.to], subject, html, text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    return response.ok
      ? { ok: true, status: "sent" }
      : { ok: false, status: "error" };
  } catch {
    return { ok: false, status: "error" };
  }
}