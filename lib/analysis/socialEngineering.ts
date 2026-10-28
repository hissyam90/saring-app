import type { Finding } from "./types";

/**
 * Deteksi pola rekayasa sosial yang menyamar sebagai teman/keluarga.
 *
 * Prinsip: satu kata kunci tidak cukup. Sinyal individual (mis. "nomor baru")
 * sering muncul pada percakapan wajar. Yang layak diperiksa adalah
 * KOMBINASI-nya. mis. klaim nomor baru + permintaan uang + desakan waktu.
 */

interface Hit {
  evidence: string;
  index: number;
}

function clip(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 70);
  const end = Math.min(text.length, index + length + 70);
  let raw = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (raw.length > 160) {
    raw = raw.slice(0, 160);
    // Jangan potong di tengah kata.
    const lastSpace = raw.lastIndexOf(" ");
    if (lastSpace > 60) raw = raw.slice(0, lastSpace);
    raw = `${raw.trimEnd()}…`;
  }
  if (start > 0) raw = `…${raw}`;
  return raw;
}

function firstMatch(text: string, pattern: RegExp): Hit | null {
  const re = new RegExp(pattern.source, "gi");
  const match = re.exec(text);
  if (!match) return null;
  return { evidence: clip(text, match.index, match[0].length), index: match.index };
}

// 1. Klaim nomor baru / HP hilang
const NEW_NUMBER_PHRASE =
  /(?:ini\s+)?(?:nomor|nomer|no\.?)\s*(?:aku\s*)?(?:baru|ganti|berganti)\b|nomor\s*ini\s*baru|ganti\s*(?:nomor|nomer)/i;

const LOST_PHONE_REASON =
  /\bhp\b[\s\w]{0,18}?(?:hilang|ilang|rusak|mati|dicuri|ketinggalan|jebol)|(?:hilang|ilang|rusak|dicuri)[\s\w]{0,14}?\bhp\b|hp\s*lama\s*(?:hilang|ilang|udah\s*gak\s*bisa|ga\s*bisa)/i;

// 2. Permintaan uang
const MONEY_VERB =
  /(?:pinjem(?:in|kan)?|pinjam(?:in|kan)?|minjem(?:in)?|minjam(?:in)?|talang(?:in)?|bantuin?\s*(?:duit|uang|dana)|butuh\s*(?:duit|uang|dana|modal)|kirim(?:in)?\s*(?:duit|uang)|transfer(?:in)?)/i;

const MONEY_AMOUNT =
  /\b\d[\d.,]*\s*(?:rb|ribu|k|jt|juta|gopek|cepek)?\b|\b(?:duit|uang|dana|biaya|modal)\b/i;

// 3. Janji pengembalian cepat
const REPAY_PROMISE =
  /(?:nanti|sore|besok|senin|langsung|cepat)\s*(?:aku|saya|gw|gue)?\s*(?:balikin|balik|ganti|kembaliin)|(?:aku|saya|gw|gue)\s*(?:balikin|ganti|kembaliin)/i;

// 4. Desakan waktu (hanya relevan bila ada permintaan uang)
const URGENCY =
  /hari\s*ini|sekarang|segera|cepet(?:an)?|buruan|dulu\s*(?:ya|dong|gak|gk)|mepet|darurat/i;

// 5. Menghalangi verifikasi
const VERIFICATION_BLOCK =
  /jangan\s*(?:telepon|telpon|tlp|ditelepon|angkat|video\s*call|vcall|bilang|kabarin)|(?:gak|ga|nggak|tidak)\s*bisa\s*(?:angkat|telepon|telpon|vcall|video\s*call)|lagi\s*(?:gak|ga|nggak)\s*bisa\s*(?:angkat|telepon|telpon)/i;

export interface SocialSignals {
  newNumberClaim: Hit | null;
  lostPhoneReason: Hit | null;
  moneyRequest: Hit | null;
  repayPromise: Hit | null;
  urgency: Hit | null;
  verificationBlock: Hit | null;
}

export function detectSocialSignals(text: string): SocialSignals {
  const moneyVerb = firstMatch(text, MONEY_VERB);
  const hasAmount = MONEY_AMOUNT.test(text);
  const money = moneyVerb && hasAmount ? moneyVerb : null;

  return {
    newNumberClaim: firstMatch(text, NEW_NUMBER_PHRASE),
    lostPhoneReason: firstMatch(text, LOST_PHONE_REASON),
    moneyRequest: money,
    repayPromise: firstMatch(text, REPAY_PROMISE),
    urgency: money ? firstMatch(text, URGENCY) : null,
    verificationBlock: firstMatch(text, VERIFICATION_BLOCK),
  };
}

export interface SocialAnalysis {
  findings: Finding[];
  /** Penyamaran + permintaan uang/penghalangan verifikasi terdeteksi. */
  impersonationPattern: boolean;
  /** Ada permintaan uang (dengan atau tanpa penyamaran). */
  moneyPattern: boolean;
  /** Klaim nomor baru disertai alasan HP hilang. */
  claimsNewNumber: boolean;
  blocksVerification: boolean;
}

