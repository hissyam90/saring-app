"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";

interface Me {
  id: string;
  displayName: string;
  role: "user" | "admin";
}

export function AccountMenu({ variant }: { variant: "desktop" | "mobile" }) {
  const router = useRouter();
  const [user, setUser] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data: { user: Me | null }) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
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
        <Link href="/masuk" className={itemClass}>
          Masuk
        </Link>
        <Link href="/daftar" className={itemClass}>
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
      <Link href="/akun" className={itemClass}>
        <UserRound className="h-4 w-4" aria-hidden="true" />
        Akun saya
      </Link>
      {user.role === "admin" ? (
        <Link href="/admin" className={itemClass}>
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Admin
        </Link>
      ) : null}
      <button type="button" onClick={logout} className={`${itemClass} text-left`}>
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Keluar
      </button>
    </div>
  );
}