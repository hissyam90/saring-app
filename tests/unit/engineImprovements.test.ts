import { describe, expect, it } from "vitest";
import { analyzeText } from "@/lib/analysis";

/**
 * Pintu regresi untuk perbaikan mesin deteksi (Fase 1).
 *
 * Setiap blok memetakan satu perbaikan aturan ke kasus yang sebelumnya gagal
 * (false negative / false positive) pada subset development/validation.
 * Lihat `docs/EVALUASI-ANALISIS.md` untuk kronologi lengkap.
 */

function cats(text: string): string[] {
  return analyzeText(text).findings.map((f) => f.category);
}
function severityOf(text: string, category: string): string | undefined {
  return analyzeText(text).findings.find((f) => f.category === category)
    ?.severity;
}

describe("kredensial — variasi 'token' dan 'bagi'", () => {
  it("mengenali 'token 6 digit yang masuk' sebagai permintaan kredensial", () => {
    expect(cats("Token 6 digit yang masuk ke SMS kamu, sebutkan sekarang")).toContain(
      "credential-theft",
    );
  });

  it("tidak menganggap 'beli token listrik' sebagai kredensial", () => {
    expect(cats("Tolong belikan token listrik 100rb di aplikasi ya")).not.toContain(
      "credential-theft",
    );
  });

  it("mengenali 'bagi PIN' sebagai permintaan kredensial", () => {
    expect(cats("Bagi PIN m-banking dan nomor kartu kamu ya")).toContain(
      "credential-theft",
    );
  });
});

describe("peniruan institusi — kementerian dan domain tiruan", () => {
  it("menandai pengakuan sebagai staf kementerian keuangan", () => {
    expect(
      cats("Saya staf kementerian keuangan, ada denda pajak yang belum dibayar"),
    ).toContain("impersonation");
  });

  it("tidak menandai penyebutan kementerian pada kalimat edukasi", () => {
    expect(
      cats("Tips: petugas kementerian keuangan tidak pernah menelepon meminta denda"),
    ).not.toContain("impersonation");
  });

  it("menandai domain menyerupai layanan resmi (gojek-resmi.top)", () => {
    expect(cats("Update data di http://gojek-resmi.top sekarang")).toContain(
      "impersonation",
    );
  });
});

describe("desakan waktu — variasi dan eskalasi", () => {
  it("mengenali 'harus segera dibayar' sebagai tekanan", () => {
    expect(cats("Denda pajak mengendap dan harus segera dibayar")).toContain(
      "urgency-intimidation",
    );
  });

  it("mengenali tenggat bersyarat 'kalau tidak besok naik'", () => {
    expect(cats("Deposit 500rb untuk mengunci harga, kalau tidak besok naik")).toContain(
      "urgency-intimidation",
    );
  });

  it("menaikkan tekanan waktu + perintah transfer menjadi menengah", () => {
    expect(
      severityOf("Kesempatan terakhir! Transfer sekarang sebelum slot habis.", "urgency-intimidation"),
    ).toBe("medium");
  });

  it("tetap menilai promo berdesakan tanpa permintaan sebagai rendah", () => {
    expect(
      severityOf("Promo kesempatan terakhir, diskon 50% sampai Minggu.", "urgency-intimidation"),
    ).toBe("low");
  });
});

describe("ancaman pemutusan layanan — 'dicabut/dihentikan'", () => {
  it("mengenali ancaman pencabutan layanan dengan tenggat", () => {
    expect(
      cats("Jika tidak bayar dalam 2 jam, layanan internet Anda akan dicabut"),
    ).toContain("urgency-intimidation");
  });

  it("mengenali 'sambungan listrik akan dihentikan'", () => {
    expect(cats("Sambungan listrik Anda akan dihentikan besok pagi")).toContain(
      "urgency-intimidation",
    );
  });

  it("mengenali ancaman aktif 'layanan Anda kami cabut'", () => {
    expect(cats("Segera bayar tagihan, atau layanan Anda kami cabut")).toContain(
      "urgency-intimidation",
    );
  });

  it("tidak menandai 'saya cabut langganan' yang wajar", () => {
    expect(cats("saya cabut langganan Netflix bulan ini")).not.toContain(
      "urgency-intimidation",
    );
  });

  it("tidak menandai 'langganan yang sudah saya cabut'", () => {
    expect(cats("langganan saya sudah saya cabut kemarin")).not.toContain(
      "urgency-intimidation",
    );
  });

  it("tidak menandai 'akses kantor ditutup pukul 6' yang informatif", () => {
    expect(cats("akses internet kantor ditutup pukul enam sore")).not.toContain(
      "urgency-intimidation",
    );
  });
});

