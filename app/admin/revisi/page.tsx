import Link from "next/link";
import { getStore } from "@/lib/db";
import { ModerationActions } from "@/components/admin/moderation-actions";
import { RichContent } from "@/components/pustaka/rich-content";
import { Panel, Tag, formatDate } from "@/components/ui/primitives";
import type { SubmissionRevision } from "@/lib/db/types";

export const dynamic = "force-dynamic";

/**
 * Membandingkan dua teks baris per baris.
 *
 * Perbandingan sederhana ini cukup memberi admin gambaran perubahan: baris yang
 * hilang (dihapus) dan baris baru (ditambahkan). Tujuannya membantu meninjau,
 * bukan menghasilkan diff karakter-per-karakter.
 */
function diffLines(before: string, after: string) {
  const beforeLines = before.split("\n").map((line) => line.trim()).filter(Boolean);
  const afterLines = after.split("\n").map((line) => line.trim()).filter(Boolean);
  const afterSet = new Set(afterLines);
  const beforeSet = new Set(beforeLines);

  return {
    removed: beforeLines.filter((line) => !afterSet.has(line)),
    added: afterLines.filter((line) => !beforeSet.has(line)),
  };
}

function FieldComparison({
  label,
  before,
  after,
}: {
  label: string;
  before: string;
  after: string;
}) {
  const changed = before !== after;
  return (
    <div className="grid gap-1 border-t border-line py-2 first:border-t-0 first:pt-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
        {label}{" "}
        {changed ? <span className="text-ink-coral">· berubah</span> : "· sama"}
      </p>
      <div className="grid gap-1 sm:grid-cols-2">
        <p className="whitespace-pre-wrap border-l-4 border-l-line bg-paper px-2 py-1 text-xs leading-5 text-ink-muted">
          {before || "(kosong)"}
        </p>
        <p
          className={`whitespace-pre-wrap border-l-4 px-2 py-1 text-xs leading-5 text-ink ${
            changed ? "border-l-lime bg-lime-soft" : "border-l-line bg-paper"
          }`}
        >
          {after || "(kosong)"}
        </p>
      </div>
    </div>
  );
}

