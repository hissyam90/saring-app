"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * Pembungkus scroll-reveal dengan peningkatan progresif.
 *
 * - Server merender konten normal (selalu terlihat): bila JavaScript mati,
 *   konten tidak pernah disembunyikan.
 * - Saat mount (client saja), elemen yang berada di *bawah* lipatan ditandai
 *   `.is-hidden`, lalu IntersectionObserver menambahkan `.is-visible` ketika
 *   elemen mulai terlihat. Elemen yang sudah terlihat sejak awal tidak pernah
 *   disembunyikan, sehingga tidak ada kedipan atau layout shift.
 * - `prefers-reduced-motion: reduce` dihormati: konten tetap terlihat dan tidak
 *   dianimasikan.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Tunda transisi masuk (stagger), dalam milidetik. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Elemen yang sudah ada di viewport tidak perlu dianimasikan.
    const rect = el.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (inView) return;

    el.classList.add("is-hidden");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.remove("is-hidden");
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const style: CSSProperties = delay
    ? { transitionDelay: `${delay}ms` }
    : {};

  return (
    <div ref={ref} className={`reveal ${className}`} style={style}>
      {children}
    </div>
  );
}