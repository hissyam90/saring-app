import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeText, extractUrls, inspectUrl } from "@/lib/analysis";

afterEach(() => vi.unstubAllGlobals());

function categories(text: string): string[] {
  return analyzeText(text).findings.map((finding) => finding.category);
}

/**
 * Kalimat permintaan kredensial yang harus terdeteksi. Variasinya mencakup
 * kata tersamar, bahasa informal, dan permintaan tanpa kata "OTP".
 */
const CREDENTIAL_REQUESTS = [
  "Kode OTP-nya berapa? Kirim ke sini ya.",
  "Boleh dibantu info kode yang masuk ke SMS kakak?",
  "Kasih tau kode 6 digit yang baru masuk dong",
  "Jangan bagikan OTP. Tapi sekarang kirim kode OTP kamu ke nomor ini.",
  "Kirim O T P kamu sekarang",
  "berapakah 0TP yang masuk? kirim balik ya",
  "otp ny kaka berapa? aku butuh buat verifikasi",
  "tolong isi data kartu dan masa berlaku di form ini",
  "Sebutkan PIN ATM Anda untuk verifikasi petugas.",
];

/**
 * Kalimat yang membahas kredensial tanpa meminta korban memberikannya.
 * Semua harus nihil temuan credential-theft.
 */
const CREDENTIAL_SAFE = [
  "Jangan pernah bagikan kode OTP kepada siapa pun. Aktifkan verifikasi dua langkah.",
  "Kemarin saya kirim kode OTP ke teman karena dikira petugas. Sekarang saya tahu itu bahaya.",
  "Waspada penipuan: pelaku biasanya bilang akun Anda akan diblokir lalu meminta kode OTP.",
  "Aplikasi resmi tidak akan pernah meminta PIN atau kata sandi Anda.",
  "Artikel ini menjelaskan modus penipuan yang meminta kode verifikasi lewat telepon.",
];

describe("kredensial — variasi permintaan", () => {
  it.each(CREDENTIAL_REQUESTS)("mendeteksi: %s", (text) => {
    expect(categories(text)).toContain("credential-theft");
  });
});

describe("kredensial — konteks edukasi, larangan, dan narasi", () => {
  it.each(CREDENTIAL_SAFE)("tidak menuduh: %s", (text) => {
    expect(categories(text)).not.toContain("credential-theft");
  });

  it("menyertakan bukti, penjelasan, dan rekomendasi", () => {
    const finding = analyzeText(CREDENTIAL_REQUESTS[0]).findings.find(
      (item) => item.category === "credential-theft",
    );
    expect(finding?.evidence).toBeTruthy();
    expect(finding?.explanation.length).toBeGreaterThan(20);
    expect(finding?.nextStep.length).toBeGreaterThan(10);
  });
});

/** Pesan wajar yang memuat kata sensitif; tidak boleh dianggap penipuan. */
const BENIGN_MESSAGES = [
  "Biaya admin transfer antar bank sekarang Rp6.500.",
  "Suku bunga tinggi membuat tabungan berkembang lebih cepat tahun ini.",
  "Tidak ada biaya pendaftaran. Lowongan ini gratis untuk semua pelamar.",
  "Silakan cek pengumuman di https://www.kemdikbud.go.id/pengumuman",
  "Hadiah ulang tahunmu sudah aku sembunyikan di lemari.",
  "Aku ambil hadiahnya besok ya.",
  "Transfer ke rekening BCA saya ya, nanti aku ganti.",
  "Besok rapat jam 10 di ruang serbaguna, bawa draf proposal.",
];

describe("pengurangan false positive", () => {
  it.each(BENIGN_MESSAGES)("tidak memberi temuan menengah/tinggi: %s", (text) => {
    const result = analyzeText(text);
    const serious = result.findings.filter(
      (finding) => finding.severity !== "low",
    );
    expect(serious).toHaveLength(0);
    expect(result.classification).toBe("limited-signals");
  });

  it("menilai promo berdesakan sebagai sinyal rendah, bukan penipuan", () => {
    const result = analyzeText(
      "Promo kesempatan terakhir, diskon 50% di toko kami sampai Minggu.",
    );
    expect(result.classification).toBe("limited-signals");
    expect(result.findings.every((finding) => finding.severity === "low")).toBe(true);
  });
});

