import { normalizePhone } from "./phone";

export type LookupStatus = "reported" | "no-record";

export interface PhoneLookupResult {
  status: LookupStatus;
  source: string;
  note?: string;
}

export interface PhoneReputationProvider {
  readonly name: string;
  lookup(e164: string): Promise<PhoneLookupResult>;
}

export type PhoneCheckResult =
  | { status: "invalid"; errors: string[] }
  | { status: "not-checked"; national: string; e164: string }
  | {
      status: "reported";
      national: string;
      e164: string;
      source: string;
      note?: string;
    }
  | { status: "no-record"; national: string; e164: string; source: string }
  | { status: "error"; national: string; e164: string; message: string };

const LOOKUP_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("TIMEOUT")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

/**
 * Jalur tanpa penyedia pihak ketiga: tidak pernah mengarang hasil reputasi.
 * Hanya memvalidasi & menormalkan nomor, lalu menyerahkan pemeriksaan
 * lanjutan ke sumber resmi yang dibuka oleh pengguna secara manual.
 */
export function checkPhoneNoProvider(input: string): PhoneCheckResult {
  const normalized = normalizePhone(input);
  if (!normalized.isValid) {
    return { status: "invalid", errors: normalized.errors };
  }
  return {
    status: "not-checked",
    national: normalized.national,
    e164: normalized.e164,
  };
}

/**
 * Jalur dengan penyedia (opsional). Dipakai hanya bila penyedia dengan API
 * terdokumentasi tersedia; di pengujian, provider dapat di-mock.
 */
export async function checkPhoneWithProvider(
  input: string,
  provider: PhoneReputationProvider,
): Promise<PhoneCheckResult> {
  const normalized = normalizePhone(input);
  if (!normalized.isValid) {
    return { status: "invalid", errors: normalized.errors };
  }

  try {
    const result = await withTimeout(
      provider.lookup(normalized.e164),
      LOOKUP_TIMEOUT_MS,
    );
    if (result.status === "no-record") {
      return {
        status: "no-record",
        national: normalized.national,
        e164: normalized.e164,
        source: result.source,
      };
    }
    return {
      status: "reported",
      national: normalized.national,
      e164: normalized.e164,
      source: result.source,
      note: result.note,
    };
  } catch {
    return {
      status: "error",
      national: normalized.national,
      e164: normalized.e164,
      message: "Pemeriksaan tidak dapat diselesaikan. Silakan coba lagi.",
    };
  }
}