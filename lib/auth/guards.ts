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
  const user = await getStore().findUserById(session.userId);
  return user ?? null;
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