let seq = 0;
function mk(
  category: Finding["category"],
  severity: Finding["severity"],
  title: string,
  explanation: string,
  nextStep: string,
  evidence: string | null,
): Finding {
  seq += 1;
  return {
    id: `se-${seq}`,
    category,
    severity,
    title,
    explanation,
    nextStep,
    evidence,
  };
}

export function analyzeSocialEngineering(text: string): SocialAnalysis {
  seq = 0;
  const s = detectSocialSignals(text);
  const findings: Finding[] = [];

  const claimsNewNumber = Boolean(s.newNumberClaim && s.lostPhoneReason);
  const blocksVerification = Boolean(s.verificationBlock);
  const impersonationPattern =
    claimsNewNumber && (Boolean(s.moneyRequest) || blocksVerification);

  // Klaim nomor baru saja bukan sinyal bahaya. banyak orang memang berganti
  // nomor. Sinyal ini hanya dilaporkan bila muncul bersama permintaan uang
  // atau upaya menghalangi verifikasi.
  if (impersonationPattern) {
    findings.push(
      mk(
        "acquaintance-impersonation",
        "high",
        "Mengaku memakai nomor baru karena HP lama hilang",
        "Pengirim mengaku sebagai orang yang Anda kenal, tetapi memakai nomor yang belum pernah Anda simpan. Siapa pun bisa membuat nomor baru dan mengaku sebagai teman atau keluarga, sehingga identitas pengirim belum terbukti hanya dari isi pesan.",
        "Jangan anggap pengirim sudah terverifikasi. Hubungi nomor lama yang tersimpan, atau minta panggilan suara/video melalui kanal yang sudah Anda kenal.",
        s.newNumberClaim?.evidence ?? s.lostPhoneReason?.evidence ?? null,
      ),
    );
  }

  if (s.moneyRequest) {
    findings.push(
      mk(
        "money-request",
        claimsNewNumber ? "high" : "medium",
        claimsNewNumber
          ? "Permintaan uang dari nomor yang belum terverifikasi"
          : "Permintaan uang mendadak",
        claimsNewNumber
          ? "Permintaan pinjaman/transfer datang bersamaan dengan klaim nomor baru. Kombinasi inilah yang paling sering dipakai saat menyamar sebagai teman: pelaku memanfaatkan rasa percaya pada nama yang dikenal, sambil memakai nomor yang tidak bisa Anda cocokkan dengan kontak asli."
          : "Pesan meminta pinjaman atau transfer uang. Ini belum tentu penipuan, tetapi identitas pengirim sebaiknya dipastikan sebelum Anda mengirim dana.",
        "Pastikan identitas lewat panggilan suara/video ke nomor lama, atau tanyakan hal yang hanya diketahui orang tersebut. Jangan transfer sebelum identitas terkonfirmasi.",
        s.moneyRequest.evidence,
      ),
    );
  }

  if (s.urgency) {
    findings.push(
      mk(
        "urgency-intimidation",
        "medium",
        "Desakan agar uang segera dikirim",
        "Ada tekanan waktu yang menyertai permintaan uang. Desakan seperti “hari ini”, “dulu”, atau “cepat” dirancang agar keputusan diambil sebelum sempat memeriksa identitas pengirim.",
        "Beri diri Anda waktu. Setelah identitas terverifikasi, uang tetap bisa dikirim beberapa menit kemudian. tidak ada alasan sah yang menuntut transfer seketika.",
        s.urgency.evidence,
      ),
    );
  }

  if (s.repayPromise) {
    findings.push(
      mk(
        "money-request",
        "low",
        "Janji pengembalian dalam waktu singkat",
        "Pengirim menjanjikan pengembalian dana dalam waktu dekat. Janji seperti ini sering dipakai untuk menurunkan kewaspadaan, dan tidak dapat diverifikasi dari pesan.",
        "Jangan jadikan janji pengembalian sebagai dasar transfer. Identitas pengirim tetap perlu dipastikan lebih dulu.",
        s.repayPromise.evidence,
      ),
    );
  }

  if (blocksVerification) {
    findings.push(
      mk(
        "verification-blocking",
        "high",
        "Upaya menghalangi verifikasi identitas",
        "Pesan memberi alasan mengapa Anda tidak bisa memverifikasi lewat telepon atau panggilan video. Penghalangan verifikasi adalah sinyal terkuat pada penyamaran kenalan, karena verifikasi justru cara termudah membuktikan identitas.",
        "Tetap verifikasi lewat jalur lain: nomor lama, akun media sosial lama, atau teman bersama. Jangan menerima alasan “tidak bisa ditelepon” sebagai pengganti bukti identitas.",
        s.verificationBlock?.evidence ?? null,
      ),
    );
  }

  return {
    findings,
    impersonationPattern,
    moneyPattern: Boolean(s.moneyRequest),
    claimsNewNumber,
    blocksVerification,
  };
}
