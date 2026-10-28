import type { Severity } from "./types";
import { isIpHost, SHORTENER_HOSTS } from "./url";

export type LinkSignal =
  | "suspicious-scheme"
  | "userinfo"
  | "shortened"
  | "ip-address"
  | "unusual-tld"
  | "confusing-subdomain"
  | "lookalike"
  | "http";

export interface LinkFinding {
  signal: LinkSignal;
  severity: Severity;
  title: string;
  explanation: string;
  evidence: string;
  nextStep: string;
}

export interface LinkInspection {
  isValid: boolean;
  errors: string[];
  displayUrl: string;
  scheme: string;
  host: string;
  pathname: string;
  signals: LinkSignal[];
  findings: LinkFinding[];
}

const UNUSUAL_TLDS = new Set([
  "zip",
  "mov",
  "top",
  "xyz",
  "tk",
  "ml",
  "ga",
  "cf",
  "gq",
  "buzz",
  "click",
  "link",
  "work",
  "racing",
  "stream",
  "rest",
  "gdn",
  "icu",
  "monster",
  "quest",
]);

const BRAND_LABELS = new Set([
  "bca",
  "bri",
  "bni",
  "mandiri",
  "cimb",
  "bsi",
  "danamon",
  "ovo",
  "gopay",
  "dana",
  "shopeepay",
  "shopee",
  "tokopedia",
  "lazada",
  "gojek",
  "pln",
  "bpjs",
  "pajak",
  "ojk",
  "kominfo",
  "polri",
  "polisi",
  "telkomsel",
  "indosat",
  "xl",
]);

const BRAND_TOKEN =
  /\b(bca|bri|bni|mandiri|cimb|bsi|danamon|ovo|gopay|dana|shopeepay|shopee|tokopedia|lazada|gojek|pln|bpjs|pajak|ojk|kominfo|polri|polisi|telkomsel|indosat|xl)\b/i;

const LOOKALIKE_MARKER =
  /verifikasi|konfirmasi|login|reset|update|secure|keamanan|akun|hadiah|klaim|bonus|dana/i;

function tldOf(host: string): string {
  const index = host.lastIndexOf(".");
  return index >= 0 ? host.slice(index + 1) : "";
}

function stripWww(host: string): string {
  return host.replace(/^www\./i, "");
}

function registrableLabels(host: string): string[] {
  const labels = host.split(".");
  const isIndonesianMulti = /\.(co|go|or|ac|net|web|sch|my|biz|desa)\.id$/.test(
    host.toLowerCase(),
  );
  if (labels.length >= 3 && isIndonesianMulti) {
    return labels.slice(-3);
  }
  return labels.slice(-2);
}

export function inspectLink(raw: string): LinkInspection {
  const input = raw.trim();
  const base: LinkInspection = {
    isValid: true,
    errors: [],
    displayUrl: input,
    scheme: "",
    host: "",
    pathname: "",
    signals: [],
    findings: [],
  };

  if (!input) {
    return {
      ...base,
      isValid: false,
      errors: ["Masukkan tautan yang ingin diperiksa."],
    };
  }

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(input)
    ? input
    : `https://${input}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return {
      ...base,
      isValid: false,
      errors: [
        "Tautan tidak dapat diurai. Periksa kembali formatnya, misalnya https://namasitus.com.",
      ],
    };
  }

  const scheme = url.protocol.replace(":", "").toLowerCase();
  if (scheme !== "http" && scheme !== "https") {
    return {
      ...base,
      scheme,
      host: url.hostname.toLowerCase(),
      signals: ["suspicious-scheme"],
      findings: [
        {
          signal: "suspicious-scheme",
          severity: "high",
          title: "Skema tautan tidak lazim",
          explanation:
            "Tautan ini tidak memakai skema http/https. Skema lain (misalnya javascript: atau data:) bisa memicu perilaku tak terduga pada sebagian aplikasi.",
          evidence: input,
          nextStep: "Jangan diklik. Abaikan tautan tersebut.",
        },
      ],
    };
  }

  const host = url.hostname.toLowerCase();
  const signals: LinkSignal[] = [];
  const findings: LinkFinding[] = [];
  const add = (
    signal: LinkSignal,
    severity: Severity,
    title: string,
    explanation: string,
    evidence: string,
    nextStep: string,
  ) => {
    signals.push(signal);
    findings.push({ signal, severity, title, explanation, evidence, nextStep });
  };

  if (url.username !== "" || url.password !== "") {
    add(
      "userinfo",
      "high",
      "Tautan memuat informasi pengguna (userinfo)",
      "Tautan mengandung bagian user:password sebelum nama domain, pola yang jarang dipakai situs wajar dan sering menyimpan maksud menipu.",
      input,
      "Jangan diklik. Jangan memasukkan kredensial apa pun.",
    );
  }

  if (scheme === "http") {
    add(
      "http",
      "low",
      "Tautan tidak memakai HTTPS",
      "Koneksi tidak terenkripsi sehingga data yang dikirim bisa terlihat pihak lain.",
      input,
      "Gunakan situs https dan jangan memasukkan data sensitif di halaman http.",
    );
  }

  if (isIpHost(host)) {
    add(
      "ip-address",
      "medium",
      "Domain memakai alamat IP langsung",
      "Alamat IP numerik dipakai sebagai host alih-alih nama domain yang wajar, sehingga tujuan aslinya sulit dikenali.",
      host,
      "Jangan diklik. Ketik alamat resmi secara manual bila memang diperlukan.",
    );
  }

  if (SHORTENER_HOSTS.has(stripWww(host))) {
    add(
      "shortened",
      "medium",
      "Tautan pendek (shortened URL)",
      "Layanan penyingkat menyembunyikan tujuan akhir tautan.",
      host,
      "Jangan diklik. Minta tautan asli dari pengirim atau ketik alamat resmi secara manual.",
    );
  }

  if (UNUSUAL_TLDS.has(tldOf(host))) {
    add(
      "unusual-tld",
      "medium",
      "Ekstensi domain tidak lazim",
      `Akhiran domain ".${tldOf(host)}" jarang dipakai layanan resmi dan kerap muncul pada situs penipuan.`,
      host,
      "Periksa ulang keaslian domain. Satu indikator ini saja belum berarti penipuan.",
    );
  }

  const labels = host.split(".");
  const registrable = registrableLabels(host);
  const subdomains = labels.slice(0, labels.length - registrable.length);
  if (
    subdomains.some(
      (label) => label !== "www" && BRAND_LABELS.has(label.toLowerCase()),
    )
  ) {
    add(
      "confusing-subdomain",
      "medium",
      "Subdomain meniru merek layanan",
      "Nama merek populer muncul sebagai subdomain dari domain lain, bukan sebagai domain resminya.",
      host,
      "Bandingkan dengan alamat resmi layanan sebelum melanjutkan.",
    );
  }

  if (BRAND_TOKEN.test(host) && LOOKALIKE_MARKER.test(host)) {
    add(
      "lookalike",
      "medium",
      "Domain menyerupai layanan resmi",
      "Nama domain memadukan merek populer dengan kata kunci keamanan/klaim — pola umum halaman tiruan.",
      host,
      "Bandingkan dengan alamat situs resmi sebelum memasukkan data apa pun.",
    );
  }

  return {
    ...base,
    scheme,
    host,
    pathname: url.pathname,
    signals,
    findings,
  };
}