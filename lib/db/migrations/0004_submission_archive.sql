-- 0004_submission_archive.sql
--
-- Soft archive untuk artikel kontribusi.
--
-- `archived_at` null berarti artikel aktif. Nilai terisi menyembunyikan artikel
-- dari Pustaka dan dari akses URL langsung, tanpa menghapus artikel maupun
-- riwayat revisinya. Aditif dan aman untuk data lama.

alter table submissions add column if not exists archived_at timestamptz;

create index if not exists submissions_archived_idx
  on submissions (archived_at)
  where archived_at is not null;
