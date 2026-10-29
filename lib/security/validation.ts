import { z } from "zod";
import { THREAD_CATEGORIES } from "@/lib/db/types";
import {
  RICH_TEXT_LIMITS,
  parseRichDoc,
  richDocToPlainText,
  type RichDoc,
} from "@/lib/content/rich-text";

const EMAIL = z.email({ message: "Format email tidak valid." }).max(254);

export const registerSchema = z.object({
  email: EMAIL,
  displayName: z
    .string()
    .trim()
    .min(3, "Nama tampilan minimal 3 karakter.")
    .max(40, "Nama tampilan maksimal 40 karakter.")
    .regex(
      /^[\p{L}\p{N} ._-]+$/u,
      "Nama tampilan hanya boleh huruf, angka, spasi, titik, garis bawah, dan tanda hubung.",
    ),
  password: z
    .string()
    .min(10, "Kata sandi minimal 10 karakter.")
    .max(128, "Kata sandi maksimal 128 karakter."),
  captchaToken: z.string().optional(),
});

export const loginSchema = z.object({
  email: EMAIL,
  password: z.string().min(1, "Kata sandi wajib diisi.").max(128),
  captchaToken: z.string().optional(),
});

export const threadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, "Judul minimal 10 karakter.")
    .max(120, "Judul maksimal 120 karakter."),
  category: z.enum(
    THREAD_CATEGORIES.map((c) => c.id) as [string, ...string[]],
    { message: "Kategori tidak dikenal." },
  ),
  body: z
    .string()
    .trim()
    .min(30, "Isi pertanyaan minimal 30 karakter.")
    .max(4000, "Isi pertanyaan maksimal 4000 karakter."),
  articleSlug: z
    .string()
    .trim()
    .max(70)
    .regex(/^[a-z0-9-]*$/, "Slug artikel tidak valid.")
    .optional()
    .nullable(),
  captchaToken: z.string().optional(),
});

export const replySchema = z.object({
  threadId: z.uuid("ID diskusi tidak valid."),
  body: z
    .string()
    .trim()
    .min(10, "Balasan minimal 10 karakter.")
    .max(3000, "Balasan maksimal 3000 karakter."),
  captchaToken: z.string().optional(),
});

export const submissionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, "Judul minimal 10 karakter.")
    .max(120, "Judul maksimal 120 karakter."),
  summary: z
    .string()
    .trim()
    .min(40, "Ringkasan minimal 40 karakter.")
    .max(300, "Ringkasan maksimal 300 karakter."),
  category: z
    .string()
    .trim()
    .min(3, "Kategori wajib diisi.")
    .max(40, "Kategori maksimal 40 karakter."),
  references: z.string().trim().max(1000).optional().nullable(),
  captchaToken: z.string().optional(),
});

/** Field pengajuan yang sudah bersih dan siap disimpan ke store. */
export interface SubmissionInput {
  title: string;
  summary: string;
  category: string;
  /** Dokumen rich text yang sudah dinormalisasi (allowlist ketat). */
  bodyJson: RichDoc;
  /** Proyeksi teks biasa, diturunkan di server dari `bodyJson`. */
  body: string;
  references: string | null;
  captchaToken?: string;
}

export type SubmissionParseResult =
  | { ok: true; data: SubmissionInput }
  | { ok: false; error: string };

/**
 * Memvalidasi isi pengajuan artikel di server.
 *
 * Isi artikel **tidak** diterima sebagai HTML atau sebagai teks biasa dari
 * klien. Klien mengirim dokumen Tiptap (`bodyJson`) yang kemudian:
 *
 * 1. divalidasi terhadap allowlist node/mark/atribut ({@link parseRichDoc}),
 * 2. diproyeksikan menjadi teks biasa untuk kolom `body`,
 * 3. diperiksa panjangnya memakai aturan lama (300–12000 karakter).
 *
 * Artikel kosong — termasuk dokumen yang hanya berisi markup kosong — ditolak.
 */
export function parseSubmissionInput(
  input: Record<string, unknown>,
): SubmissionParseResult {
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error) };
  }

  const doc = parseRichDoc(input.bodyJson);
  if (!doc.ok) return { ok: false, error: doc.error };

  const body = richDocToPlainText(doc.doc);
  if (body.length === 0) {
    return {
      ok: false,
      error: "Isi artikel wajib diisi minimal 300 karakter.",
    };
  }
  if (body.length < RICH_TEXT_LIMITS.minCharacters) {
    return {
      ok: false,
      error: `Isi artikel minimal ${RICH_TEXT_LIMITS.minCharacters} karakter.`,
    };
  }
  if (body.length > RICH_TEXT_LIMITS.maxCharacters) {
    return {
      ok: false,
      error: `Isi artikel maksimal ${RICH_TEXT_LIMITS.maxCharacters} karakter.`,
    };
  }

  return {
    ok: true,
    data: {
      title: parsed.data.title,
      summary: parsed.data.summary,
      category: parsed.data.category,
      bodyJson: doc.doc,
      body,
      references: parsed.data.references || null,
      captchaToken: parsed.data.captchaToken,
    },
  };
}

export const reportSchema = z.object({
  targetType: z.enum(["thread", "reply"]),
  targetId: z.uuid("ID konten tidak valid."),
  reason: z
    .string()
    .trim()
    .min(5, "Alasan minimal 5 karakter.")
    .max(80, "Alasan maksimal 80 karakter."),
  details: z.string().trim().max(1000).optional().nullable(),
  captchaToken: z.string().optional(),
});

export const reviewSchema = z.object({
  submissionId: z.uuid("ID pengajuan tidak valid."),
  /**
   * Nilai di sini harus sama dengan nama aksi yang dikirim
   * /api/admin/moderate, bukan nama status. Sebelumnya kedua daftar ini tidak
   * cocok sehingga setiap tinjauan artikel ditolak dengan 400.
   */
  action: z.enum([
    "approve-submission",
    "request-revision",
    "reject-submission",
  ]),
  note: z.string().trim().max(1000).optional().nullable(),
});

export const reportUpdateSchema = z.object({
  reportId: z.uuid("ID laporan tidak valid."),
  status: z.enum(["open", "reviewing", "resolved"]),
});

export const removeContentSchema = z.object({
  targetType: z.enum(["thread", "reply"]),
  targetId: z.uuid("ID konten tidak valid."),
});

export const roleUpdateSchema = z.object({
  userId: z.uuid("ID pengguna tidak valid."),
  role: z.enum(["user", "admin"]),
});

/** Mengubah error zod menjadi pesan pertama yang bisa ditampilkan. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Data tidak valid.";
}