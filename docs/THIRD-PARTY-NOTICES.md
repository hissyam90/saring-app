# Pemberitahuan Pihak Ketiga

- **Lucide React** digunakan sebagai pustaka ikon dan mengikuti lisensinya (ISC).
- **shadcn-admin** (https://github.com/satnaing/shadcn-admin) — MIT License,
  copyright Sat Naing. Digunakan sebagai **referensi pola** dashboard: struktur
  sidebar responsif, tabel/filter, pagination, dialog konfirmasi, dan tata letak
  halaman admin. Implementasi di `app/admin/` dan `components/admin/` ditulis
  ulang untuk Next.js App Router dan sistem desain neobrutalism Saring; tidak ada
  konfigurasi build atau router Vite yang disalin. Lisensi MIT mengizinkan
  penggunaan dan modifikasi selama notice lisensi ini dipertahankan.
- **neobrutalism-components** — MIT License, copyright Samuel Breznjak, 2023.
  Referensi pola border, shadow, dan interaksi.
- **iron-session** (MIT), **bcryptjs** (MIT), **zod** (MIT), **pg** (MIT),
  **Tailwind CSS** (MIT), dan **Next.js** (MIT) digunakan sesuai lisensinya.
- **Tiptap** (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`,
  `@tiptap/extensions`, `@tiptap/extension-image`) — MIT License, copyright
  Tiptap GmbH. Dipakai sebagai editor artikel; ekstensi dibatasi pada format
  yang lolos allowlist server. Konten tidak disimpan sebagai HTML Tiptap maupun
  dirender dengan `dangerouslySetInnerHTML`. Gambar disimpan sebagai URL
  eksternal, bukan hasil unggahan.
- **Cloudflare Turnstile** dan **Google Safe Browsing** adalah layanan pihak
  ketiga yang dipanggil dari server; penggunaannya tunduk pada ketentuan
  masing-masing penyedia.
- Tautan AduanNomor, IASC, dan OJK adalah rujukan eksternal. Saring tidak
  mengklaim afiliasi atau integrasi API dengan layanan tersebut.

