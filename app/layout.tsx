import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: {
    default: "Saring — Pendamping Kepercayaan Digital",
    template: "%s · Saring",
  },
  description:
    "Periksa pesan, nomor, dan tautan mencurigakan — lalu pahami langkah berikutnya. Seluruhnya berjalan di peramban Anda.",
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
    title: "Saring — Pendamping Kepercayaan Digital",
    description:
      "Kenali tanda-tanda penipuan daring sebelum bertindak. Periksa pesan, nomor, dan tautan — lalu pahami langkah selanjutnya.",
    type: "website",
    locale: "id_ID",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-paper text-ink">
        <Nav />
        <div className="flex min-h-screen flex-col border-l-0 bg-paper lg:ml-72 lg:border-l-4 lg:border-ink lg:pl-0">
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
