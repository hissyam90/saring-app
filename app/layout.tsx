import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: {
    default: "Saring. Pendamping Kepercayaan Digital",
    template: "%s · Saring",
  },
  description:
    "Periksa pesan, nomor, dan tautan mencurigakan. lalu pahami langkah berikutnya. Seluruhnya berjalan di peramban Anda.",
  keywords: [
    "penipuan daring",
    "phishing",
    "keamanan digital",
    "anti scam",
    "cek nomor",
    "cek tautan",
    "Indonesia",
  ],
  openGraph: {
    title: "Saring. Pendamping Kepercayaan Digital",
    description:
      "Kenali tanda-tanda penipuan daring sebelum bertindak. Periksa pesan, nomor, dan tautan. lalu pahami langkah selanjutnya.",
    type: "website",
    locale: "id_ID",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    /**
     * `suppressHydrationWarning` hanya berlaku untuk atribut <html>, bukan
     * untuk isi halaman. Skrip tema di bawah menulis `data-theme` sebelum
     * React hydration, sehingga atribut di DOM memang berbeda dari HTML server
     * pada sengaja. Tanpa penanda ini React akan mencatat peringatan hydration
     * palsu padahal tema sudah benar sejak frame pertama.
     */
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen bg-paper text-ink">
        {/*
          Skrip tema harus berjalan sebelum halaman digambar agar tidak ada
          kilatan tema yang salah. Skrip sebaris biasa (bukan `next/script`)
          dieksekusi browser saat HTML diurai, sehingga tidak bergantung pada
          unduhan chunk Next.js yang bisa selesai setelah paint pertama.
        */}
        <script
          id="saring-theme-init"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        {/*
          WCAG 2.4.1 (Bypass Blocks): tautan ini tersembunyi sampai menerima
          fokus keyboard, sehingga pengguna keyboard/screen reader dapat
          melewati navigasi yang sama di setiap halaman.
        */}
        <a
          href="#konten-utama"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:border-2 focus:border-ink focus:bg-lime focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-on-lime"
        >
          Lompat ke konten utama
        </a>
        <Nav />
        <div className="flex min-h-screen flex-col border-l-0 bg-paper lg:ml-72 lg:border-l-4 lg:border-ink lg:pl-0">
          <main id="konten-utama" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
