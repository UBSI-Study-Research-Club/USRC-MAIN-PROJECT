"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { HOBI_OPTIONS } from "@/lib/hobi";

const PRODI_OPTIONS = [
  "Informatika",
  "Sistem Informasi",
  "SI Akuntansi",
] as const;

export default function DaftarPage() {
  const [form, setForm] = useState({
    full_name: "",
    nim: "",
    email: "",
    prodi: "",
    reason: "",
    website: "", // Honeypot anti-bot
  });
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [hobi, setHobi] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  function toggleHobi(h: string) {
    setHobi((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]
    );
  }

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (form.website.trim() !== "") {
      setStatus("error");
      setErrorMsg("Aktivitas tidak valid terdeteksi.");
      return;
    }

    if (hobi.length === 0) {
      setStatus("error");
      setErrorMsg("Pilih minimal satu hobi/minat dulu ya.");
      return;
    }

    setStatus("loading");

    try {
      const supabase = createClient();
      const { error } = await supabase.from("registrations").insert({
        full_name: form.full_name.trim(),
        nim: form.nim.trim(),
        email: form.email.trim().toLowerCase(),
        prodi: form.prodi,
        reason: form.reason.trim() || null,
        hobbies: hobi.length > 0 ? hobi : null,
      });

      if (error) {
        if (error.code === "23505") {
          setErrorMsg(
            "Email ini masih menunggu persetujuan atau sudah terdaftar. Kalau dulu ditolak, silakan daftar ulang."
          );
        } else {
          setErrorMsg(error.message);
        }
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMsg("Gagal mengirim. Periksa koneksi internet.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-16 md:py-24">
        <div className="w-full max-w-md border-2 border-dark bg-white p-8 text-center shadow-[6px_6px_0px_#1A1A1A]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border-2 border-dark bg-[#D1E7DD] shadow-[3px_3px_0px_#1A1A1A]">
            <Send className="h-6 w-6 text-dark" />
          </div>
          <span className="mb-3 inline-block border-2 border-dark bg-[#FFF3C4] px-2.5 py-0.5 font-[family-name:var(--font-ibm-plex-mono)] text-[10px] font-black uppercase tracking-wider text-dark">
            STATUS: MENUNGGU PERSETUJUAN
          </span>
          <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-black uppercase tracking-tight text-dark md:text-3xl">
            Pendaftaran <span className="text-maroon">Terkirim!</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-dark/70">
            Data kamu sudah masuk antrian. Sekretaris USRC akan meninjau dan
            menghubungi lewat email/WA.
          </p>
          <div className="mt-6 border-t-2 border-dashed border-dark/20 pt-6">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 border-2 border-dark bg-white px-5 py-2.5 font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold uppercase tracking-wider text-dark shadow-[3px_3px_0px_#1A1A1A] transition-all hover:-translate-y-0.5 hover:bg-[#FFF3C4] hover:shadow-[4px_4px_0px_var(--color-maroon)] active:translate-y-0 active:shadow-none"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-maroon transition-transform group-hover:-translate-x-1" />
              <span>Kembali ke Beranda</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 md:py-16">
      {/* Tombol Kembali (Neobrutalist Badge) */}
      <div className="mb-6">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 border-2 border-dark bg-white px-3.5 py-1.5 font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold uppercase tracking-wider text-dark shadow-[3px_3px_0px_#1A1A1A] transition-all hover:-translate-y-0.5 hover:bg-[#FFF3C4] hover:shadow-[4px_4px_0px_var(--color-maroon)] active:translate-y-0 active:shadow-none"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-maroon transition-transform group-hover:-translate-x-1" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>

      {/* Main Registration Card */}
      <div className="relative border-2 border-dark bg-white p-6 md:p-8 shadow-[6px_6px_0px_#1A1A1A]">
        {/* Ticket Header */}
        <div className="mb-6 flex items-center justify-between border-b-2 border-dashed border-dark/20 pb-4">
          <span className="border-2 border-dark bg-[#FFF3C4] px-2.5 py-1 font-[family-name:var(--font-ibm-plex-mono)] text-[10px] font-black uppercase tracking-wider text-dark shadow-[2px_2px_0px_#1A1A1A]">
            REKRUTMEN ANGGOTA
          </span>
          <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[11px] font-bold uppercase text-dark/50">
            [EST. 2026]
          </span>
        </div>

        <h1 className="font-[family-name:var(--font-outfit)] text-3xl font-black uppercase tracking-tight text-dark md:text-4xl">
          Daftar <span className="text-maroon">Anggota</span>
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-dark/70">
          Isi data di bawah. Pendaftaran akan ditinjau oleh sekretaris USRC.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* Honeypot field - hidden from real users */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={handleChange}
            />
          </div>

          {/* Nama */}
          <div>
            <label className="mb-1.5 block font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold uppercase tracking-wider text-dark/80">
              Nama Lengkap *
            </label>
            <input
              type="text"
              name="full_name"
              required
              value={form.full_name}
              onChange={handleChange}
              className="w-full border-2 border-dark bg-white px-3.5 py-2.5 text-sm text-dark transition-all focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon"
            />
          </div>

          {/* NIM */}
          <div>
            <label className="mb-1.5 block font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold uppercase tracking-wider text-dark/80">
              NIM *
            </label>
            <input
              type="text"
              name="nim"
              required
              value={form.nim}
              onChange={handleChange}
              className="w-full border-2 border-dark bg-white px-3.5 py-2.5 text-sm text-dark transition-all focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold uppercase tracking-wider text-dark/80">
              Email *
            </label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full border-2 border-dark bg-white px-3.5 py-2.5 text-sm text-dark transition-all focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon"
            />
          </div>

          {/* Prodi */}
          <div>
            <label className="mb-1.5 block font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold uppercase tracking-wider text-dark/80">
              Program Studi *
            </label>
            <select
              name="prodi"
              required
              value={form.prodi}
              onChange={handleChange}
              className="w-full border-2 border-dark bg-white px-3.5 py-2.5 text-sm text-dark transition-all focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon"
            >
              <option value="">— Pilih prodi —</option>
              {PRODI_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Hobi/Minat */}
          <div>
            <label className="mb-1.5 block font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold uppercase tracking-wider text-dark/80">
              Hobi / Minat * <span className="text-dark/50">(pilih satu atau lebih)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {HOBI_OPTIONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => toggleHobi(h)}
                  aria-pressed={hobi.includes(h)}
                  className={`border-2 px-3 py-1.5 font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold transition-all active:translate-x-[1px] active:translate-y-[1px] ${
                    hobi.includes(h)
                      ? "border-dark bg-maroon text-white shadow-[2px_2px_0px_#1A1A1A]"
                      : "border-dark bg-white text-dark shadow-[2px_2px_0px_#1A1A1A] hover:bg-[#FFF3C4]"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
            <p className="mt-1 font-[family-name:var(--font-ibm-plex-mono)] text-[10px] uppercase text-dark/50">
              {hobi.length > 0 ? `${hobi.length} dipilih` : "Wajib pilih minimal satu"}
            </p>
          </div>

          {/* Alasan */}
          <div>
            <label className="mb-1.5 block font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold uppercase tracking-wider text-dark/80">
              Alasan Gabung (opsional)
            </label>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              rows={3}
              className="w-full resize-none border-2 border-dark bg-white px-3.5 py-2.5 text-sm text-dark transition-all focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon"
              placeholder="Ceritain singkat: kamu pengen belajar apa, bikin apa, atau cari teman diskusi soal apa?"
            />
            <p className="mt-1 font-[family-name:var(--font-ibm-plex-mono)] text-[10px] uppercase text-dark/50">
              Tidak harus formal. 1-3 kalimat cukup.
            </p>
          </div>

          {/* Error */}
          {status === "error" && (
            <div className="border-2 border-dark bg-[#F8D7DA] p-3 font-[family-name:var(--font-ibm-plex-mono)] text-xs text-dark shadow-[3px_3px_0px_#1A1A1A]">
              {'//'} ERROR: {errorMsg}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={status === "loading"}
            className="group flex w-full items-center justify-center gap-2 border-2 border-dark bg-maroon px-6 py-3.5 font-[family-name:var(--font-outfit)] text-sm font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_#1A1A1A] transition-all hover:bg-hot hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_#1A1A1A]"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Mengirim...</span>
              </>
            ) : (
              <>
                <span>Kirim Pendaftaran</span>
                <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
