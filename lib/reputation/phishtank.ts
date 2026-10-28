export type PhishTankLookup = {
  provider: "PhishTank";
  status: "match" | "no-match" | "rate-limited" | "unavailable";
  matched: boolean;
  verified: boolean | null;
  valid: boolean | null;
  detailUrl?: string;
  checkedAt: string;
  message: string;
};

const ENDPOINT = "https://checkurl.phishtank.com/checkurl/";
const USER_AGENT = "Saring/2.0 (MIT-WEEK 2026 digital safety utility)";

function boolValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "y" || value === "yes" || value === "true") return true;
  if (value === "n" || value === "no" || value === "false") return false;
  return null;
}

export async function lookupPhishTank(url: string, appKey?: string): Promise<PhishTankLookup> {
  const checkedAt = new Date().toISOString();
  const body = new URLSearchParams({ url, format: "json" });
  if (appKey) body.set("app_key", appKey);
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 509) return { provider: "PhishTank", status: "rate-limited", matched: false, verified: null, valid: null, checkedAt, message: "PhishTank sedang membatasi permintaan. Coba lagi nanti." };
    if (!response.ok) return { provider: "PhishTank", status: "unavailable", matched: false, verified: null, valid: null, checkedAt, message: "PhishTank tidak dapat dihubungi saat ini." };
    const payload: unknown = await response.json();
    const result = (payload as { results?: Record<string, unknown> } | null)?.results;
    const inDatabase = boolValue(result?.in_database);
    const verified = boolValue(result?.verified);
    const valid = boolValue(result?.valid);
    const matched = inDatabase === true;
    return {
      provider: "PhishTank", status: matched ? "match" : "no-match", matched,
      verified, valid, checkedAt,
      detailUrl: typeof result?.phish_detail_page === "string" ? result.phish_detail_page : undefined,
      message: matched
        ? verified === true && valid === true ? "URL cocok dengan catatan phishing terverifikasi dan masih valid." : "URL memiliki catatan di PhishTank, tetapi status verifikasi/validitas perlu diperhatikan."
        : "Tidak ditemukan kecocokan di PhishTank. Ini bukan bukti URL aman.",
    };
  } catch {
    return { provider: "PhishTank", status: "unavailable", matched: false, verified: null, valid: null, checkedAt, message: "Pemeriksaan PhishTank gagal atau melewati batas waktu." };
  }
}
