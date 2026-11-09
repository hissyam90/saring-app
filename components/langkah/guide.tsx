"use client";

import { useState } from "react";
import {
  Banknote,
  ExternalLink,
  IdCard,
  Inbox,
  Key,
  MousePointerClick,
  UserX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SAFETY_GUIDES } from "@/data/guides";
import type { GuideStep } from "@/data/guides";

const ICONS: Record<string, LucideIcon> = {
  "received-message": Inbox,
  "clicked-link": MousePointerClick,
  "entered-credentials": Key,
  "transferred-money": Banknote,
  "account-takeover": UserX,
  "shared-documents": IdCard,
};

const PRIORITY_CHIP: Record<GuideStep["priority"], string> = {
  segera: "bg-coral text-on-coral",
  penting: "bg-amber text-on-amber",
  lanjutan: "bg-ink text-on-ink",
};

export function Guide({ initialSituation }: { initialSituation?: string }) {
  const [selectedId, setSelectedId] = useState(
    initialSituation && SAFETY_GUIDES.some((g) => g.id === initialSituation)
      ? initialSituation
      : SAFETY_GUIDES[0].id,
  );
  const [checkedEvidence, setCheckedEvidence] = useState<Record<string, boolean>>({});
  const guide =
    SAFETY_GUIDES.find((item) => item.id === selectedId) ?? SAFETY_GUIDES[0];
  const Icon = ICONS[guide.id] ?? Inbox;

  const now = guide.steps.filter((step) => step.priority === "segera");
  const after = guide.steps.filter((step) => step.priority !== "segera");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
      <div className="min-w-0 lg:sticky lg:top-6">
        {/*
          Mobile: dropdown. Sebelumnya pilihan kondisi dipaksa menjadi satu
          baris panjang yang harus digeser horizontal, sehingga pilihan terakhir
          tidak pernah terlihat.
        */}
        <label
          htmlFor="langkah-kondisi"
          className="block text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft lg:hidden"
        >
          Pilih kondisi Anda
        </label>
        <select
          id="langkah-kondisi"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="mt-2 min-h-11 w-full border-2 border-ink bg-surface px-3 py-2 text-sm font-semibold text-ink lg:hidden"
        >
          {SAFETY_GUIDES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.situation}
            </option>
          ))}
        </select>

        {/* Desktop: daftar vertikal, tetap nyaman pada kolom 280px. */}
        <h2 className="hidden text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft lg:block">
          Pilih kondisi Anda
        </h2>
        <div
          role="group"
          aria-label="Daftar kondisi"
          className="mt-2 hidden gap-1.5 lg:flex lg:flex-col"
        >
          {SAFETY_GUIDES.map((item) => {
            const ItemIcon = ICONS[item.id] ?? Inbox;
            const active = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                aria-pressed={active}
                className={`flex min-h-11 items-center gap-2 border-2 px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                  active
                    ? "border-ink bg-ink text-on-ink"
                    : "border-line-strong bg-surface text-ink hover:border-ink"
                }`}
              >
                <ItemIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 saring-break">{item.situation}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-ink-muted">
          Pilihan kondisi dan checklist hanya hidup di halaman ini. Keduanya
          hilang saat halaman dimuat ulang dan tidak dikirim ke server.
        </p>
      </div>

      <div className="min-w-0 border-2 border-ink bg-surface">
        <div className="border-b-2 border-ink px-4 py-3.5 sm:px-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-graphite text-lime">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="saring-break text-base font-black leading-tight text-ink">
                {guide.situation}
              </h2>
              <p className="mt-1 saring-break text-sm leading-6 text-ink-muted">
                {guide.summary}
              </p>
            </div>
          </div>
        </div>

        {/* 1. Prioritas sekarang */}
        <section className="border-b border-line px-4 py-3.5 sm:px-5">
          {guide.id === "transferred-money" ? (
            <div className="mb-3 border-2 border-coral bg-coral-soft px-3 py-2.5" role="alert">
              <p className="text-[11px] font-bold uppercase tracking-wider text-coral">
                Tindakan darurat
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-ink">
                Hubungi bank atau e-wallet lewat kanal resmi sekarang, lalu
                laporkan ke IASC. Jangan menunggu sampai dana berpindah.
              </p>
              <a
                href="https://iasc.ojk.go.id/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-11 items-center gap-2 border-2 border-ink bg-surface px-3 py-2 text-sm font-bold text-ink hover:bg-lime"
              >
                Buka IASC — OJK
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          ) : null}
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-coral">
            <span className="h-2 w-2 bg-coral" aria-hidden="true" />
            Lakukan sekarang
          </h3>
          <ol className="mt-2 grid gap-2">
            {now.map((step, index) => (
              <li key={step.text} className="flex items-start gap-2.5">
                <span className="mt-0.5 w-4 shrink-0 font-mono text-xs font-bold text-ink">
                  {index + 1}
                </span>
                <span className="min-w-0 saring-break text-sm font-medium leading-6 text-ink">
                  {step.text}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* 2. Langkah berikutnya */}
        <section className="border-b border-line px-4 py-3.5 sm:px-5">
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
            <span className="h-2 w-2 bg-ink" aria-hidden="true" />
            Setelah itu
          </h3>
          <ol className="mt-2 grid gap-2">
            {after.map((step, index) => (
              <li key={step.text} className="flex items-start gap-2.5">
                <span className="mt-0.5 w-4 shrink-0 font-mono text-xs font-bold text-ink-muted">
                  {now.length + index + 1}
                </span>
                <span className="min-w-0 saring-break text-sm leading-6 text-ink-soft">
                  <span
                    className={`mr-1.5 inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${PRIORITY_CHIP[step.priority]}`}
                  >
                    {step.priority}
                  </span>
                  {step.text}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* 3. Bukti */}
        <section className="border-b border-line px-4 py-3.5 sm:px-5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
            Bukti yang perlu disimpan
          </h3>
          <ul className="mt-2 grid gap-1.5">
            {guide.evidenceChecklist.map((item) => {
              const key = `${guide.id}:${item}`;
              const checked = checkedEvidence[key] === true;
              return (
                <li key={item}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-2 px-1 py-1 text-sm leading-6 text-ink-soft hover:bg-lime-soft">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setCheckedEvidence((current) => ({
                          ...current,
                          [key]: event.target.checked,
                        }))
                      }
                      className="mt-1.5 h-4 w-4 accent-lime"
                    />
                    <span
                      className={`min-w-0 saring-break ${checked ? "line-through opacity-60" : ""}`}
                    >
                      {item}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {guide.evidenceNote ? (
            <p className="mt-2 border-l-2 border-ink bg-lime-soft px-2.5 py-2 text-xs leading-5 text-ink">
              {guide.evidenceNote}
            </p>
          ) : null}
          <p className="mt-2 text-xs leading-5 text-ink-muted">
            Checklist ini hanya untuk membantu Anda mengingat bukti. Jangan unggah
            NIK, KTP, rekening, bukti transfer, atau percakapan ke Saring.
          </p>
        </section>

        {/* 4. Yang perlu diperiksa */}
        <section className="border-b border-line px-4 py-3.5 sm:px-5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
            Yang perlu diperiksa
          </h3>
          <ul className="mt-2 grid gap-1.5">
            {guide.checks.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span
                  className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-ink"
                  aria-hidden="true"
                />
                <span className="min-w-0 saring-break text-sm leading-6 text-ink-soft">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 5. Sumber bantuan */}
        <section className="px-4 py-3.5 sm:px-5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
            Sumber bantuan resmi
          </h3>
          {guide.resources.length > 0 ? (
            <ul className="mt-2 grid gap-1.5">
              {guide.resources.map((resource) => (
                <li key={resource.url}>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-2 border-2 border-ink bg-surface px-3 py-2 text-sm hover:bg-lime-soft"
                  >
                    <ExternalLink
                      className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 saring-break">
                      <span className="font-semibold text-ink group-hover:underline">
                        {resource.label}
                      </span>
                      <span className="mt-0.5 block saring-break text-xs text-ink-hint">
                        {resource.note}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-sm leading-6 text-ink-muted">
              Untuk kondisi ini, penyelesaian dilakukan lewat aplikasi atau
              layanan resmi terkait. Tidak ada portal pelaporan khusus yang
              perlu dibuka.
            </p>
          )}

          <div className="mt-3 border-t border-line pt-3 text-xs leading-5 text-ink-muted">
            <p>
              Tautan di atas dibuka langsung oleh Anda di situs lembaga terkait.
              Saring tidak mengirimkan data, memblokir nomor/rekening/website, atau
              menyimpan bukti Anda.
            </p>
            <p className="mt-1.5">
              Rencana ini tidak menggantikan penanganan bank, penyedia layanan,
              OJK, Komdigi, atau kepolisian. Pelaporan tidak menjamin dana kembali.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
