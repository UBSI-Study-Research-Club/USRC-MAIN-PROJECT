"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
  });
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const supabase = createClient();
      const { error } = await supabase.from("registrations").insert({
        full_name: form.full_name.trim(),
        nim: form.nim.trim(),
        email: form.email.trim().toLowerCase(),
        prodi: form.prodi,
        reason: form.reason.trim() || null,
      });

      if (error) {
        if (error.code === "23505") {
          setErrorMsg("Email atau NIM sudah terdaftar sebelumnya.");
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
      <div className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="max-w-md border-2 border-dark bg-white p-8 text-center neo-shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border-2 border-dark bg-status-approved">
            <Send className="h-6 w-6 text-dark" />
          </div>
          <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-extrabold uppercase text-dark">
            Pendaftaran Terkirim!
          </h1>
          <p className="mt-2 text-sm text-dark/70">
            Data kamu sudah masuk antrian. Sekretaris USRC akan meninjau dan
            menghubungi lewat email/WA.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 border-2 border-dark bg-maroon px-5 py-2 font-[family-name:var(--font-outfit)] text-sm font-bold uppercase text-white neo-shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 font-[family-name:var(--font-ibm-plex-mono)] text-xs uppercase tracking-wider text-maroon hover:underline"
      >
        <ArrowLeft className="h-3 w-3" /> Kembali
      </Link>

      <h1 className="font-[family-name:var(--font-outfit)] text-3xl font-black uppercase tracking-tight text-dark">
        Daftar <span className="text-maroon">Anggota</span>
      </h1>
      <p className="mt-1 text-sm text-dark/60">
        Isi data di bawah. Pendaftaran akan ditinjau oleh sekretaris USRC.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {/* Nama */}
        <div>
          <label className="mb-1 block font-[family-name:var(--font-ibm-plex-mono)] text-xs uppercase tracking-wider text-dark/70">
            Nama Lengkap *
          </label>
          <input
            type="text"
            name="full_name"
            required
            value={form.full_name}
            onChange={handleChange}
            className="w-full border-2 border-dark bg-white px-3 py-2 text-sm"
            placeholder="Contoh: Chello Pratama"
          />
        </div>

        {/* NIM */}
        <div>
          <label className="mb-1 block font-[family-name:var(--font-ibm-plex-mono)] text-xs uppercase tracking-wider text-dark/70">
            NIM *
          </label>
          <input
            type="text"
            name="nim"
            required
            value={form.nim}
            onChange={handleChange}
            className="w-full border-2 border-dark bg-white px-3 py-2 text-sm"
            placeholder="Contoh: 12345678"
          />
        </div>

        {/* Email */}
        <div>
          <label className="mb-1 block font-[family-name:var(--font-ibm-plex-mono)] text-xs uppercase tracking-wider text-dark/70">
            Email *
          </label>
          <input
            type="email"
            name="email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full border-2 border-dark bg-white px-3 py-2 text-sm"
            placeholder="nama@bsi.ac.id"
          />
        </div>

        {/* Prodi */}
        <div>
          <label className="mb-1 block font-[family-name:var(--font-ibm-plex-mono)] text-xs uppercase tracking-wider text-dark/70">
            Program Studi *
          </label>
          <select
            name="prodi"
            required
            value={form.prodi}
            onChange={handleChange}
            className="w-full border-2 border-dark bg-white px-3 py-2 text-sm"
          >
            <option value="">— Pilih prodi —</option>
            {PRODI_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Alasan */}
        <div>
          <label className="mb-1 block font-[family-name:var(--font-ibm-plex-mono)] text-xs uppercase tracking-wider text-dark/70">
            Alasan Gabung (opsional)
          </label>
          <textarea
            name="reason"
            value={form.reason}
            onChange={handleChange}
            rows={3}
            className="w-full resize-none border-2 border-dark bg-white px-3 py-2 text-sm"
            placeholder="Ceritakan singkat kenapa tertarik gabung USRC..."
          />
        </div>

        {/* Error */}
        {status === "error" && (
          <div className="border-2 border-dark bg-status-rejected p-3 text-sm text-dark">
            {errorMsg}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex w-full items-center justify-center gap-2 border-2 border-dark bg-maroon px-6 py-3 font-[family-name:var(--font-outfit)] text-sm font-bold uppercase tracking-wider text-white neo-shadow transition-transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-none disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <Send className="h-4 w-4" />
          {status === "loading" ? "Mengirim..." : "Kirim Pendaftaran"}
        </button>
      </form>
    </div>
  );
}
