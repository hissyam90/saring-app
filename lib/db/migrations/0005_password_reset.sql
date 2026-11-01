-- 0005_password_reset.sql — reset kata sandi + revokasi sesi.
--
-- `session_version` dinaikkan setiap kata sandi berubah. Cookie iron-session
-- menyimpan versi saat login; versi yang tidak lagi cocok dianggap tidak sah,
-- sehingga sesi lama tidak tetap berlaku setelah reset kata sandi.
--
-- Token reset disimpan sebagai hash SHA-256 (bukan token asli), hanya dapat
-- dipakai sekali (`used_at`), dan memiliki masa berlaku.

alter table users
  add column if not exists session_version integer not null default 0;

create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists password_reset_tokens_hash_idx
  on password_reset_tokens (token_hash);

create index if not exists password_reset_tokens_user_idx
  on password_reset_tokens (user_id, created_at desc);