"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User, Save, BadgeCheck } from "lucide-react";
import { PixelCharacter, type PixelCharacterConfig } from "@/components/pixel/PixelCharacter";

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

// Kolom pixel asli di tabel profiles (sql-phase3-final.sql)
const PIXEL_COLUMNS = "pixel_body, pixel_hair, pixel_hair_color, pixel_face, pixel_clothing, pixel_accessories, pixel_updated_at";

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 1 minggu — ganti karakter max seminggu sekali

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
  const [pixelConfig, setPixelConfig] = useState<PixelCharacterConfig>({});
  const [loadedPixelJson, setLoadedPixelJson] = useState("{}");
  const [pixelUpdatedAt, setPixelUpdatedAt] = useState<string | null>(null);
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
        .select(`full_name, nim, prodi, role, instagram, github, behance, linkedin, ${PIXEL_COLUMNS}`)
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
            }
          : {
              full_name: "", nim: "-", prodi: "Informatika", role: "anggota",
              instagram: "", github: "", behance: "", linkedin: "",
            }
      );
      if (data) {
        // Kolom flat DB -> bentuk config komponen PixelCharacter
        const cfg: PixelCharacterConfig = {
          skin: (data.pixel_body as PixelCharacterConfig["skin"]) || "medium",
          hair: {
            style: (data.pixel_hair as any) || "short",
            color: (data.pixel_hair_color as any) || "black",
          },
          clothing: (data.pixel_clothing as PixelCharacterConfig["clothing"]) || "hoodie",
          accessory: (data.pixel_accessories as PixelCharacterConfig["accessory"]) || "none",
        };
        setPixelConfig(cfg);
        setLoadedPixelJson(JSON.stringify(cfg));
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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError("Sesi habis — coba login ulang.");
      return;
    }
    const safe = (v: string | null | undefined) => (v ?? "").trim() || null;
    // Cooldown 1 minggu: pixel_updated_at cuma di-reset kalau konfigurasi pixel benar2 berubah
    const pixelChanged = JSON.stringify(pixelConfig) !== loadedPixelJson;
    const pixelUpdate: Record<string, unknown> = pixelChanged
      ? {
          pixel_body: pixelConfig.skin || "medium",
          pixel_hair: pixelConfig.hair?.style || "short",
          pixel_hair_color: pixelConfig.hair?.color || "black",
          pixel_clothing: pixelConfig.clothing || "hoodie",
          pixel_accessories: pixelConfig.accessory || "none",
          pixel_updated_at: new Date().toISOString(),
        }
      : {};
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name.trim(),
        prodi: profile.prodi,
        instagram: safe(profile.instagram),
        github: safe(profile.github),
        behance: safe(profile.behance),
        linkedin: safe(profile.linkedin),
        ...pixelUpdate,
      })
      .eq("id", user.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message || "Gagal menyimpan profil.");
    } else {
      setMessage("Profil berhasil disimpan! ✓");
    }
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

        {/* Pixel Character Avatar */}
        <div className="mb-8 rounded border-2 border-dark bg-white p-6 shadow-[4px_4px_0_var(--color-maroon)]">
          <h2 className={`${FONT_DISPLAY} mb-4 text-lg font-black uppercase text-dark`}>
            Avatar Pixel Saya
          </h2>
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            {/* Preview */}
            <div className="flex items-center justify-center">
              <PixelCharacter config={pixelConfig} />
            </div>

            {/* Customizer — terkunci 1x per minggu sesuai spek */}
            <fieldset
              disabled={pixelUpdatedAt ? Date.now() - new Date(pixelUpdatedAt).getTime() < COOLDOWN_MS : false}
              className="flex-1 space-y-3 disabled:opacity-60"
            >
              <div>
                <label className={`${FONT_MONO} mb-1 block text-[11px] uppercase tracking-wider text-dark/60`}>
                  Warna Kulit
                </label>
                <select
                  value={pixelConfig.skin || "medium"}
                  onChange={(e) => setPixelConfig({ ...pixelConfig, skin: e.target.value as any })}
                  className="w-full border-2 border-dark bg-white px-3 py-2 font-mono text-xs text-dark focus:outline-none focus:ring-2 focus:ring-maroon"
                >
                  <option value="light">Terang</option>
                  <option value="medium">Sawo Matang</option>
                  <option value="dark">Gelap</option>
                </select>
              </div>

              <div>
                <label className={`${FONT_MONO} mb-1 block text-[11px] uppercase tracking-wider text-dark/60`}>
                  Gaya Rambut
                </label>
                <select
                  value={pixelConfig.hair?.style || "short"}
                  onChange={(e) => setPixelConfig({
                    ...pixelConfig,
                    hair: { style: e.target.value as any, color: pixelConfig.hair?.color || 'black' }
                  })}
                  className="w-full border-2 border-dark bg-white px-3 py-2 font-mono text-xs text-dark focus:outline-none focus:ring-2 focus:ring-maroon"
                >
                  <option value="short">Pendek</option>
                  <option value="long">Panjang</option>
                  <option value="curly">Curly</option>
                  <option value="bob">Bob</option>
                </select>
              </div>

              <div>
                <label className={`${FONT_MONO} mb-1 block text-[11px] uppercase tracking-wider text-dark/60`}>
                  Warna Rambut
                </label>
                <select
                  value={pixelConfig.hair?.color || "black"}
                  onChange={(e) => setPixelConfig({
                    ...pixelConfig,
                    hair: { style: pixelConfig.hair?.style || 'short', color: e.target.value as any }
                  })}
                  className="w-full border-2 border-dark bg-white px-3 py-2 font-mono text-xs text-dark focus:outline-none focus:ring-2 focus:ring-maroon"
                >
                  <option value="black">Hitam</option>
                  <option value="brown">Coklat</option>
                  <option value="blonde">Blonde</option>
                  <option value="red">Merah</option>
                </select>
              </div>

              <div>
                <label className={`${FONT_MONO} mb-1 block text-[11px] uppercase tracking-wider text-dark/60`}>
                  Baju
                </label>
                <select
                  value={pixelConfig.clothing || "hoodie"}
                  onChange={(e) => setPixelConfig({ ...pixelConfig, clothing: e.target.value as any })}
                  className="w-full border-2 border-dark bg-white px-3 py-2 font-mono text-xs text-dark focus:outline-none focus:ring-2 focus:ring-maroon"
                >
                  <option value="hoodie">Hoodie USRC</option>
                  <option value="casual">Casual</option>
                  <option value="tshirt">T-Shirt</option>
                  <option value="jacket">Jacket</option>
                </select>
              </div>

              <div>
                <label className={`${FONT_MONO} mb-1 block text-[11px] uppercase tracking-wider text-dark/60`}>
                  Aksesoris
                </label>
                <select
                  value={pixelConfig.accessory || "none"}
                  onChange={(e) => setPixelConfig({ ...pixelConfig, accessory: e.target.value as any })}
                  className="w-full border-2 border-dark bg-white px-3 py-2 font-mono text-xs text-dark focus:outline-none focus:ring-2 focus:ring-maroon"
                >
                  <option value="none">Tidak Ada</option>
                  <option value="cap">Topi</option>
                  <option value="glasses">Kacamata</option>
                  <option value="headset">Headset</option>
                  <option value="headband">Headband</option>
                </select>
              </div>

              <p className={`${FONT_MONO} text-[10px] text-dark/50`}>
                {pixelUpdatedAt && Date.now() - new Date(pixelUpdatedAt).getTime() < COOLDOWN_MS
                  ? `// Karakter terkunci — bisa ganti lagi ${new Date(
                      new Date(pixelUpdatedAt).getTime() + COOLDOWN_MS
                    ).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`
                  : "// Ubah 1x per minggu"}
              </p>
            </fieldset>
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
