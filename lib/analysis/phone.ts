export interface NormalizedPhone {
  isValid: boolean;
  /** Format domestik dengan awalan 0, contoh: 081234567890 */
  national: string;
  /** Format internasional E.164, contoh: +6281234567890 */
  e164: string;
  errors: string[];
}

const SEPARATORS = /[\s().,;:_\-/\\]/g;

/**
 * Menormalkan berbagai format nomor ponsel Indonesia menjadi bentuk
 * domestik (`08xx…`) dan E.164 (`+628xx…`). Tidak melakukan pengecekan
 * reputasi — hanya validasi dan normalisasi format.
 */
export function normalizePhone(input: string): NormalizedPhone {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      isValid: false,
      national: "",
      e164: "",
      errors: ["Masukkan nomor telepon terlebih dahulu."],
    };
  }

  const cleaned = trimmed.replace(SEPARATORS, "");

  if (!/^\+?\d+$/.test(cleaned)) {
    return {
      isValid: false,
      national: "",
      e164: "",
      errors: [
        "Nomor hanya boleh berisi angka, spasi, tanda hubung, atau tanda kurung.",
      ],
    };
  }

  let digits = cleaned.replace(/^\+/, "");

  if (digits.startsWith("62")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (!digits.startsWith("8")) {
    return {
      isValid: false,
      national: "",
      e164: "",
      errors: [
        "Nomor ini tidak terlihat seperti nomor ponsel Indonesia. Gunakan format 08xx, 628xx, atau +628xx.",
      ],
    };
  }

  if (!/^8\d{8,11}$/.test(digits)) {
    return {
      isValid: false,
      national: "",
      e164: "",
      errors: [
        "Panjang nomor ponsel tidak wajar. Periksa kembali jumlah digit yang dimasukkan.",
      ],
    };
  }

  return {
    isValid: true,
    national: `0${digits}`,
    e164: `+62${digits}`,
    errors: [],
  };
}