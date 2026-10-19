'use client';

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Check,
  MessageCircle,
  Smartphone,
} from "lucide-react";

const FONT_DISPLAY = "font-[family-name:var(--font-outfit)]";
const FONT_MONO = "font-[family-name:var(--font-ibm-plex-mono)]";
const GLASS =
  "border border-white/40 bg-white/70 backdrop-blur-md outline outline-[1.5px] outline-dark";
const CTA = `${FONT_DISPLAY} inline-flex min-h-12 w-full items-center justify-center gap-2 border-2 border-dark bg-maroon px-6 py-3 text-sm font-extrabold uppercase tracking-wider text-white shadow-[4px_4px_0px_var(--color-dark)] transition-all hover:bg-hot active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none md:w-auto`;

const INVITE_HOSTS = new Set([
  "chat.whatsapp.com",
  "wa.me",
  "whatsapp.com",
  "www.whatsapp.com",
]);

function safeInviteUrl(raw?: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" || !INVITE_HOSTS.has(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function Highlight({ children }: { children: ReactNode }) {
  return (
    <span className="-mx-1 bg-[linear-gradient(transparent_58%,var(--color-pink)_58%_92%,transparent_92%)] px-1 [box-decoration-break:clone]">
      {children}
    </span>
  );
}

function Steps({ step }: { step: 1 | 2 }) {
  const box =
    "relative grid h-6 w-6 place-items-center border-2 border-dark text-[11px] font-black leading-none";
  return (
    <div
      className={`${GLASS} inline-flex w-fit -rotate-1 items-center gap-2.5 px-2.5 py-1.5`}
    >
      <ol className="flex items-center gap-4">
        <li
          aria-current={step === 1 ? "step" : undefined}
          className={`${box} ${
            step === 1
              ? "bg-white shadow-[2px_2px_0px_var(--color-dark)]"
              : "bg-maroon text-white"
          }`}
        >
          {step === 1 ? (
            "1"
          ) : (
            <Check className="h-3.5 w-3.5" strokeWidth={4} aria-hidden="true" />
          )}
          <span className="sr-only">
            Langkah 1: isi nomor telepon{step === 2 ? " (selesai)" : ""}
          </span>
        </li>
        <li
          aria-current={step === 2 ? "step" : undefined}
          className={`${box} bg-white before:absolute before:-left-[14px] before:top-1/2 before:h-0.5 before:w-3 before:-translate-y-1/2 before:bg-dark ${
            step === 2
              ? "shadow-[2px_2px_0px_var(--color-dark)]"
              : "text-dark/40"
          }`}
        >
          2
          <span className="sr-only">Langkah 2: masuk grup WhatsApp USRC</span>
        </li>
      </ol>
      <span
        aria-hidden="true"
        className={`${FONT_MONO} text-[11px] font-semibold uppercase tracking-widest text-dark`}
      >
        Langkah {step}/2
      </span>
    </div>
  );
}

export interface WhatsAppBannerProps {
  whatsapp?: string | null;
  waVerifiedAt?: string | Date | null;
  inviteUrl?: string | null;
  className?: string;
  onRefresh?: () => void;
}

export default function WhatsAppBanner({
  whatsapp,
  waVerifiedAt,
  inviteUrl = process.env.NEXT_PUBLIC_WA_GROUP_INVITE,
  className = "",
  onRefresh,
}: WhatsAppBannerProps) {
  if (whatsapp === undefined) return null;

  const hasWhatsapp = whatsapp !== null && whatsapp.trim() !== "";
  if (hasWhatsapp && waVerifiedAt === undefined) return null;
  if (hasWhatsapp && waVerifiedAt) return null; // Terverifikasi -> bersih

  const step: 1 | 2 = hasWhatsapp ? 2 : 1;
  const invite = step === 2 ? safeInviteUrl(inviteUrl) : null;
  const Icon = step === 1 ? Smartphone : MessageCircle;

  return (
    <section
      aria-labelledby="wa-banner-title"
      className={`relative overflow-hidden border-2 border-dark ${
        step === 1 ? "bg-[#FFF3C4]" : "bg-[#D1E7DD]"
      } shadow-[6px_6px_0px_var(--color-maroon)] transition-all ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 bg-[radial-gradient(circle_at_1px_1px,var(--color-maroon)_1.6px,transparent_0)] [background-size:12px_12px] opacity-20 [mask-image:radial-gradient(circle_at_100%_0%,#000,transparent_70%)]"
      />

      <div className="relative flex flex-col gap-5 p-5 md:flex-row md:items-center md:gap-7 md:p-6">
        <div className="relative shrink-0 self-start md:self-center">
          <span className="grid h-16 w-16 -rotate-3 place-items-center border-2 border-dark bg-maroon text-white shadow-[4px_4px_0px_var(--color-dark)]">
            <Icon className="h-8 w-8" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hot opacity-60" />
            <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-dark bg-hot" />
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Steps step={step} />
          <div>
            <h2
              id="wa-banner-title"
              className={`${FONT_DISPLAY} text-2xl font-black uppercase leading-[0.95] tracking-tight text-dark md:text-3xl`}
            >
              {step === 1 ? (
                <>
                  Isi <Highlight>no telp</Highlight> kamu
                </>
              ) : (
                <>
                  Kamu belum masuk <Highlight>grup WA USRC</Highlight>
                </>
              )}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-dark/75 md:text-base">
              {step === 1
                ? "Nomor WhatsApp dipakai buat memasukkan kamu ke grup resmi USRC dan membantu sekretaris menghubungi saat ada info sesi."
                : "Nomor WhatsApp kamu sudah tersimpan, tapi belum terdeteksi di dalam daftar anggota grup WhatsApp USRC."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {step === 1 ? (
              <Link href="/profil" className={CTA}>
                <span>Lengkapi No. WhatsApp di Profil</span>
              </Link>
            ) : (
              <>
                {invite ? (
                  <a
                    href={invite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={CTA}
                  >
                    <span>Gabung Grup WhatsApp USRC</span>
                  </a>
                ) : (
                  <span className={`${FONT_MONO} text-xs font-bold text-maroon`}>
                    // Link grup WA belum disetel oleh sekretaris.
                  </span>
                )}
                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="inline-flex min-h-12 items-center justify-center border-2 border-dark bg-white px-5 py-3 font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold uppercase tracking-wider text-dark shadow-[4px_4px_0px_var(--color-dark)] transition-all hover:bg-paper active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                  >
                    Cek Ulang
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