async function RevisionCard({ revision }: { revision: SubmissionRevision }) {
  const submission = await getStore().findSubmission(revision.submissionId);
  if (!submission) return null;

  const diff = diffLines(submission.body, revision.body);

  return (
    <li className="border-2 border-ink bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper px-3 py-2">
        <Tag tone="warn">revisi menunggu</Tag>
        <span className="text-sm font-bold text-ink">{revision.title}</span>
        <span className="ml-auto text-[11px] text-ink-muted">
          {revision.authorName} · diajukan {formatDate(revision.updatedAt)}
        </span>
      </div>

      <div className="grid gap-3 px-3 py-3">
        <div className="border-l-4 border-l-safe bg-safe-soft px-3 py-2 text-xs leading-5 text-ink">
          <span className="font-semibold">Versi publik saat ini: </span>
          {submission.title}
          {submission.slug ? (
            <>
              {" · "}
              <Link
                href={`/pustaka/${submission.slug}`}
                className="font-semibold underline"
              >
                buka artikel tayang
              </Link>
            </>
          ) : null}
          <span className="block text-ink-muted">
            Tetap tampil di Pustaka sampai revisi ini disetujui.
          </span>
        </div>

        <div className="grid gap-0">
          <FieldComparison
            label="Judul"
            before={submission.title}
            after={revision.title}
          />
          <FieldComparison
            label="Ringkasan"
            before={submission.summary}
            after={revision.summary}
          />
          <FieldComparison
            label="Kategori"
            before={submission.category}
            after={revision.category}
          />
          <FieldComparison
            label="Referensi"
            before={submission.references ?? ""}
            after={revision.references ?? ""}
          />
        </div>

        <div className="grid gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            Perubahan isi ({diff.added.length} baris ditambah, {diff.removed.length}{" "}
            dihapus)
          </p>

          {diff.removed.length === 0 && diff.added.length === 0 ? (
            <p className="text-xs text-ink-muted">
              Isi artikel tidak berubah (hanya metadata).
            </p>
          ) : (
            <div className="grid gap-1">
              {diff.removed.map((line, index) => (
                <p
                  key={`r-${index}`}
                  className="border-l-4 border-l-coral bg-coral-soft px-2 py-1 text-xs leading-5 text-ink"
                >
                  − {line}
                </p>
              ))}
              {diff.added.map((line, index) => (
                <p
                  key={`a-${index}`}
                  className="border-l-4 border-l-safe bg-safe-soft px-2 py-1 text-xs leading-5 text-ink"
                >
                  + {line}
                </p>
              ))}
            </div>
          )}
        </div>

        <details>
          <summary className="cursor-pointer text-xs font-semibold text-ink">
            Baca revisi lengkap (berformat)
          </summary>
          <div className="mt-2 border-2 border-dashed border-ink/40 p-3">
            <RichContent
              doc={revision.bodyJson}
              fallbackText={revision.body}
              className="text-sm leading-6"
            />
          </div>
        </details>

        <div className="flex flex-wrap gap-1.5">
          <ModerationActions
            label="Setujui & terbitkan"
            payload={{ action: "approve-revision", revisionId: revision.id }}
            confirmText="Revisi akan menggantikan isi artikel publik secara atomik. Versi lama tetap utuh bila proses gagal."
            tone="primary"
          />
          <ModerationActions
            label="Minta perbaikan"
            payload={{ action: "request-revision-change", revisionId: revision.id }}
            tone="secondary"
            requireNote
            notePlaceholder="Apa yang perlu diperbaiki penulis?"
          />
          <ModerationActions
            label="Tolak revisi"
            payload={{ action: "reject-revision", revisionId: revision.id }}
            tone="danger"
            requireNote
            notePlaceholder="Alasan penolakan"
          />
        </div>
      </div>
    </li>
  );
}


export default async function AdminRevisiPage() {
  const store = getStore();
  const pending = await store.listRevisions({
    status: "pending",
    page: 1,
    pageSize: 20,
  });
  const decided = await store.listRevisions({ page: 1, pageSize: 8 });

  return (
    <div className="grid gap-4">
      <div className="border-l-4 border-l-lime bg-paper px-3 py-2 text-xs leading-5 text-ink">
        Menyetujui revisi mengganti isi artikel publik dalam satu transaksi. Jika
        proses gagal, versi publik lama tetap tayang. Menolak atau meminta
        perbaikan tidak menghapus artikel yang sedang tayang.
      </div>

      <Panel title={`${pending.total} revisi menunggu tinjauan`}>
        {pending.items.length === 0 ? (
          <p className="text-sm text-ink-muted">Tidak ada revisi menunggu.</p>
        ) : (
          <ul className="grid gap-3">
            {pending.items.map((revision) => (
              <RevisionCard key={revision.id} revision={revision} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Riwayat keputusan revisi" description="Terbaru lebih dulu">
        {decided.items.length === 0 ? (
          <p className="text-sm text-ink-muted">Belum ada keputusan revisi.</p>
        ) : (
          <ul className="grid gap-1">
            {decided.items.map((revision) => (
              <li
                key={revision.id}
                className="flex flex-wrap items-center gap-2 border-l-4 border-l-ink bg-paper px-3 py-1.5 text-xs"
              >
                <Tag
                  tone={
                    revision.status === "approved"
                      ? "success"
                      : revision.status === "rejected"
                        ? "danger"
                        : revision.status === "pending"
                          ? "warn"
                          : "neutral"
                  }
                >
                  {revision.status}
                </Tag>
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                  {revision.title}
                </span>
                <span className="text-ink-muted">{revision.authorName}</span>
                <span className="font-mono text-ink-muted">
                  {formatDate(revision.reviewedAt ?? revision.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

