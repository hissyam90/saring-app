"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import { AUTH_CHANGED_EVENT, notifyAuthChanged } from "@/lib/auth/events";

interface Me {
  id: string;
  displayName: string;
  role: "user" | "admin";
}

export function AccountMenu({
  variant,
  onNavigate,
}: {
  variant: "desktop" | "mobile";
  /** Dipanggil setelah pengguna memilih tautan/aksi agar drawer mobile menutup. */
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [user, setUser] = useState<Me | null | undefined>(undefined);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const latestRequestRef = useRef(0);

  const loadUser = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      // Hasil usang atau komponen yang sudah dilepas tidak boleh mengubah state.
      if (!mountedRef.current || requestId !== latestRequestRef.current) return;
      // Server gagal (5xx/4xx): status autentikasi tidak dapat dipastikan,
      // jadi status terakhir dipertahankan, bukan dianggap anonim.
      if (!response.ok) return;
      const data = (await response.json()) as { user: Me | null };
      if (!mountedRef.current || requestId !== latestRequestRef.current) return;
      setUser(data.user);
    } catch {
      // Jaringan gagal: pertahankan status terakhir.
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const refreshUser = () => {
      void loadUser();
    };

    // Pemuatan awal dijadwalkan agar pembaruan state tidak terjadi sinkron
    // di dalam body effect; event autentikasi tetap memakai jalur yang sama.
    queueMicrotask(refreshUser);
    window.addEventListener(AUTH_CHANGED_EVENT, refreshUser);
    return () => {
      mountedRef.current = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, refreshUser);
    };
  }, [loadUser]);

  const logout = async () => {
    setLogoutError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!mountedRef.current) return;
      if (!response.ok) {
        setLogoutError("Gagal keluar. Server belum dapat memproses permintaan. Coba lagi.");
        return;
      }
      // Batalkan hasil /api/auth/me yang mungkin masih berjalan.
      latestRequestRef.current += 1;
      setUser(null);
      notifyAuthChanged();
      onNavigate?.();
      router.push("/");
      router.refresh();
    } catch {
      if (!mountedRef.current) return;
      setLogoutError("Gagal keluar. Periksa koneksi Anda lalu coba lagi.");
    }
  };

  const itemClass =
    variant === "desktop"
      ? "flex items-center gap-2 px-2 py-2 text-sm font-semibold text-graphite-ink/75 transition-colors hover:bg-graphite-ink/10 hover:text-graphite-ink"
      : "flex min-h-11 items-center gap-2 px-3 py-2.5 text-sm font-semibold text-graphite-ink/75 hover:bg-graphite-ink/10 hover:text-graphite-ink";

  // Sebelum status sesi diketahui, jangan tampilkan apa pun agar tidak
  // berkedip antara "Masuk" dan nama pengguna.
  if (user === undefined) return null;

  if (!user) {
    return (
      <div className={variant === "desktop" ? "flex flex-col gap-1" : "mt-3 flex gap-2"}>
        <Link href="/masuk" className={itemClass} onClick={onNavigate}>
          Masuk
        </Link>
        <Link href="/daftar" className={itemClass} onClick={onNavigate}>
          Daftar
        </Link>
      </div>
    );
  }

  return (
    <div className={variant === "desktop" ? "flex flex-col gap-1" : "mt-3 flex flex-col gap-1"}>
      <p className="px-2 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-graphite-ink/60">
        {user.displayName}
      </p>
      <Link href="/akun" className={itemClass} onClick={onNavigate}>
        <UserRound className="h-4 w-4" aria-hidden="true" />
        Akun saya
      </Link>
      {user.role === "admin" ? (
        <Link href="/admin" className={itemClass} onClick={onNavigate}>
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Admin
        </Link>
      ) : null}
      <button type="button" onClick={logout} className={`${itemClass} text-left`}>
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Keluar
      </button>
      {logoutError ? (
        <p
          role="alert"
          className="mt-1 border-l-2 border-coral bg-coral-soft px-2 py-1.5 text-[11px] font-semibold leading-4 text-ink"
        >
          {logoutError}
        </p>
      ) : null}
    </div>
  );
}