"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { BadgeCheck, Check, Loader2, Pencil } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { SideSheet } from "@/components/SideSheet";
import { GLIDE } from "@/components/motion/Glide";
import { nickname } from "@/lib/name";
import { SOCIAL_PLATFORMS, toHandle } from "@/lib/social";
import {
  PixelAvatar,
  AVATARS,
  AVATAR_BG,
  avatarById,
  validAvatarBg,
} from "@/components/pixel/PixelAvatar";
import { HOBI_OPTIONS } from "@/lib/hobi";
import { Select } from "@/components/Select";

interface Profile {
  full_name: string;
  nim: string;
  whatsapp: string;
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
const SOCIAL_FIELDS: { key: keyof Pick<Profile, "instagram" | "github" | "behance" | "linkedin">; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "github", label: "GitHub" },
  { key: "behance", label: "Behance" },
  { key: "linkedin", label: "LinkedIn" },
];

const PRODI_OPTIONS = ["Informatika", "Sistem Informasi", "SI Akuntansi"];

// const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // dibebaskan, bisa ganti kapan saja

const FONT_DISPLAY = "font-[family-name:var(--font-outfit)]";
const FONT_MONO = "font-[family-name:var(--font-ibm-plex-mono)]";


// ── Batas cooldown dihapus, bisa diganti kapan saja ──

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

  // dialog pilih karakter
  const [pickId, setPickId] = useState("kucing");
  const [pickBg, setPickBg] = useState<string>(AVATAR_BG[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Snapshot data tersimpan — untuk penanda "ada perubahan belum disimpan"
  const [savedSnapshot, setSavedSnapshot] = useState("");

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
        .select("full_name, nim, whatsapp, prodi, role, instagram, github, behance, linkedin, hobbies, about, avatar_id, avatar_bg, pixel_updated_at")
        .eq("id", user.id)
        .single();
      const loaded: Profile =
        data
          ? {
              full_name: data.full_name ?? "",
              nim: data.nim ?? "-",
              whatsapp: data.whatsapp ?? "",
              prodi: data.prodi ?? "Informatika",
              role: data.role ?? "anggota",
              instagram: toHandle("instagram", data.instagram),
              github: toHandle("github", data.github),
              behance: toHandle("behance", data.behance),
              linkedin: toHandle("linkedin", data.linkedin),
              hobbies: data.hobbies ?? [],
              about: data.about ?? "",
            }
          : {
              full_name: "", nim: "-", whatsapp: "", prodi: "Informatika", role: "anggota",
              instagram: "", github: "", behance: "", linkedin: "",
              hobbies: [], about: "",
            };
      setProfile(loaded);
      if (data) {
        setAvatarId(data.avatar_id || "kucing");
        setAvatarBg(validAvatarBg(data.avatar_bg));
        setLoadedAvatar({ id: data.avatar_id || "kucing", bg: validAvatarBg(data.avatar_bg) });
        setPixelUpdatedAt(data.pixel_updated_at ?? null);
      }
      setSavedSnapshot(JSON.stringify({ ...loaded, avatarId: data?.avatar_id || "kucing", avatarBg: validAvatarBg(data?.avatar_bg) }));
      setLoading(false);
    }
    load();
  }, [router]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setMessage(null);

    if (!profile.full_name.trim()) {
      setError("Nama tidak boleh kosong.");
      return;
    }

    const cleanWa = profile.whatsapp.replace(/\D/g, "");
    const normWa = cleanWa.startsWith("0") ? "62" + cleanWa.slice(1) : (!cleanWa.startsWith("62") && cleanWa.length > 0 ? "62" + cleanWa : cleanWa);
    if (normWa.length < 9 || normWa.length > 16) {
      setError("Nomor WhatsApp tidak valid (harus 9–16 digit).");
      setSaving(false);
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
        whatsapp: normWa,
        prodi: profile.prodi,
        instagram: safe(toHandle("instagram", profile.instagram)),
        github: safe(toHandle("github", profile.github)),
        behance: safe(toHandle("behance", profile.behance)),
        linkedin: safe(toHandle("linkedin", profile.linkedin)),
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
      setMessage("Profil berhasil disimpan.");
      setSavedSnapshot(JSON.stringify({ ...profile, avatarId, avatarBg }));
    }
  }

  function openPicker() {
    setPickId(avatarId);
    setPickBg(avatarBg);
    setPickerOpen(true);
  }

  if (loading || !profile) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-48" />
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="skeleton h-80 w-full" />
          <div className="skeleton h-[480px] w-full" />
        </div>
      </div>
    );
  }

  const dirty =
    JSON.stringify({ ...profile, avatarId, avatarBg }) !== savedSnapshot;
  const setField = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((p) => (p ? { ...p, [key]: value } : p));
  const socialsFilled = SOCIAL_FIELDS.filter((f) => profile[f.key].trim());

  return (
    <div className="pb-28 md:pb-12">
      {/* ── Kepala halaman ── */}
      <header className="mb-6 md:mb-8">
        <h1 className={`${FONT_DISPLAY} text-3xl font-black uppercase leading-none tracking-tight text-dark md:text-4xl`}>
          Profil
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-dark/70">
          Atur identitas yang tampil di story anggota, kartu member, dan karya kamu.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-8">
        {/* ── Pratinjau kartu (sticky di desktop) ── */}
        <aside className="lg:sticky lg:top-24" aria-label="Pratinjau kartu member">
          <div className="border-[3px] border-dark bg-white shadow-[6px_6px_0_#7A1B2E]">
            <div
              className="relative h-20 border-b-[3px] border-dark lg:h-24"
              style={{ backgroundColor: avatarBg, backgroundImage: "radial-gradient(rgba(26,26,26,.12) 1px, transparent 1.2px)", backgroundSize: "9px 9px" }}
            >
              <span className="absolute right-3 top-3 rotate-[3deg] border-2 border-dark bg-maroon px-2.5 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-[.14em] text-white shadow-[2px_2px_0_#1A1A1A]">
                {profile.role}
              </span>
            </div>

            <div className="px-5 pb-5">
              <div className="relative z-10 -mt-12 flex items-end justify-between gap-3 lg:-mt-14">
                <PixelAvatar
                  id={avatarId}
                  bg={avatarBg}
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-dark shadow-[5px_5px_0_#7A1B2E] lg:h-28 lg:w-28"
                />
                <button
                  type="button"
                  onClick={openPicker}
                  className="mb-1 inline-flex items-center gap-1.5 border-2 border-dark bg-[#FFF3C4] px-3 py-1.5 font-display text-xs font-black uppercase tracking-wide text-dark shadow-[3px_3px_0_#1A1A1A] transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Ganti karakter
                </button>
              </div>

              <h2 className={`${FONT_DISPLAY} mt-4 text-2xl font-black uppercase leading-[1.02] text-dark`} style={{ overflowWrap: "anywhere" }}>
                {profile.full_name.trim() || "Nama kamu"}
              </h2>
              <p className={`${FONT_MONO} mt-1 text-[11px] uppercase tracking-[.08em] text-dark/60`}>
                @{nickname(profile.full_name, "kamu").toLowerCase()} · {profile.prodi}
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-dark/80" style={{ overflowWrap: "anywhere" }}>
                {profile.about.trim() || <span className="text-dark/45">Belum ada bio.</span>}
              </p>

              <dl className="mt-4 grid grid-cols-2 border-2 border-dark bg-paper">
                <div className="border-r-2 border-dashed border-dark px-3 py-2">
                  <dt className={`${FONT_MONO} text-[10px] uppercase tracking-[.14em] text-dark/55`}>NIM</dt>
                  <dd className={`${FONT_DISPLAY} truncate text-sm font-extrabold text-dark`}>{profile.nim}</dd>
                </div>
                <div className="px-3 py-2">
                  <dt className={`${FONT_MONO} text-[10px] uppercase tracking-[.14em] text-dark/55`}>Prodi</dt>
                  <dd className={`${FONT_DISPLAY} truncate text-sm font-extrabold text-dark`}>{profile.prodi}</dd>
                </div>
              </dl>

              {(socialsFilled.length > 0 || profile.hobbies.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {socialsFilled.map((f) => (
                    <span key={f.key} className="border-2 border-dark bg-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-maroon">
                      {f.label}
                    </span>
                  ))}
                  {profile.hobbies.slice(0, 4).map((h) => (
                    <span key={h} className="border-2 border-dark bg-[#FFF3C4] px-2 py-0.5 font-mono text-[10px] font-semibold lowercase">
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className={`${FONT_MONO} mt-3 hidden text-[11px] text-dark/50 lg:block`}>
            Pratinjau ini berubah langsung saat kamu mengisi form.
          </p>
        </aside>

        {/* ── Form ── */}
        <form onSubmit={handleSave} className="min-w-0 space-y-6" id="profil-form">
          <AnimatePresence>
            {(message || error) && (
              <motion.div
                key={message ? "ok" : "err"}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={GLIDE}
                role="status"
                className={`flex items-center gap-2 border-2 border-dark px-4 py-3 shadow-[3px_3px_0_#1A1A1A] ${message ? "bg-[#DFF5E1]" : "bg-[#F8D7DA]"}`}
              >
                {message && <BadgeCheck className="h-4 w-4 shrink-0 text-green-700" strokeWidth={2.5} />}
                <p className="text-sm font-semibold text-dark">{message || error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <FormCard no="01" title="Data diri" hint="NIM dan email tidak bisa diubah.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama lengkap" htmlFor="pf-nama">
                <input id="pf-nama" type="text" autoComplete="name" value={profile.full_name}
                  onChange={(e) => setField("full_name", e.target.value)}
                  placeholder="Nama lengkap kamu" className={INPUT} />
              </Field>
              <Field label="No. WhatsApp *" htmlFor="pf-wa">
                <input id="pf-wa" type="tel" autoComplete="tel" value={profile.whatsapp}
                  onChange={(e) => setField("whatsapp", e.target.value)}
                  placeholder="08xxxxxxxxxx" className={INPUT} required />
              </Field>
              <Field label="Program studi" htmlFor="pf-prodi">
                <Select id="pf-prodi" value={profile.prodi} onChange={(v) => setField("prodi", v)} options={PRODI_OPTIONS} />
              </Field>
              <Field label="NIM" htmlFor="pf-nim">
                <input id="pf-nim" value={profile.nim} readOnly className={INPUT_LOCKED} />
              </Field>
              <Field label="Email" htmlFor="pf-email">
                <input id="pf-email" value={email} readOnly className={`${INPUT_LOCKED} truncate`} />
              </Field>
            </div>
          </FormCard>

          <FormCard no="02" title="Tentang saya" hint="Tampil di kartu member saat orang lain membuka profilmu.">
            <textarea
              value={profile.about}
              maxLength={250}
              rows={4}
              onChange={(e) => setField("about", e.target.value)}
              placeholder="Tulis perkenalan singkat"
              className={`${INPUT} resize-y`}
            />
            <div className={`${FONT_MONO} mt-1 text-right text-xs text-dark/55`}>{profile.about.length}/250</div>
          </FormCard>

          <FormCard no="03" title="Sosmed" hint="Cukup isi username. Tempel link juga boleh — otomatis dirapikan.">
            <div className="grid gap-4 sm:grid-cols-2">
              {SOCIAL_FIELDS.map((f) => {
                const plat = SOCIAL_PLATFORMS[f.key];
                return (
                  <Field key={f.key} label={f.label} htmlFor={`pf-${f.key}`}>
                    <div className="flex items-stretch border-2 border-dark bg-white transition-shadow focus-within:shadow-[4px_4px_0_#7A1B2E]">
                      <span className={`${FONT_MONO} flex shrink-0 items-center border-r-2 border-dark bg-paper px-2.5 text-xs text-dark/55`}>
                        {plat.at ? "@" : `${plat.domain}${plat.path}`}
                      </span>
                      <input
                        id={`pf-${f.key}`}
                        type="text"
                        inputMode="url"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={profile[f.key]}
                        onChange={(e) => setField(f.key, toHandle(f.key, e.target.value))}
                        placeholder="username"
                        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-dark placeholder-dark/40 focus:outline-none"
                      />
                    </div>
                  </Field>
                );
              })}
            </div>
          </FormCard>

          <FormCard no="04" title="Hobi & minat" hint="Pilih satu atau lebih.">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {HOBI_OPTIONS.map((h) => {
                const on = profile.hobbies.includes(h);
                return (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setField("hobbies", on ? profile.hobbies.filter((x) => x !== h) : [...profile.hobbies, h])}
                    className={`flex min-h-11 min-w-0 items-center gap-2.5 border-2 border-dark px-2.5 py-2 text-left text-[13px] font-semibold leading-tight transition-[transform,box-shadow,background-color,color] duration-150 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                      on ? "bg-[#FFF3C4] text-dark shadow-[3px_3px_0_#7A1B2E]" : "bg-white text-dark/80 shadow-[2px_2px_0_#1A1A1A] hover:bg-paper"
                    }`}
                  >
                    <span className={`grid h-5 w-5 shrink-0 place-items-center border-2 border-dark transition-colors ${on ? "bg-maroon text-white" : "bg-white"}`}>
                      {on && <Check className="h-3 w-3" strokeWidth={4} />}
                    </span>
                    <span className="min-w-0 [overflow-wrap:anywhere]">{h}</span>
                  </button>
                );
              })}
            </div>
            <p className={`${FONT_MONO} mt-3 text-[11px] text-dark/50`}>{profile.hobbies.length} dipilih</p>
          </FormCard>

          {/* Bar simpan: menempel di bawah layar (di atas tab bar pada mobile) */}
          <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-40 border-t-[3px] border-dark bg-white/95 px-4 py-3 backdrop-blur md:sticky md:bottom-4 md:mx-0 md:border-[3px] md:shadow-[5px_5px_0_#1A1A1A]">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <span className={`${FONT_MONO} flex items-center gap-2 text-xs ${dirty ? "text-maroon" : "text-dark/50"}`} role="status">
                <span className={`h-2 w-2 ${dirty ? "bg-maroon" : "bg-green-600"}`} />
                {saving ? "Menyimpan..." : dirty ? "Ada perubahan belum disimpan" : "Semua tersimpan"}
              </span>
              <button
                type="submit"
                disabled={saving || !dirty}
                className="inline-flex min-h-11 min-w-[130px] items-center justify-center gap-2 border-[3px] border-dark bg-maroon px-6 py-2.5 font-display text-sm font-black uppercase tracking-[.08em] text-white shadow-[4px_4px_0_#1A1A1A] transition-[transform,box-shadow,background-color,opacity] hover:bg-hot active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
              >
                {saving && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Panel pilih karakter ── */}
      <SideSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        label="Pilih karakter"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="border-[3px] border-dark bg-white px-5 py-2.5 font-display text-sm font-black uppercase tracking-wide text-dark shadow-[3px_3px_0_#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => { setAvatarId(pickId); setAvatarBg(pickBg); setPickerOpen(false); }}
              className="border-[3px] border-dark bg-maroon px-5 py-2.5 font-display text-sm font-black uppercase tracking-wide text-white shadow-[3px_3px_0_#1A1A1A] transition-colors hover:bg-hot active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              Pakai
            </button>
          </div>
        }
      >
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <PixelAvatar id={pickId} bg={pickBg} className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-dark shadow-[5px_5px_0_#7A1B2E]" />
            <div>
              <b className={`${FONT_DISPLAY} block text-2xl font-black uppercase leading-none text-dark`}>{avatarById(pickId).name}</b>
              <span className={`${FONT_MONO} mt-1 block text-xs text-dark/60`}>
                No. {String(AVATARS.findIndex((a) => a.id === pickId) + 1).padStart(2, "0")} / {String(AVATARS.length).padStart(2, "0")}
              </span>
            </div>
          </div>

          <p className="kg-lbl mt-8">Latar</p>
          <div className="flex flex-wrap gap-2.5">
            {AVATAR_BG.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Warna latar ${c}`}
                aria-pressed={pickBg === c}
                onClick={() => setPickBg(c)}
                style={{ background: c }}
                className={`grid h-10 w-10 place-items-center border-[3px] border-dark transition-[transform,box-shadow] ${pickBg === c ? "-translate-x-0.5 -translate-y-0.5 shadow-[3px_3px_0_#7A1B2E]" : "hover:-translate-y-0.5"}`}
              >
                {pickBg === c && <Check className="h-4 w-4 text-dark" strokeWidth={3.5} />}
              </button>
            ))}
          </div>

          <p className="kg-lbl mt-7">Karakter</p>
          <div className="grid grid-cols-3 gap-3 pb-2 sm:grid-cols-4">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={pickId === a.id}
                onClick={() => setPickId(a.id)}
                className={`relative flex flex-col border-[3px] border-dark text-left transition-[transform,box-shadow] ${
                  pickId === a.id
                    ? "-translate-x-0.5 -translate-y-0.5 bg-maroon text-white shadow-[4px_4px_0_#1A1A1A]"
                    : "bg-white text-dark shadow-[2px_2px_0_#1A1A1A] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1A1A1A]"
                }`}
              >
                <span className="block aspect-square w-full overflow-hidden border-b-[3px] border-dark" style={{ background: pickBg }}>
                  <PixelAvatar id={a.id} bg={pickBg} className="h-full w-full" />
                </span>
                <span className="truncate px-1.5 py-1 text-center font-mono text-[10px] font-semibold uppercase tracking-wide">{a.name}</span>
              </button>
            ))}
          </div>
        </div>
      </SideSheet>
    </div>
  );
}

// ── Komponen kecil form ──
const INPUT =
  "w-full border-2 border-dark bg-white px-3 py-2.5 text-sm text-dark placeholder-dark/40 transition-shadow focus:shadow-[4px_4px_0_#7A1B2E] focus:outline-none";
const INPUT_LOCKED =
  "w-full cursor-not-allowed border-2 border-dashed border-dark/30 bg-[#EFECE5] px-3 py-2.5 font-mono text-sm text-dark/60";

function FormCard({ no, title, hint, children }: { no: string; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="border-[3px] border-dark bg-[#FFFDF7] shadow-[5px_5px_0_#1A1A1A]">
      <header className="flex items-center gap-3 border-b-[3px] border-dark bg-[#FFF3C4] px-4 py-2.5">
        <b className="grid h-7 w-7 shrink-0 place-items-center border-2 border-dark bg-maroon font-display text-xs font-black text-white">{no}</b>
        <h3 className={`${FONT_DISPLAY} text-base font-black uppercase tracking-wide text-dark`}>{title}</h3>
      </header>
      <div className="p-4 sm:p-5">
        <p className="mb-4 text-xs text-dark/60">{hint}</p>
        {children}
      </div>
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className={`${FONT_MONO} mb-1.5 block text-[11px] font-semibold uppercase tracking-[.12em] text-dark/70`}>
        {label}
      </label>
      {children}
    </div>
  );
}
