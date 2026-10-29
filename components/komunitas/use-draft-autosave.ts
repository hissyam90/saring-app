"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Autosave draf ke PostgreSQL.
 *
 * - Menunggu 1200 ms setelah perubahan terakhir (debounce) supaya tidak ada
 *   request pada setiap ketikan.
 * - `saved` hanya muncul setelah server mengonfirmasi.
 * - Request lama tidak boleh menimpa versi terbaru: setiap kiriman diberi nomor
 *   urut, dan respons yang bukan kiriman terakhir diabaikan.
 * - Kegagalan tidak menghapus isi di layar; status menjadi `error`.
 * - Draf tidak pernah dipublikasikan otomatis.
 */

export type DraftSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 1200;

export interface DraftAutosaveResult {
  state: DraftSaveState;
  /** Waktu simpan terakhir menurut server. */
  savedAt: string | null;
  /** Id draf di server (berguna untuk aksi hapus). */
  draftId: string | null;
  /** Hapus draf di server, dipakai setelah pengajuan berhasil. */
  discard: () => Promise<void>;
}

export function useDraftAutosave({
  kind,
  targetSubmissionId = null,
  payload,
  enabled = true,
}: {
  kind: "article" | "thread";
  /** Diisi hanya untuk draf revisi artikel yang sudah terbit. */
  targetSubmissionId?: string | null;
  payload: unknown;
  enabled?: boolean;
}): DraftAutosaveResult {
  const [state, setState] = useState<DraftSaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  const seqRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Serialisasi payload dipakai sebagai pembanding perubahan; objek baru dengan
  // isi sama tidak memicu penyimpanan ulang.
  const serialized = JSON.stringify(payload);
  const lastSentRef = useRef<string | null>(null);
  const payloadRef = useRef(serialized);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    payloadRef.current = serialized;
    enabledRef.current = enabled;
  }, [serialized, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (lastSentRef.current === null) {
      // Perubahan pertama setelah mount: tandai perlu disimpan, jangan kirim
      // langsung agar pengguna yang hanya membuka halaman tidak membuat draf.
      lastSentRef.current = serialized;
      return;
    }
    if (lastSentRef.current === serialized) return;

    setState("dirty");

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const body = payloadRef.current;
      const seq = seqRef.current + 1;
      seqRef.current = seq;

      setState("saving");

      void (async () => {
        try {
          const response = await fetch("/api/community/drafts", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind,
              targetSubmissionId,
              payload: JSON.parse(body) as unknown,
            }),
          });

          if (seqRef.current !== seq) return;

          if (!response.ok) {
            setState("error");
            return;
          }

          const data = (await response.json()) as {
            draft?: { id: string; updatedAt: string };
          };
          if (seqRef.current !== seq) return;

          lastSentRef.current = body;
          setDraftId(data.draft?.id ?? null);
          setSavedAt(data.draft?.updatedAt ?? new Date().toISOString());
          setState("saved");
        } catch {
          if (seqRef.current !== seq) return;
          setState("error");
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [serialized, enabled, kind, targetSubmissionId]);

  const discard = useCallback(async () => {
    if (!draftId) return;
    try {
      await fetch(`/api/community/drafts/${draftId}`, { method: "DELETE" });
      setDraftId(null);
      setState("idle");
      setSavedAt(null);
    } catch {
      // Draf tetap ada di server; tidak ada yang perlu ditampilkan ke pengguna.
    }
  }, [draftId]);

  return { state, savedAt, draftId, discard };
}

/** Label status autosave untuk ditampilkan di form. */
export function draftStateLabel(
  state: DraftSaveState,
  savedAt: string | null,
): string {
  switch (state) {
    case "dirty":
      return "Perubahan belum disimpan";
    case "saving":
      return "Menyimpan…";
    case "saved": {
      if (!savedAt) return "Tersimpan";
      const time = new Date(savedAt);
      if (Number.isNaN(time.getTime())) return "Tersimpan";
      return `Tersimpan ${time.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
    case "error":
      return "Gagal menyimpan draf — isi tetap ada di halaman ini";
    default:
      return "Draf otomatis aktif";
  }
}
