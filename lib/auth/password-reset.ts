import { createHash, randomBytes } from "node:crypto";

/** Masa berlaku tautan reset. Tidak boleh melebihi 30 menit. */
export const RESET_TOKEN_TTL_MINUTES = 30;

const TOKEN_BYTES = 32;

/** Panjang token base64url untuk 32 byte acak. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export interface GeneratedResetToken {
  /** Token asli. Hanya dikirim lewat email, tidak pernah disimpan. */
  token: string;
  /** SHA-256 heksadesimal yang disimpan di database. */
  tokenHash: string;
  /** Waktu kedaluwarsa (ISO 8601). */
  expiresAt: string;
}

/**
 * Token reset dibuat dari `crypto.randomBytes` (256 bit). Yang disimpan di
 * database hanya hash SHA-256, sehingga isi database tidak dapat dipakai
 * langsung untuk mereset kata sandi.
 */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createResetToken(now = Date.now()): GeneratedResetToken {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(now + RESET_TOKEN_TTL_MINUTES * 60_000).toISOString(),
  };
}

/** Validasi bentuk token sebelum menyentuh database. */
export function isWellFormedResetToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}