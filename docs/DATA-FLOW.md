# Alur Data Saring

## Pesan

```mermaid
flowchart TD
  A[Pesan] --> B[React state di browser]
  B --> C[analyzeText]
  C --> D[Temuan + bukti + langkah]
  D --> E[ResultView]
```

Pesan tidak dikirim atau disimpan.

## URL

```mermaid
sequenceDiagram
  participant U as Pengguna
  participant B as Browser
  participant S as Next.js route
  participant P as PhishTank
  U->>B: Masukkan URL + consent
  B->>B: inspectLink heuristik
  B->>S: POST URL reputasi
  S->>P: POST keyless/opsional app key
  P-->>S: match/no-match/509/error
  S-->>B: status ternormalisasi
```

URL dikirim hanya setelah consent. No-match bukan bukti aman; kegagalan bukan hasil bersih.

## Nomor

```mermaid
flowchart TD
  N[Nomor] --> V[Validasi & normalisasi lokal]
  V --> R[Hasil format]
  R --> M[Manual AduanNomor]
```

Belum ada provider reputasi nomor gratis dan berizin yang diaktifkan; aplikasi tidak mengarang hasil.