describe("kombinasi sinyal", () => {
  it("menaikkan tautan pendek menjadi serius ketika ada ancaman akun", () => {
    const result = analyzeText("Akun Anda diblokir. Hubungi https://bit.ly/xyz");
    const link = result.findings.find(
      (finding) => finding.category === "suspicious-link",
    );
    const threat = result.findings.find(
      (finding) => finding.category === "urgency-intimidation",
    );
    expect(link?.severity).toBe("high");
    expect(threat?.severity).toBe("high");
    expect(result.classification).toBe("many-signals");
  });

  it("menggabungkan permintaan OTP dengan tautan mencurigakan", () => {
    const result = analyzeText(
      "Verifikasi sekarang: kirim kode OTP Anda lewat https://bca-verifikasi.xyz/login",
    );
    const found = result.findings.map((finding) => finding.category);
    expect(found).toContain("credential-theft");
    expect(found).toContain("suspicious-link");
    expect(result.classification).toBe("many-signals");
  });

  it("menilai biaya pendaftaran sebagai pembayaran di muka", () => {
    const result = analyzeText(
      "Selamat, Anda lolos. Transfer biaya administrasi Rp250.000 hari ini terakhir.",
    );
    const upfront = result.findings.find(
      (finding) => finding.category === "upfront-payment",
    );
    expect(upfront?.severity).toBe("high");
    // Biaya di muka (40) + tekanan waktu rendah (15) = 55 → perlu diperiksa.
    expect(result.classification).toBe("needs-review");
  });

  it("tidak menaikkan klasifikasi hanya karena satu ancaman tanpa permintaan", () => {
    const result = analyzeText("Akun Anda akan diblokir dalam 24 jam.");
    const threat = result.findings.find(
      (finding) => finding.category === "urgency-intimidation",
    );
    expect(threat?.severity).toBe("medium");
    // Satu sinyal sedang tetap "terbatas"; temuan tetap ditampilkan.
    expect(result.classification).toBe("limited-signals");
  });
});

describe("ekstraksi URL pada pesan", () => {
  it("mengenali domain tanpa skema", () => {
    const urls = extractUrls("Klik bca-verifikasi.xyz/login sekarang");
    expect(urls).toHaveLength(1);
    expect(urls[0].host).toBe("bca-verifikasi.xyz");
  });

  it("tidak mengambil domain dari alamat email", () => {
    expect(extractUrls("Kirim ke admin@bca.co.id ya")).toHaveLength(0);
  });

  it("tidak menghitung URL yang sama dua kali", () => {
    expect(extractUrls("https://www.bit.ly/x lalu bit.ly/x")).toHaveLength(1);
  });

  it("menandai alamat IP dan penyingkat", () => {
    const urls = extractUrls("http://192.168.1.10/login dan https://bit.ly/abc");
    expect(urls.map((url) => url.signals)).toEqual([
      expect.arrayContaining(["ip-address", "http"]),
      expect.arrayContaining(["shortened"]),
    ]);
  });

  it("menormalkan protokol dan host", () => {
    const url = inspectUrl("HTTPS://Contoh.COM/Halaman");
    expect(url.host).toBe("contoh.com");
    expect(url.signals).toHaveLength(0);
  });

  it("tidak melempar error untuk URL tidak valid", () => {
    expect(() => inspectUrl("https://")).not.toThrow();
    expect(inspectUrl("https://").host).toBe("");
  });

  it("tidak membuka atau mengambil URL", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    analyzeText("Cek https://bca-verifikasi.xyz/login dan bit.ly/abc");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("kegagalan layanan eksternal", () => {
  it("analisis lokal tetap berjalan ketika jaringan gagal", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const result = analyzeText(
      "Akun diblokir. Kirim kode OTP ke https://bit.ly/xyz",
    );
    expect(result.isValid).toBe(true);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.verdict.actionSteps.length).toBeGreaterThan(0);
  });
});