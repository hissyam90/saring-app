import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryStore, getStore } from "@/lib/db";

/**
 * Otorisasi server: role selalu dibaca ulang dari database, bukan dari klaim
 * cookie. Sesi disimulasikan agar tidak memerlukan runtime Next.js.
 */

const session = vi.hoisted(() => ({ userId: undefined as string | undefined }));

vi.mock("@/lib/auth/session", () => ({
  getSession: async () => ({ userId: session.userId }),
}));

const { HttpError, getCurrentUser, requireAdmin, requireUser } = await import(
  "@/lib/auth/guards"
);

async function createUser(email: string, displayName = "Pengguna") {
  return getStore().createUser({
    email,
    displayName,
    passwordHash: "hash-tidak-dipakai-di-tes",
  });
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "");
  __resetMemoryStore();
  session.userId = undefined;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Penjaga autentikasi", () => {
  it("menolak pengunjung tanpa sesi", async () => {
    await expect(requireUser()).rejects.toMatchObject({ status: 401 });
    expect(await getCurrentUser()).toBeNull();
  });

  it("menolak sesi yang menunjuk pengguna tidak ada", async () => {
    session.userId = "00000000-0000-4000-8000-000000000000";

    await expect(requireUser()).rejects.toMatchObject({ status: 401 });
  });

  it("mengembalikan pengguna yang sah beserta role dari database", async () => {
    const user = await createUser("sah@contoh.test", "Pengguna Sah");
    session.userId = user.id;

    const ctx = await requireUser();

    expect(ctx.user.id).toBe(user.id);
    expect(ctx.role).toBe("user");
  });
});

describe("Penjaga admin", () => {
  it("menolak pengguna biasa dari operasi admin", async () => {
    const user = await createUser("biasa@contoh.test", "Pengguna Biasa");
    session.userId = user.id;

    await expect(requireAdmin()).rejects.toBeInstanceOf(HttpError);
    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 });
  });

  it("membaca role dari database sehingga perubahan role langsung berlaku", async () => {
    const user = await createUser("calon@contoh.test", "Calon Admin");
    session.userId = user.id;

    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 });

    // Role dinaikkan di database (mis. lewat scripts/bootstrap-admin.mjs).
    await getStore().setUserRole(user.id, "admin");

    const ctx = await requireAdmin();
    expect(ctx.role).toBe("admin");
    expect(ctx.user.id).toBe(user.id);
  });

  it("mencabut akses segera setelah role diturunkan", async () => {
    const user = await createUser("turun@contoh.test", "Admin Sementara");
    await getStore().setUserRole(user.id, "admin");
    session.userId = user.id;

    expect((await requireAdmin()).role).toBe("admin");

    await getStore().setUserRole(user.id, "user");

    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 });
  });
});
