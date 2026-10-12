"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User, Save, BadgeCheck } from "lucide-react";

interface Profile {
  full_name: string;
  nim: string;
  prodi: string;
  role: string;
  instagram: string;
  github: string;
  behance: string;
  linkedin: string;
}

// Sosmed pembuat (Gelombang B) — tampil sebagai chip di detail karya.
const SOCIAL_FIELDS: { key: keyof Pick<Profile, "instagram" | "github" | "behance" | "linkedin">; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "instagram.com/username" },
  { key: "github", label: "GitHub", placeholder: "github.com/username" },
  { key: "behance", label: "Behance", placeholder: "behance.net/username" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/username" },
];

const PRODI_OPTIONS = ["Informatika", "Sistem Informasi", "SI Akuntansi"];

const FONT_DISPLAY = "font-[family-name:var(--font-outfit)]";
const FONT_MONO = "font-[family-name:var(--font-ibm-plex-mono)]";

export default function ProfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        .select("full_name, nim, prodi, role, instagram, github, behance, linkedin")
        .eq("id", user.id)
        .single();
      setProfile(
        data
          ? {
              full_name: data.full_name ?? "",
              nim: data.nim ?? "-",
              prodi: data.prodi ?? "Informatika",
              role: data.role ?? "anggota",
              // Sosmed bisa null di DB — ratakan ke string kosong biar
              // .trim() di handleSave gak crash (bug tombol Simpan nyangkut).
              instagram: data.instagram ?? "",
              github: data.github ?? "",
              behance: data.behance ?? "",
              linkedin: data.linkedin ?? "",
            }
          : {
              full_name: "", nim: "-", prodi: "Informatika", role: "anggota",
              instagram: "", github: "", behance: "", linkedin: "",
            }
      );
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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError("Sesi habis — coba login ulang.");
      return;
    }
    const safe = (v: string | null | undefined) => (v ?? "").trim() || null;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name.trim(),
        prodi: profile.prodi,
        instagram: safe(profile.instagram),
        github: safe(profile.github),
        behance: safe(profile.behance),
        linkedin: safe(profile.linkedin),
      })
      .eq("id", user.id);
    setSaving(false);

    if (updateError) {
      setError("Gagal menyimpan. Coba lagi.");
      return;
    }
    setMessage("Profil berhasil disimpan.");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton mt-6 h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      {/* PROFIL SECTION */}
      <div>
        {/* Heading */}
        <div className="mb-6 flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center border-2 border-dark bg-maroon shadow-[3px_3px_0_var(--color-dark)]`}>
            <User className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className={`${FONT_DISPLAY} text-3xl font-black uppercase tracking-tight text-dark`}>
              Profil <span className="text-maroon">Saya</span>
            </h1>
            <p className={`${FONT_MONO} text-xs uppercase tracking-wider text-dark/60`}>
              // data keanggotaan
            </p>
          </div>
        </div>

        {message && (
          <div className="mb-4 flex items-center gap-2 border-2 border-dark bg-[#DFF5E1] px-4 py-3 shadow-[3px_3px_0_var(--color-dark)]">
            <BadgeCheck className="h-4 w-4 text-green-700" strokeWidth={2.5} />
            <p className={`${FONT_MONO} text-sm text-dark`}>{message}</p>
          </div>
        )}
        {error && (
          <div className="mb-4 border-2 border-dark bg-[#F8D7DA] px-4 py-3 shadow-[3px_3px_0_var(--color-dark)]">
            <p className={`${FONT_MONO} text-sm text-dark`}>{error}</p>
          </div>
        )}

        {/* Card */}
        <form
          onSubmit={handleSave}
          className="fade-up border-2 border-dark bg-white p-6 shadow-[6px_6px_0_var(--color-maroon)] md:p-8"
        >
          {/* Read-only identity */}
          <div className="mb-6 grid grid-cols-2 gap-4 border-b-2 border-dashed border-dark/30 pb-6">
            <div>
              <label className={`${FONT_MONO} mb-1 block text-[11px] uppercase tracking-wider text-dark/60`}>
                NIM (tetap)
              </label>
              <p className="border-2 border-dark/20 bg-paper px-3 py-2.5 font-mono text-sm text-dark/70">
                {profile?.nim || "-"}
              </p>
            </div>
            <div>
              <label className={`${FONT_MONO} mb-1 block text-[11px] uppercase tracking-wider text-dark/60`}>
                Email (tetap)
              </label>
              <p className="truncate border-2 border-dark/20 bg-paper px-3 py-2.5 font-mono text-sm text-dark/70">
                {email}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className={`${FONT_DISPLAY} mb-1.5 block text-sm font-bold uppercase text-dark`}>
                Nama Lengkap
              </label>
              <input
                type="text"
                value={profile?.full_name || ""}
                onChange={(e) =>
                  setProfile((p) => (p ? { ...p, full_name: e.target.value } : p))
                }
                placeholder="Nama lengkap kamu"
                className="w-full border-2 border-dark bg-white px-4 py-3 font-mono text-sm text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-maroon"
              />
            </div>

            <div>
              <label className={`${FONT_DISPLAY} mb-1.5 block text-sm font-bold uppercase text-dark`}>
                Program Studi
              </label>
              <select
                value={profile?.prodi || "Informatika"}
                onChange={(e) =>
                  setProfile((p) => (p ? { ...p, prodi: e.target.value } : p))
                }
                className="w-full border-2 border-dark bg-white px-4 py-3 font-mono text-sm text-dark focus:outline-none focus:ring-2 focus:ring-maroon"
              >
                {PRODI_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`${FONT_DISPLAY} mb-1.5 block text-sm font-bold uppercase text-dark`}>
                Sosmed
              </label>
              <p className={`${FONT_MONO} mb-3 text-[11px] text-dark/50`}>
                // ikut tampil di karya yang kamu buat — opsional
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SOCIAL_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className={`${FONT_MONO} mb-1 block text-[11px] uppercase tracking-wider text-dark/60`}>
                      {f.label}
                    </label>
                    <input
                      type="text"
                      value={profile?.[f.key] || ""}
                      onChange={(e) =>
                        setProfile((p) => (p ? { ...p, [f.key]: e.target.value } : p))
                      }
                      placeholder={f.placeholder}
                      className="w-full border-2 border-dark bg-white px-4 py-3 font-mono text-sm text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-maroon"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t-2 border-dashed border-dark/30 pt-5">
              <span className={`${FONT_MONO} border-2 border-dark bg-[#FFF3C4] px-3 py-1 text-xs font-bold uppercase tracking-widest text-dark`}>
                role: {profile?.role || "anggota"}
              </span>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-11 items-center gap-2 border-2 border-dark bg-maroon px-6 py-2.5 font-display text-sm font-extrabold uppercase tracking-wider text-white shadow-[4px_4px_0px_var(--color-dark)] transition-all hover:bg-hot active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50"
              >
                <Save className="h-4 w-4" strokeWidth={2.5} />
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
