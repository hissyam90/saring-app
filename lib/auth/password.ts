import bcrypt from "bcryptjs";

/** Biaya hashing. 12 cukup untuk produksi dan tetap cepat di lokal. */
const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Hash tiruan untuk menyamakan waktu respons saat email tidak ditemukan,
 * sehingga penyerang tidak dapat membedakan akun yang ada dan tidak ada.
 */
export const DUMMY_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.7Vd0Mz1uZ1VZ3r0lQ8bO5aQ0Wq6y0Ku";