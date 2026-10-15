"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2 } from "lucide-react";
import {
  PixelAvatar,
  AVATARS,
  AVATAR_BG,
  avatarById,
  validAvatarBg,
} from "@/components/pixel/PixelAvatar";
import { HOBI_OPTIONS } from "@/lib/hobi";

interface Profile {
  full_name: string;
  nim: string;
  prodi: string;
  role: string;
  instagram: string;
  github: string;
  behance: string;
  linkedin: string;
  hobbies: string[];
  about: string;
}

// Sosmed pembuat — tampil sebagai chip di detail karya.
const SOCIAL_FIELDS: { key: keyof Pick<Profile, "instagram" | "github" | "behance" | "linkedin">; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "instagram.com/username" },
  { key: "github", label: "GitHub", placeholder: "github.com/username" },
  { key: "behance", label: "Behance", placeholder: "behance.net/username" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/username" },
];

const PRODI_OPTIONS = ["Informatika", "Sistem Informasi", "SI Akuntansi"];

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // ganti avatar max seminggu sekali

const FONT_DISPLAY = "font-[family-name:var(--font-outfit)]";
const FONT_MONO = "font-[family-name:var(--font-ibm-plex-mono)]";

const BAND_TEXT = "// profil saya // data keanggotaan // usrc ubsi pontianak ";

function fmtUnlockDate(ts: string): string {
  return new Date(new Date(ts).getTime() + COOLDOWN_MS).toLocaleDateString(
    "id-ID",
    { day: "numeric", month: "long", year: "numeric" }
  );
}

// ── Judul seksi bernomor (01/02/03/04) ──
function SectionHead({ no, title }: { no: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <b className="grid h-[38px] w-[38px] flex-none place-items-center border-2 border-dark bg-maroon font-display text-base font-black text-white shadow-[3px_3px_0_#1A1A1A]">
        {no}
      </b>
      <h3 className={`${FONT_DISPLAY} m-0 text-[22px] font-black leading-none text-dark`}>
        {title}
      </h3>
      <i className="h-[3px] min-w-3 flex-1 bg-dark" />
    </div>
  );
}

