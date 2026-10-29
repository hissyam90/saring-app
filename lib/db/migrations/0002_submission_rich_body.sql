-- 0002_submission_rich_body.sql — dukungan konten artikel kaya (rich text).
--
-- Menambah kolom `body_json` (JSONB) untuk menyimpan dokumen Tiptap yang sudah
-- dinormalisasi di server. Bersifat ADITIF dan tidak destruktif:
--
--   * Kolom `body` (text) TETAP ADA dan tetap menjadi proyeksi teks biasa dari
--     `body_json`. Artikel lama tidak diubah sama sekali.
--   * `body_json` bernilai NULL untuk semua baris lama. Renderer memakai
--     fallback teks biasa bila NULL, sehingga artikel lama tetap tampil.
--   * Tidak ada DROP, UPDATE massal, atau perubahan tipe kolom.
--
-- Migration ini idempoten dan dapat dijalankan ulang dengan aman.

alter table submissions add column if not exists body_json jsonb;

do $$ begin
  -- Menjaga agar kolom hanya berisi objek JSON (dokumen), bukan array/skalar.
  -- Baris lama (NULL) tetap lolos.
  alter table submissions
    add constraint submissions_body_json_object_chk
    check (body_json is null or jsonb_typeof(body_json) = 'object');
exception when duplicate_object then null; end $$;

comment on column submissions.body_json is
  'Dokumen rich text tervalidasi (JSON Tiptap) yang dinormalisasi di server. NULL untuk artikel lama yang hanya memiliki teks biasa di kolom body.';
