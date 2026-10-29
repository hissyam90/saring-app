import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { Role } from "@/lib/db/types";

export interface SessionData {
  userId?: string;
  role?: Role;
  /** Waktu login, dipakai untuk audit ringan di sisi server. */
  issuedAt?: number;
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

export async function createSession(userId: string, role: Role): Promise<void> {
  const session = await getSession();
  session.userId = userId;
  session.role = role;
  session.issuedAt = Date.now();
  await session.save();
}

export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}