export default function ProfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // avatar hewan
  const [avatarId, setAvatarId] = useState("kucing");
  const [avatarBg, setAvatarBg] = useState<string>(AVATAR_BG[0]);
  const [loadedAvatar, setLoadedAvatar] = useState<{ id: string; bg: string }>({ id: "", bg: "" });
  const [pixelUpdatedAt, setPixelUpdatedAt] = useState<string | null>(null);
  const avatarLocked = pixelUpdatedAt
    ? Date.now() - new Date(pixelUpdatedAt).getTime() < COOLDOWN_MS
    : false;

  // dialog pilih karakter
  const [pickOpen, setPickOpen] = useState(false);
  const [pickId, setPickId] = useState("kucing");
  const [pickBg, setPickBg] = useState<string>(AVATAR_BG[0]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const chgRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setEmail(user.email || "");
      const { data } = await supabase
        .from("profiles")
        .select("full_name, nim, prodi, role, instagram, github, behance, linkedin, hobbies, about, avatar_id, avatar_bg, pixel_updated_at")
        .eq("id", user.id)
        .single();
      setProfile(
        data
          ? {
              full_name: data.full_name ?? "",
              nim: data.nim ?? "-",
              prodi: data.prodi ?? "Informatika",
              role: data.role ?? "anggota",
              instagram: data.instagram ?? "",
              github: data.github ?? "",
              behance: data.behance ?? "",
              linkedin: data.linkedin ?? "",
              hobbies: data.hobbies ?? [],
              about: data.about ?? "",
            }
          : {
              full_name: "", nim: "-", prodi: "Informatika", role: "anggota",
              instagram: "", github: "", behance: "", linkedin: "",
              hobbies: [], about: "",
            }
      );
      if (data) {
        setAvatarId(data.avatar_id || "kucing");
        setAvatarBg(validAvatarBg(data.avatar_bg));
        setLoadedAvatar({ id: data.avatar_id || "kucing", bg: validAvatarBg(data.avatar_bg) });
        setPixelUpdatedAt(data.pixel_updated_at ?? null);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setMessage(null);

    if (!profile.full_name.trim()) {
      setError("Nama tidak boleh kosong.");
      return;
    }

    setSaving(true);
    const { data: { user } } = await createClient().auth.getUser();
    if (!user) { router.push("/login"); return; }

    const safe = (s: string) => s.trim() || null;
    const avatarChanged =
      avatarId !== loadedAvatar.id || avatarBg !== loadedAvatar.bg;

    const { error: updateError } = await createClient()
      .from("profiles")
      .update({
        full_name: profile.full_name.trim(),
        prodi: profile.prodi,
        instagram: safe(profile.instagram),
        github: safe(profile.github),
        behance: safe(profile.behance),
        linkedin: safe(profile.linkedin),
        hobbies: profile.hobbies.length > 0 ? profile.hobbies : null,
        about: safe(profile.about),
        avatar_id: avatarId,
        avatar_bg: avatarBg,
        // lock avatar 7 hari hanya berlaku saat avatar benar-benar diganti
        ...(avatarChanged ? { pixel_updated_at: new Date().toISOString() } : {}),
      })
      .eq("id", user.id);
    setSaving(false);
    if (avatarChanged) {
      setLoadedAvatar({ id: avatarId, bg: avatarBg });
      setPixelUpdatedAt(new Date().toISOString());
    }
    if (updateError) {
      setError(updateError.message || "Gagal menyimpan profil.");
    } else {
      setMessage("Profil berhasil disimpan! ✓");
    }
  }

  function openPicker() {
    setPickId(avatarId);
    setPickBg(avatarBg);
    dialogRef.current?.showModal();
    setPickOpen(true);
  }
  function closePicker() {
    dialogRef.current?.close();
    setPickOpen(false);
    chgRef.current?.focus();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton mt-6 h-64 w-full" />
      </div>
    );
  }

  const unlockNote = avatarLocked && pixelUpdatedAt
    ? `// karakter terkunci setelah disimpan, bisa ganti lagi ${fmtUnlockDate(pixelUpdatedAt)}`
    : null;

  return (
    <div>
      {/* ── Pita marquee ── */}
      <div
        className="pf-band -mx-4 mb-8 border-b-[3px] border-maroon bg-dark py-[7px] text-[11px] font-medium uppercase tracking-[.2em] text-[#FFF3C4]"
        aria-hidden="true"
      >
        <span>{BAND_TEXT.repeat(6)}</span>
      </div>

      <div className="mx-auto max-w-[800px] px-1 pb-16">
        {/* ── Kepala halaman ── */}
        <header className="mb-9">
          <span className="inline-block rotate-[-2deg] border-2 border-dark bg-[#FFF3C4] px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[.08em] text-dark">
            // kartu anggota
          </span>
          <h1 className={`${FONT_DISPLAY} mt-3 text-[clamp(52px,13vw,104px)] font-black uppercase leading-[.88] tracking-tight text-dark`}>
            Profil<br />
            <span className="text-maroon [text-shadow:4px_4px_0_#1A1A1A]">Saya</span>
          </h1>
        </header>

        {message && (
          <div className="mb-4 flex items-center gap-2 border-2 border-dark bg-[#DFF5E1] px-4 py-3 shadow-[3px_3px_0_#1A1A1A]">
            <BadgeCheck className="h-4 w-4 text-green-700" strokeWidth={2.5} />
            <p className={`${FONT_MONO} text-sm text-dark`}>{message}</p>
          </div>
        )}
        {error && (
          <div className="mb-4 border-2 border-dark bg-[#F8D7DA] px-4 py-3 shadow-[3px_3px_0_#1A1A1A]">
            <p className={`${FONT_MONO} text-sm text-dark`}>{error}</p>
          </div>
        )}

        {/* ── Lembar profil ── */}
        <div className="archive-stack">
          <i className="archive-lay c" />
          <i className="archive-lay b" />
          <i className="archive-lay a" />
          <section className="archive-sheet relative border-[3px] border-dark bg-[#FFFDF7]" aria-label="Profil saya">
            <span className="archive-tape" aria-hidden="true" />

            {/* Identitas + avatar */}
            <div className="grid justify-items-center gap-8 px-6 pb-8 pt-10 md:grid-cols-[auto_1fr] md:items-center md:gap-10 md:px-8">
              <div className="pf-ring relative m-3">
                <PixelAvatar
                  id={avatarId}
                  bg={avatarBg}
                  className="h-[184px] w-[184px] overflow-hidden rounded-full border-4 border-dark shadow-[8px_8px_0_#7A1B2E]"
                />
                <span className="absolute left-[-22px] top-0.5 rotate-[-8deg] bg-dark px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide text-[#FFF3C4]">
                  [EST. 2026]
                </span>
                <button
                  ref={chgRef}
                  type="button"
                  onClick={openPicker}
                  disabled={avatarLocked}
                  className="absolute bottom-0.5 right-[-22px] rotate-[4deg] border-2 border-dark bg-[#FFF3C4] px-3 py-1.5 font-display text-xs font-black uppercase tracking-wide text-dark shadow-[3px_3px_0_#1A1A1A] transition-colors hover:bg-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ✎ Ganti
                </button>
              </div>

              <div className="min-w-0">
                <span className="inline-block rotate-[-2deg] border-2 border-dark bg-[#D1E7DD] px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[.08em] text-dark">
                  // anggota aktif
                </span>
                <h2 className={`${FONT_DISPLAY} mt-3 text-[clamp(30px,6.5vw,50px)] font-black uppercase leading-[.95] text-dark`} style={{ overflowWrap: "anywhere" }}>
                  <span className="ps-name-hl !bg-none before:hidden" style={{ backgroundImage: "linear-gradient(transparent 60%, #FFF3C4 60%)" }}>
                    {profile?.full_name || "Nama kamu"}
                  </span>
                </h2>
                <blockquote className={`${FONT_MONO} m-0 mt-4 max-w-[46ch] border-l-[6px] border-maroon py-0.5 pl-3.5 text-sm text-dark`}>
                  {profile?.about?.trim() || "Belum ada bio."}
                </blockquote>
                <div className="mt-4 grid border-2 border-dark bg-white shadow-[4px_4px_0_#1A1A1A] sm:grid-cols-[1fr_1.4fr_1fr]">
                  <div className="border-b-2 border-dark px-3 py-2 sm:border-b-0 sm:border-r-2">
                    <small className="block font-mono text-[10px] uppercase tracking-[.14em] text-dark/60">NIM</small>
                    <b className={`${FONT_DISPLAY} text-base font-extrabold uppercase text-dark`}>{profile?.nim || "-"}</b>
                  </div>
                  <div className="border-b-2 border-dark px-3 py-2 sm:border-b-0 sm:border-r-2">
                    <small className="block font-mono text-[10px] uppercase tracking-[.14em] text-dark/60">Program studi</small>
                    <b className={`${FONT_DISPLAY} text-base font-extrabold uppercase text-dark`}>{profile?.prodi}</b>
                  </div>
                  <div className="bg-maroon px-3 py-2 text-white">
                    <small className="block font-mono text-[10px] uppercase tracking-[.14em] text-white/75">Role</small>
                    <b className={`${FONT_DISPLAY} text-base font-extrabold uppercase`}>{profile?.role}</b>
                  </div>
                </div>
              </div>
            </div>

            {unlockNote && (
              <p className={`${FONT_MONO} mx-6 mb-6 border-2 border-dashed border-dark/40 px-3 py-2 text-[11px] text-dark/60 md:mx-8`}>
                {unlockNote}
              </p>
            )}

            {/* ── Form ── */}
            <form onSubmit={handleSave}>
              <div className="pf-form border-t-[3px] border-dashed border-dark px-6 pb-6 pt-9 md:px-8">
                {/* 01 Data diri */}
                <div className="mb-8">
                  <SectionHead no="01" title="Data diri" />
                  <span className={`${FONT_MONO} mb-4 ml-[50px] mt-2 block text-xs text-dark/70`}>
                    // NIM dan email tidak bisa diubah
                  </span>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="pf-nim" className={`${FONT_MONO} mb-1.5 block text-[11px] font-medium uppercase tracking-[.12em] text-dark/70`}>
                        NIM (tetap)
                      </label>
                      <input id="pf-nim" value={profile?.nim || "-"} readOnly
                        className="w-full border-2 border-dark/30 border-dashed bg-[#EFECE5] px-3 py-3 font-mono text-sm text-dark/60" />
                    </div>
                    <div>
                      <label htmlFor="pf-email" className={`${FONT_MONO} mb-1.5 block text-[11px] font-medium uppercase tracking-[.12em] text-dark/70`}>
                        Email (tetap)
                      </label>
                      <input id="pf-email" value={email} readOnly
                        className="w-full truncate border-2 border-dark/30 border-dashed bg-[#EFECE5] px-3 py-3 font-mono text-sm text-dark/60" />
                    </div>
                    <div>
                      <label htmlFor="pf-nama" className={`${FONT_MONO} mb-1.5 block text-[11px] font-medium uppercase tracking-[.12em] text-dark/70`}>
                        Nama lengkap
                      </label>
                      <input id="pf-nama" type="text" autoComplete="name"
                        value={profile?.full_name || ""}
                        onChange={(e) => setProfile((p) => (p ? { ...p, full_name: e.target.value } : p))}
                        placeholder="Nama lengkap kamu"
                        className="w-full border-2 border-dark bg-white px-3 py-3 font-mono text-sm text-dark placeholder-dark/40 focus:shadow-[5px_5px_0_#7A1B2E] focus:outline-none" />
                    </div>
                    <div>
                      <label htmlFor="pf-prodi" className={`${FONT_MONO} mb-1.5 block text-[11px] font-medium uppercase tracking-[.12em] text-dark/70`}>
                        Program studi
                      </label>
                      <select id="pf-prodi"
                        value={profile?.prodi || "Informatika"}
                        onChange={(e) => setProfile((p) => (p ? { ...p, prodi: e.target.value } : p))}
                        className="w-full border-2 border-dark bg-white px-3 py-3 font-mono text-sm text-dark focus:shadow-[5px_5px_0_#7A1B2E] focus:outline-none">
                        {PRODI_OPTIONS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 02 Tentang saya */}
                <div className="mb-8">
                  <SectionHead no="02" title="Tentang saya" />
                  <span className={`${FONT_MONO} mb-4 ml-[50px] mt-2 block text-xs text-dark/70`}>
                    // tampil di kartu member saat diklik orang lain
                  </span>
                  <textarea
                    value={profile?.about || ""}
                    maxLength={250}
                    rows={4}
                    onChange={(e) => setProfile((p) => (p ? { ...p, about: e.target.value } : p))}
                    placeholder="Tulis perkenalan singkat"
                    className="w-full resize-y border-2 border-dark bg-white px-3 py-3 font-mono text-sm text-dark placeholder-dark/40 focus:shadow-[5px_5px_0_#7A1B2E] focus:outline-none"
                  />
                  <div className={`${FONT_MONO} mt-1 text-right text-xs text-dark/60`}>
                    {(profile?.about || "").length}/250
                  </div>
                </div>

                {/* 03 Sosmed */}
                <div className="mb-8">
                  <SectionHead no="03" title="Sosmed" />
                  <span className={`${FONT_MONO} mb-4 ml-[50px] mt-2 block text-xs text-dark/70`}>
                    // ikut tampil di karya yang kamu buat, opsional
                  </span>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {SOCIAL_FIELDS.map((f) => (
                      <div key={f.key}>
                        <label htmlFor={`pf-${f.key}`} className={`${FONT_MONO} mb-1.5 block text-[11px] font-medium uppercase tracking-[.12em] text-dark/70`}>
                          {f.label}
                        </label>
                        <input
                          id={`pf-${f.key}`}
                          type="text"
                          value={profile?.[f.key] || ""}
                          onChange={(e) => setProfile((p) => (p ? { ...p, [f.key]: e.target.value } : p))}
                          placeholder={f.placeholder}
                          className="w-full border-2 border-dark bg-white px-3 py-3 font-mono text-sm text-dark placeholder-dark/40 focus:shadow-[5px_5px_0_#7A1B2E] focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 04 Hobi */}
                <div className="mb-8">
                  <SectionHead no="04" title="Hobi &amp; minat" />
                  <span className={`${FONT_MONO} mb-4 ml-[50px] mt-2 block text-xs text-dark/70`}>
                    // tampil di tab pendataan admin, pilih satu atau lebih
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {HOBI_OPTIONS.map((h) => {
                      const on = profile?.hobbies.includes(h) ?? false;
                      return (
                        <button
                          key={h}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            setProfile((p) =>
                              p
                                ? {
                                    ...p,
                                    hobbies: on
                                      ? p.hobbies.filter((x) => x !== h)
                                      : [...p.hobbies, h],
                                  }
                                : p
                            )
                          }
                          className={`border-2 px-3 py-1.5 font-mono text-xs font-medium transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                            on
                              ? "border-dark bg-maroon text-white shadow-[3px_3px_0_#1A1A1A]"
                              : "border-dark bg-white text-dark shadow-[3px_3px_0_#1A1A1A] hover:bg-[#FFF3C4]"
                          }`}
                        >
                          {h}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer form */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-t-[3px] border-dark pt-6">
                  <span className="inline-block rotate-[-4deg] border-[3px] border-maroon px-3 py-0.5 font-display text-sm font-black uppercase tracking-[.1em] text-maroon">
                    Role: {profile?.role || "anggota"}
                  </span>
                  <div className="flex items-center gap-3.5">
                    <span className={`${FONT_MONO} text-xs text-dark/60`} role="status">
                      {saving ? "Menyimpan..." : ""}
                    </span>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex min-h-11 items-center gap-2 border-[3px] border-dark bg-maroon px-7 py-3 font-display text-sm font-black uppercase tracking-[.08em] text-white shadow-[5px_5px_0_#1A1A1A] transition-all hover:bg-hot active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
                    >
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                      Simpan
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </section>
        </div>
      </div>

      {/* ── Dialog pilih karakter ── */}
      <dialog
        ref={dialogRef}
        className="pf-pick m-auto w-[min(760px,calc(100vw-44px))] max-h-[calc(100dvh-28px)] border-0 bg-transparent p-0 text-dark backdrop:bg-transparent"
        onClick={(e) => { if (e.target === dialogRef.current) closePicker(); }}
        onClose={() => setPickOpen(false)}
      >
        <div className="archive-stack">
          <i className="archive-lay c" />
          <i className="archive-lay b" />
          <i className="archive-lay a" />
          <div className="archive-sheet relative max-h-[calc(100dvh-28px)] overflow-y-auto border-[3px] border-dark bg-[#FFFDF7] px-6 pb-5 pt-7">
            <span className="inline-block rotate-[-2deg] border-2 border-dark bg-[#FFF3C4] px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[.08em] text-dark">
              // ganti karakter
            </span>
            <div className="mt-3 flex items-start justify-between gap-3">
              <h3 className={`${FONT_DISPLAY} m-0 text-[clamp(34px,8vw,52px)] font-black uppercase leading-[.9] text-dark`}>
                Pilih<br />
                <span className="text-maroon [text-shadow:3px_3px_0_#1A1A1A]">karakter</span>
              </h3>
              <button
                type="button"
                onClick={closePicker}
                aria-label="Tutup"
                className="h-[42px] w-[42px] flex-none border-[3px] border-dark bg-[#FFF3C4] font-bold shadow-[3px_3px_0_#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-[200px_1fr] md:items-start">
              {/* preview */}
              <div className="flex flex-col items-center text-center">
                <PixelAvatar
                  id={pickId}
                  bg={pickBg}
                  className="mb-3 h-[164px] w-[164px] overflow-hidden rounded-full border-4 border-dark shadow-[7px_7px_0_#7A1B2E]"
                />
                <b className={`${FONT_DISPLAY} text-2xl font-black leading-none text-dark`}>
                  {avatarById(pickId).name}
                </b>
                <span className={`${FONT_MONO} mt-1 text-xs text-dark/70`}>
                  No. {String(AVATARS.findIndex((a) => a.id === pickId) + 1).padStart(2, "0")}/{String(AVATARS.length).padStart(2, "0")}
                </span>
              </div>

              {/* grid pilihan + latar */}
              <div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3.5">
                  {AVATARS.map((a, i) => (
                    <button
                      key={a.id}
                      type="button"
                      data-k={a.id}
                      aria-pressed={pickId === a.id}
                      onClick={() => setPickId(a.id)}
                      className={`flex flex-col border-[3px] text-left shadow-[3px_3px_0_#1A1A1A] transition-transform hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#1A1A1A] ${
                        pickId === a.id ? "border-dark bg-maroon text-white" : "border-dark bg-white text-dark"
                      }`}
                    >
                      <span className="block aspect-square w-full overflow-hidden border-b-[3px] border-dark" style={{ background: pickBg }}>
                        <PixelAvatar id={a.id} bg={pickBg} className="h-full w-full" />
                      </span>
                      <span className="flex justify-between gap-1 px-1.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide">
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <span>{a.name}</span>
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <span className={`${FONT_MONO} text-xs text-dark/70`}>Latar:</span>
                  {AVATAR_BG.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Warna latar ${c}`}
                      aria-pressed={pickBg === c}
                      onClick={() => setPickBg(c)}
                      style={{ background: c }}
                      className={`h-8 w-8 border-[3px] border-dark ${pickBg === c ? "-translate-x-px -translate-y-px shadow-[3px_3px_0_#1A1A1A]" : ""}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <p className={`${FONT_MONO} mb-5 mt-5 text-xs text-dark/70`}>
              {unlockNote ?? "// karakter bisa diganti lagi kapan saja"}
            </p>

            <div className="flex flex-wrap justify-end gap-3 border-t-[3px] border-dashed border-dark pt-4">
              <button
                type="button"
                onClick={closePicker}
                className="border-[3px] border-dark bg-white px-5 py-2.5 font-display text-sm font-black uppercase tracking-wide text-dark shadow-[4px_4px_0_#1A1A1A] active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={avatarLocked}
                onClick={() => { setAvatarId(pickId); setAvatarBg(pickBg); closePicker(); }}
                className="border-[3px] border-dark bg-maroon px-5 py-2.5 font-display text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_#1A1A1A] transition-colors hover:bg-hot active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                Pakai karakter ini
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
}
