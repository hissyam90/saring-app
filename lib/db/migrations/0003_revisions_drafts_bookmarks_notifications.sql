-- 0003_revisions_drafts_bookmarks_notifications.sql
--
-- Menambahkan fondasi untuk:
--   1. Kategori pertanyaan "lainnya".
--   2. Revisi artikel publik (versi publik tetap tampil selama revisi menunggu).
--   3. Draf autosave untuk artikel dan pertanyaan.
--   4. Bookmark artikel Pustaka.
--   5. Notifikasi dalam aplikasi.
--
-- Semua perubahan bersifat ADITIF: tidak ada DROP, UPDATE massal, atau perubahan
-- tipe kolom. Baris lama tidak diubah dan tetap berfungsi.

-- 1. Kategori "lainnya" ------------------------------------------------------
-- `add value if not exists` aman dijalankan ulang. Nilai baru tidak dipakai di
-- dalam transaksi migration ini, sehingga kompatibel dengan PostgreSQL 12+.
alter type thread_category add value if not exists 'lainnya';

-- 2. Revisi artikel publik --------------------------------------------------
-- Satu baris = satu percobaan revisi. Baris `submissions` tetap menjadi
-- satu-satunya sumber konten PUBLIK, sehingga:
--   * menyimpan revisi tidak menyentuh artikel yang sedang tayang;
--   * persetujuan revisi menyalin isi revisi ke `submissions` dalam transaksi.
do $$ begin
  create type revision_status as enum ('pending', 'approved', 'needs_revision', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists submission_revisions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  title text not null,
  summary text not null,
  category text not null,
  body text not null,
  body_json jsonb,
  refs text,
  status revision_status not null default 'pending',
  review_note text,
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table submission_revisions
    add constraint submission_revisions_body_json_object_chk
    check (body_json is null or jsonb_typeof(body_json) = 'object');
exception when duplicate_object then null; end $$;

create index if not exists submission_revisions_submission_idx
  on submission_revisions (submission_id, created_at desc);
create index if not exists submission_revisions_status_idx
  on submission_revisions (status, created_at desc);
create index if not exists submission_revisions_author_idx
  on submission_revisions (author_id, created_at desc);

-- Mencegah dua revisi `pending` untuk artikel yang sama. Revisi berstatus
-- `needs_revision` dapat diedit ulang dan dikembalikan ke `pending` (baris yang
-- sama), sehingga tidak melanggar indeks ini.
create unique index if not exists submission_revisions_one_pending_idx
  on submission_revisions (submission_id)
  where status = 'pending';

-- 3. Draf autosave ----------------------------------------------------------
do $$ begin
  create type draft_kind as enum ('article', 'thread');
exception when duplicate_object then null; end $$;

create table if not exists drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  kind draft_kind not null,
  -- Diisi hanya untuk draf revisi artikel yang sudah terbit.
  target_submission_id uuid references submissions(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table drafts
    add constraint drafts_payload_object_chk
    check (jsonb_typeof(payload) = 'object');
exception when duplicate_object then null; end $$;

create index if not exists drafts_owner_idx on drafts (owner_id, updated_at desc);

-- Satu draf per pemilik + jenis + target. `coalesce` dipakai karena NULL tidak
-- dianggap sama pada indeks unik biasa.
create unique index if not exists drafts_owner_target_kind_idx
  on drafts (
    owner_id,
    kind,
    coalesce(target_submission_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- 4. Bookmark artikel -------------------------------------------------------
-- `article_slug` adalah identitas publik yang stabil untuk artikel bawaan
-- (data/resources) maupun kontribusi (submissions.slug). Konten artikel tidak
-- disalin ke tabel ini.
create table if not exists article_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  article_slug text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists article_bookmarks_user_slug_idx
  on article_bookmarks (user_id, article_slug);

-- 5. Notifikasi dalam aplikasi ---------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  href text,
  -- Kunci idempotensi: mencegah notifikasi ganda akibat retry atau aksi berulang.
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists notifications_user_dedupe_idx
  on notifications (user_id, dedupe_key);

create index if not exists notifications_user_created_idx
  on notifications (user_id, created_at desc);

create index if not exists notifications_unread_idx
  on notifications (user_id) where read_at is null;
