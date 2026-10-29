-- 0001_init.sql — skema awal Saring (PostgreSQL).
--
-- Dijalankan oleh `npm run db:migrate` (scripts/migrate.mjs) di dalam satu
-- transaksi, lalu dicatat pada tabel `schema_migrations`. Migration ini
-- idempoten sehingga aman dijalankan ulang pada database yang sudah ada.

create extension if not exists "pgcrypto";

do $$ begin
  create type user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type thread_category as enum ('phishing', 'transaksi', 'lowongan', 'penyamaran', 'akun');
exception when duplicate_object then null; end $$;

do $$ begin
  create type submission_status as enum ('pending', 'approved', 'needs_revision', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('open', 'reviewing', 'resolved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_target as enum ('thread', 'reply');
exception when duplicate_object then null; end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text not null,
  password_hash text not null,
  role user_role not null default 'user',
  created_at timestamptz not null default now()
);
create unique index if not exists users_email_lower_idx on users (lower(email));

create table if not exists threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references users(id) on delete cascade,
  title text not null,
  category thread_category not null,
  body text not null,
  article_slug text,
  removed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists threads_created_idx on threads (created_at desc);
create index if not exists threads_category_idx on threads (category);
create index if not exists threads_author_idx on threads (author_id, created_at desc);

create table if not exists replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  body text not null,
  removed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists replies_thread_idx on replies (thread_id, created_at);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references users(id) on delete cascade,
  title text not null,
  summary text not null,
  category text not null,
  body text not null,
  refs text,
  status submission_status not null default 'pending',
  review_note text,
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  slug text,
  created_at timestamptz not null default now()
);
create unique index if not exists submissions_slug_idx on submissions (slug) where slug is not null;
create index if not exists submissions_status_idx on submissions (status, created_at desc);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id) on delete cascade,
  target_type report_target not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status report_status not null default 'open',
  resolved_by uuid references users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on reports (status, created_at desc);

create table if not exists moderation_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists moderation_log_created_idx on moderation_log (created_at desc);

-- Backend rate limit bersama untuk semua instance (bukan in-memory).
create table if not exists rate_limits (
  bucket text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);
