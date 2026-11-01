import { randomBytes } from "node:crypto";

/**
 * Helper Testmail (GraphQL) khusus E2E email.
 *
 * - Setiap test memakai tag acak, sehingga inbox tidak pernah dipakai bersama.
 * - Email lama disaring dengan `timestamp` sejak test dimulai.
 * - Polling selalu berbatas waktu (default 120 detik, interval 2 detik).
 * - Tidak ada penghapusan email lewat API.
 *
 * Catatan schema (diverifikasi lewat introspeksi): field query bernama `inbox`
 * (tipe `Inbox` dengan field result/message/count/emails), bukan `mailbox`.
 * Filter waktu dilakukan di sisi klien agar tidak bergantung pada tipe skalar
 * `timestamp_from`.
 */

const ENDPOINT = "https://api.testmail.app/api/graphql";
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_INTERVAL_MS = 2_000;
const REQUEST_TIMEOUT_MS = 15_000;

const QUERY = `
  query Inbox($namespace: String!, $tag: String!) {
    inbox(namespace: $namespace, tag: $tag) {
      result
      message
      count
      emails {
        from
        subject
        text
        html
        timestamp
        tag
      }
    }
  }
`;

export interface TestmailEmail {
  from: string;
  subject: string;
  text: string | null;
  html: string | null;
  /** Epoch milidetik. */
  timestamp: number;
  tag: string;
}

interface TestmailConfig {
  apiKey: string;
  namespace: string;
}

interface MailboxPayload {
  result?: string | null;
  message?: string | null;
  count?: number | null;
  emails?: Array<
    Partial<TestmailEmail> & { timestamp?: number | string }
  > | null;
}

export function testmailConfig(): TestmailConfig | null {
  const apiKey = process.env.TESTMAIL_APIKEY?.trim();
  const namespace = process.env.TESTMAIL_NAMESPACE?.trim();
  if (!apiKey || !namespace) return null;
  return { apiKey, namespace };
}

export function resendConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim(),
  );
}

/** Alasan pengujian email tidak dapat dijalankan, atau `null` bila siap. */
export function emailE2ESkipReason(): string | null {
  const missing: string[] = [];
  if (!process.env.TESTMAIL_APIKEY?.trim()) missing.push("TESTMAIL_APIKEY");
  if (!process.env.TESTMAIL_NAMESPACE?.trim()) missing.push("TESTMAIL_NAMESPACE");
  if (!process.env.RESEND_API_KEY?.trim()) missing.push("RESEND_API_KEY");
  if (!process.env.RESEND_FROM?.trim()) missing.push("RESEND_FROM");
  if (missing.length === 0) return null;
  return `E2E email dilewati: ${missing.join(", ")} belum diset. Lihat docs/TESTING.md.`;
}

export function createTestmailInbox(prefix: string): {
  tag: string;
  email: string;
  startedAt: number;
} {
  const config = testmailConfig();
  if (!config) throw new Error("Konfigurasi Testmail belum tersedia.");
  const tag = `${prefix}-${randomBytes(8).toString("hex")}`.toLowerCase();
  return {
    tag,
    email: `${config.namespace}.${tag}@inbox.testmail.app`,
    startedAt: Date.now(),
  };
}

function toMillis(value: number | string | undefined): number {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (typeof numeric !== "number" || !Number.isFinite(numeric)) return 0;
  // Testmail mengirim epoch milidetik; nilai detik tetap ditangani dengan aman.
  return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
}

function normalizeEmails(
  payload: MailboxPayload,
  since: number,
): TestmailEmail[] {
  const rows = Array.isArray(payload.emails) ? payload.emails : [];
  return rows
    .map((row) => ({
      from: String(row.from ?? ""),
      subject: String(row.subject ?? ""),
      text: row.text ? String(row.text) : null,
      html: row.html ? String(row.html) : null,
      timestamp: toMillis(row.timestamp),
      tag: String(row.tag ?? ""),
    }))
    .filter((email) => email.timestamp >= since)
    .sort((a, b) => b.timestamp - a.timestamp);
}

async function fetchMailbox(
  config: TestmailConfig,
  tag: string,
): Promise<MailboxPayload> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { namespace: config.namespace, tag },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Sertakan pesan GraphQL agar kegagalan schema/izin mudah didiagnosis.
      const text = await response.text().catch(() => "");
      let detail = "";
      try {
        const parsed = JSON.parse(text) as {
          errors?: Array<{ message?: string }>;
        };
        detail = (parsed.errors ?? [])
          .map((error) => error.message ?? "tanpa pesan")
          .join("; ");
      } catch {
        detail = text.slice(0, 160);
      }
      throw new Error(
        `Testmail HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
      );
    }

    const payload = (await response.json()) as {
      data?: { inbox?: MailboxPayload };
      errors?: Array<{ message?: string }>;
    };

    if (payload.errors?.length) {
      const detail = payload.errors
        .map((error) => error.message ?? "tanpa pesan")
        .join("; ");
      throw new Error(`Testmail GraphQL error: ${detail}`);
    }

    const inbox = payload.data?.inbox;
    if (!inbox) throw new Error("Testmail tidak mengembalikan data inbox.");
    if (inbox.result && inbox.result !== "success") {
      throw new Error(
        `Testmail result=${inbox.result}: ${inbox.message ?? "tanpa pesan"}`,
      );
    }
    return inbox;
  } finally {
    clearTimeout(timer);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Menunggu email yang cocok. Melempar error setelah batas waktu (tidak pernah
 * berputar tanpa akhir). Error autentikasi langsung digagalkan.
 */
export async function waitForTestmailEmail(input: {
  tag: string;
  since: number;
  timeoutMs?: number;
  intervalMs?: number;
  predicate?: (email: TestmailEmail) => boolean;
}): Promise<TestmailEmail> {
  const config = testmailConfig();
  if (!config) throw new Error("Konfigurasi Testmail belum tersedia.");

  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = input.intervalMs ?? DEFAULT_INTERVAL_MS;
  const deadline = Date.now() + timeoutMs;
  const predicate = input.predicate ?? (() => true);
  let lastProblem = "";

  while (Date.now() < deadline) {
    try {
      const mailbox = await fetchMailbox(config, input.tag);
      const match = normalizeEmails(mailbox, input.since).find(predicate);
      if (match) return match;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/HTTP 40[13]/.test(message)) throw error;
      lastProblem = message;
    }
    await delay(intervalMs);
  }

  throw new Error(
    `Email untuk tag ${input.tag} tidak diterima dalam ${Math.round(
      timeoutMs / 1000,
    )} detik.${lastProblem ? ` Masalah terakhir: ${lastProblem}` : ""}`,
  );
}

/** Mengambil tautan reset dari email tanpa mencetaknya ke log. */
export function extractResetLink(email: TestmailEmail): URL {
  const source = `${email.html ?? ""}\n${email.text ?? ""}`;
  const matches = [...source.matchAll(/https?:\/\/[^\s"'<>]+/g)].map(
    (match) => match[0],
  );
  const reset = matches.find((candidate) => candidate.includes("/reset-sandi"));
  if (!reset) throw new Error("Email tidak memuat tautan /reset-sandi.");
  return new URL(reset.replace(/&amp;/g, "&"));
}