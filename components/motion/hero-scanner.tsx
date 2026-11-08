"use client";

import { useEffect, useRef } from "react";
import { Link2, MessageSquareText, Phone, ShieldCheck } from "lucide-react";

const MAX_TILT = 7; // derajat
const BASE_X = 7; // rotateX dasar (sama dengan CSS)
const BASE_Y = -5; // rotateY dasar (sama dengan CSS)

/**
 * Komposisi 3D "Digital Trust Scanner" untuk hero Beranda.
 *
 * Murni CSS `transform`/`opacity` + `preserve-3d`. JavaScript hanya dipakai
 * untuk dua hal yang tidak mungkin lewat CSS:
 *   1. pointer tilt (desktop, `pointer: fine` + `hover: hover`),
 *   2. parallax ringan saat scroll (hanya sewaktu elemen terlihat).
 * Keduanya memakai `requestAnimationFrame`, tidak menulis React state, dan
 * dinonaktifkan saat `prefers-reduced-motion: reduce`.
 */
export function HeroScanner() {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const bg = bgRef.current;
    if (!root || !stage || !bg) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const canHover = window.matchMedia("(hover: hover)").matches;

    // --- Pointer tilt (lerp lewat rAF, tanpa React state) ---
    let raf = 0;
    let targetY = 0; // rotateY
    let targetX = 0; // rotateX
    let curY = 0;
    let curX = 0;

    const tick = () => {
      curY += (targetY - curY) * 0.12;
      curX += (targetX - curX) * 0.12;
      // Compose kursor di atas rotasi dasar (bukan menimpa), sehingga saat
      // tidak ada gerakan pointer pun komposisi tetap miring bertingkat.
      stage.style.transform = `rotateX(${(BASE_X + curX).toFixed(3)}deg) rotateY(${(BASE_Y + curY).toFixed(3)}deg)`;
      if (Math.abs(targetY - curY) > 0.01 || Math.abs(targetX - curX) > 0.01) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };

    const begin = () => {
      if (raf === 0) raf = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      if (rect.width === 0) return;
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      targetY = px * 2 * MAX_TILT;
      targetX = -py * 2 * MAX_TILT;
      begin();
    };

    const onLeave = () => {
      targetY = 0;
      targetX = 0;
      begin();
    };

    if (!reduce && finePointer && canHover) {
      root.addEventListener("pointermove", onMove);
      root.addEventListener("pointerleave", onLeave);
    }

    // --- Scroll parallax + jeda animasi saat di luar viewport ---
    let scrollRaf = 0;
    let observing = false;
    let observer: IntersectionObserver | null = null;

    const applyParallax = () => {
      const rect = root.getBoundingClientRect();
      const progress = Math.min(
        1,
        Math.max(0, -rect.top / (rect.height || 1)),
      );
      // Ring latar bergeser sedikit ke atas saat hero digulir keluar layar.
      bg.style.transform = `translate3d(0, ${(progress * -26).toFixed(1)}px, 0)`;
      scrollRaf = 0;
    };

    const onScroll = () => {
      if (scrollRaf === 0) scrollRaf = requestAnimationFrame(applyParallax);
    };

    if (!reduce && "IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const inside = entry.isIntersecting;
          if (inside) {
            delete root.dataset.paused;
          } else {
            root.dataset.paused = "true";
          }
          if (inside !== observing) {
            observing = inside;
            if (inside) {
              window.addEventListener("scroll", onScroll, { passive: true });
              applyParallax();
            } else {
              window.removeEventListener("scroll", onScroll);
            }
          }
        }
      });
      observer.observe(root);
    }

    return () => {
      if (raf !== 0) cancelAnimationFrame(raf);
      if (scrollRaf !== 0) cancelAnimationFrame(scrollRaf);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="hero-scanner"
      role="img"
      aria-label="Ilustrasi tiga jalur pemeriksaan Saring: pesan, nomor, dan tautan"
    >
      <div ref={stageRef} className="hero-scanner__stage">
        {/* Latar: orbit + sapuan pemindaian + titik koneksi */}
        <div ref={bgRef} className="hero-scanner__bg" aria-hidden="true">
          <span className="hero-scanner__ring hero-scanner__ring--outer hero-scanner__anim">
            <span className="hero-scanner__dot hero-scanner__dot--onring hero-scanner__anim" />
          </span>
          <span className="hero-scanner__ring hero-scanner__ring--inner hero-scanner__anim" />
          <span className="hero-scanner__sweep hero-scanner__anim" />
          <span className="hero-scanner__dot hero-scanner__dot--a hero-scanner__anim" />
          <span className="hero-scanner__dot hero-scanner__dot--b hero-scanner__anim" />
        </div>

        {/* Objek utama: logo resmi Saring (kotak lime + ShieldCheck), sama
            seperti mark navbar, dipresentasikan sebagai objek 3D. */}
        <div className="hero-scanner__logo hero-scanner__anim" aria-hidden="true">
          <span className="hero-scanner__logo-edge" />
          <span className="hero-scanner__logo-face">
            <ShieldCheck className="hero-scanner__logo-icon" aria-hidden="true" />
          </span>
        </div>

        {/* Kartu pendukung: pesan, nomor, tautan */}
        <div
          className="hero-scanner__card hero-scanner__card--message hero-scanner__anim"
          aria-hidden="true"
        >
          <span className="hero-scanner__card-icon">
            <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span>
            <span className="hero-scanner__card-title">Pesan</span>
            <span className="hero-scanner__card-status">Diperiksa</span>
          </span>
        </div>

        <div
          className="hero-scanner__card hero-scanner__card--phone hero-scanner__anim"
          aria-hidden="true"
        >
          <span className="hero-scanner__card-icon">
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span>
            <span className="hero-scanner__card-title">Nomor</span>
            <span className="hero-scanner__card-status">Perilaku</span>
          </span>
        </div>

        <div
          className="hero-scanner__card hero-scanner__card--link hero-scanner__anim"
          aria-hidden="true"
        >
          <span className="hero-scanner__card-icon">
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span>
            <span className="hero-scanner__card-title">Tautan</span>
            <span className="hero-scanner__card-status">Struktur URL</span>
          </span>
        </div>

        {/* Indikator sinyal */}
        <div className="hero-scanner__signal" aria-hidden="true">
          <span className="hero-scanner__signal-bars">
            <span className="hero-scanner__bar hero-scanner__bar--1 hero-scanner__anim" />
            <span className="hero-scanner__bar hero-scanner__bar--2 hero-scanner__anim" />
            <span className="hero-scanner__bar hero-scanner__bar--3 hero-scanner__anim" />
          </span>
          3 mode
        </div>
      </div>
    </div>
  );
}