describe("pemutusan layanan — pemberitahuan sah vs ancaman", () => {
  it("menghindari menandai pemberitahuan pemeliharaan jaringan", () => {
    const text =
      "Pemberitahuan: jaringan akan dihentikan sementara pukul 22.00 untuk pemeliharaan berkala.";
    const result = analyzeText(text);
    expect(
      result.findings.filter((f) => f.category === "urgency-intimidation"),
    ).toHaveLength(0);
  });

  it("menghindari menandai penghentian 'sementara' pada informasi hari libur", () => {
    expect(cats("Layanan perpanjangan SIM dihentikan sementara pada hari libur nasional")).not.toContain(
      "urgency-intimidation",
    );
  });

  it("menghindari menandai penagihan sesuai ketentuan yang mengarah ke kanal resmi", () => {
    const text =
      "Sesuai ketentuan, layanan listrik Anda dihentikan karena tagihan belum dibayar. Segera bayar melalui aplikasi resmi PLN.";
    expect(cats(text)).not.toContain("urgency-intimidation");
  });

  it("menghindari menandai kalimat edukasi yang menyebut ancaman pemutusan", () => {
    expect(
      cats("Waspada modus penipuan: pelaku mengancam layanan Anda akan dicabut"),
    ).not.toContain("urgency-intimidation");
  });

  it("menghindari menandai pesan yang melaporkan/menanyakan ancaman yang diterima", () => {
    expect(
      cats("Saya mendapat pesan 'layanan Anda akan dicabut', apakah ini penipuan?"),
    ).not.toContain("urgency-intimidation");
  });

  it("tetap menandai ancaman pemutusan disertai permintaan transfer mendesak", () => {
    expect(
      cats("Layanan Anda akan dicabut dalam 1 jam jika tidak segera transfer pembayaran"),
    ).toContain("urgency-intimidation");
  });

  it("tetap menandai ancaman penghentian jaringan disertai permintaan OTP", () => {
    const cats4 = cats("Jaringan Anda akan dihentikan. Kirim kode OTP Anda untuk konfirmasi.");
    expect(cats4).toContain("urgency-intimidation");
    expect(cats4).toContain("credential-theft");
  });

  it("tetap menandai ancaman pemblokiran rekening disertai tautan login", () => {
    const cats5 = cats(
      "Rekening Anda diblokir. Segera login di http://bca-verifikasi.xyz untuk verifikasi.",
    );
    expect(cats5).toContain("urgency-intimidation");
    expect(cats5).toContain("suspicious-link");
  });
});

describe("pembayaran di muka — pungutan hadiah", () => {
  it("mengenali 'PPN hadiah' sebagai biaya di muka", () => {
    expect(cats("Kamu menang undian. Bayar PPN hadiah 250rb lebih dulu")).toContain(
      "upfront-payment",
    );
  });

  it("mengenali 'komisi undian' sebagai pungutan", () => {
    expect(cats("Komisi undian sebesar 150rb dibayar dulu agar hadiah cair")).toContain(
      "upfront-payment",
    );
  });

  it("tidak menganggap 'lewati verifikasi, bayar ke rekening' sebagai biaya di muka", () => {
    // Ini instruksi melewati verifikasi (risky-instruction), bukan biaya verifikasi.
    const result = analyzeText("Lewati verifikasi, langsung bayar ke rekening saya");
    expect(cats("Lewati verifikasi, langsung bayar ke rekening saya")).toContain(
      "risky-instruction",
    );
    expect(
      result.findings.find((f) => f.category === "upfront-payment"),
    ).toBeUndefined();
  });
});

describe("instruksi berisiko — singkatan 'rek bank'", () => {
  it("mengenali 'transfer ke rek bank pribadi penjual'", () => {
    expect(
      cats("Jangan bayar lewat aplikasi, transfer saja ke rek Bank pribadi penjual"),
    ).toContain("risky-instruction");
  });
});

describe("permintaan uang — kalimat edukasi tidak ditandai", () => {
  it("tidak menandai kalimat 'biasanya meminta uang' sebagai permintaan", () => {
    expect(cats("Ciri lowongan palsu biasanya meminta uang pendaftaran di awal")).not.toContain(
      "money-request",
    );
  });

  it("tetap menandai permintaan uang sungguhan", () => {
    expect(cats("Bang, pinjam 200rb dong buat beli obat")).toContain(
      "money-request",
    );
  });
});