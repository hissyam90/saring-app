import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { Role } from "@/lib/db/types";

export interface SessionData {
  userId?: string;
  role?: Role;
  /** Waktu login, dipakai untuk audit ringan di sisi server. */
  issuedAt?: number;
  /**
   * Versi sesi pengguna saat login. Nilai ini dibandingkan dengan
   * `users.session_version` pada setiap pemeriksaan; setelah kata sandi
   * direset, versi lama tidak lagi cocok dan cookie dianggap tidak sah.
   * Sesi lama tanpa field ini diperlakukan sebagai versi 0.
   */
  version?: number;
}

const DEV_FALLBACK_SECRET =
  "saring-development-only-secret-key-change-me-32+";

function sessionPassword(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET wajib diisi minimal 32 karakter pada production.",
    );
  }
  return DEV_FALLBACK_SECRET;
}

export function sessionOptions(): SessionOptions {
  return {
    password: sessionPassword(),
    cookieName: "saring_session",
    ttl: 60 * 60 * 24 * 7,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}

export async function getSession() {
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions());
}

export async function createSession(
  userId: string,
  role: Role,
  version = 0,
): Promise<void> {
  const session = await getSession();
  session.userId = userId;
  session.role = role;
  session.issuedAt = Date.now();
  session.version = version;
  await session.save();
}

export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}