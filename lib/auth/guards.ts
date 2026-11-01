import { getStore } from "@/lib/db";
import type { Role, User } from "@/lib/db/types";
import { getSession } from "./session";

export interface AuthContext {
  user: User;
  role: Role;
}

/** Mengambil pengguna dari sesi, lalu memverifikasi ulang ke database. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session.userId) return null;
  const store = getStore();
  const user = await store.findUserById(session.userId);
  if (!user) return null;
  // Cookie lama dari sebelum reset kata sandi tidak boleh tetap berlaku.
  // Sesi tanpa `version` (diterbitkan sebelum fitur ini) dianggap versi 0.
  const currentVersion = await store.getSessionVersion(user.id);
  if (currentVersion !== (session.version ?? 0)) return null;
  return user;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Wajib login. Melempar HttpError 401 bila belum. */
export async function requireUser(): Promise<AuthContext> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Anda harus masuk terlebih dahulu.");
  return { user, role: user.role };
}

/**
 * Wajib admin. Role dibaca dari database setiap kali, bukan dari klaim
 * cookie, sehingga perubahan role langsung berlaku.
 */
export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await requireUser();
  if (ctx.role !== "admin") {
    throw new HttpError(403, "Akses ditolak.");
  }
  return ctx;
}

export function isAdmin(user: User | null): boolean {
  return user?.role === "admin";
}