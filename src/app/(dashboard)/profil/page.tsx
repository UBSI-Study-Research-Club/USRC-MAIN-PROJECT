"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User, Save, BadgeCheck, Trash2, Plus } from "lucide-react";

interface Profile {
  full_name: string;
  nim: string;
  prodi: string;
  role: string;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  repo_url: string | null;
  live_url: string | null;
  status: string;
}

interface NewProjectForm {
  title: string;
  description: string;
  category: string;
  image_url: string;
  repo_url: string;
  live_url: string;
}

const PRODI_OPTIONS = ["Informatika", "Sistem Informasi", "SI Akuntansi"];
const PROJECT_CATEGORIES = ["Web", "Mobile", "Desktop", "IoT", "Data Science", "Game", "AI/ML", "Other"];

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

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [submittingProject, setSubmittingProject] = useState(false);
  const [projectForm, setProjectForm] = useState<NewProjectForm>({
    title: "",
    description: "",
    category: "Web",
    image_url: "",
    repo_url: "",
    live_url: "",
  });

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
        .select("full_name, nim, prodi, role")
        .eq("id", user.id)
        .single();
      setProfile(
        data || { full_name: "", nim: "-", prodi: "Informatika", role: "anggota" }
      );

      // Load projects
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      setProjects(projectsData || []);
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
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name.trim(),
        prodi: profile.prodi,
      })
      .eq("id", user!.id);
    setSaving(false);

    if (updateError) {
      setError("Gagal menyimpan. Coba lagi.");
      return;
    }
    setMessage("Profil berhasil disimpan.");
    router.refresh();
  }

  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projectForm.title.trim()) {
      setError("Judul karya tidak boleh kosong.");
      return;
    }

    setError(null);
    setMessage(null);
    setSubmittingProject(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error: insertError } = await supabase
      .from("projects")
      .insert([
        {
          user_id: user!.id,
          title: projectForm.title.trim(),
          description: projectForm.description.trim() || null,
          category: projectForm.category,
          image_url: projectForm.image_url.trim() || null,
          repo_url: projectForm.repo_url.trim() || null,
          live_url: projectForm.live_url.trim() || null,
          status: "pending",
        },
      ])
      .select();

    setSubmittingProject(false);

    if (insertError) {
      setError("Gagal menambah karya. Coba lagi.");
      return;
    }

    if (data && data.length > 0) {
      setProjects([data[0], ...projects]);
      setProjectForm({
        title: "",
        description: "",
        category: "Web",
        image_url: "",
        repo_url: "",
        live_url: "",
      });
      setShowProjectForm(false);
      setMessage("Karya ditambahkan. Menunggu persetujuan admin.");
    }
  }

  async function handleDeleteProject(projectId: string) {
    if (!confirm("Hapus karya ini?")) return;

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (deleteError) {
      setError("Gagal menghapus karya.");
      return;
    }

    setProjects(projects.filter((p) => p.id !== projectId));
    setMessage("Karya berhasil dihapus.");
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

      {/* KARYA SECTION */}
      <div>
        {/* Heading */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className={`${FONT_DISPLAY} text-3xl font-black uppercase tracking-tight text-dark`}>
              Karya <span className="text-maroon">Saya</span>
            </h2>
            <p className={`${FONT_MONO} text-xs uppercase tracking-wider text-dark/60`}>
              // project, portfolio, riset
            </p>
          </div>
          <button
            onClick={() => setShowProjectForm(!showProjectForm)}
            className={`inline-flex items-center gap-2 border-2 border-dark bg-maroon px-4 py-2 text-sm font-bold uppercase text-white shadow-[3px_3px_0_var(--color-dark)] transition-all hover:bg-hot active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Tambah Karya
          </button>
        </div>

        {/* Form */}
        {showProjectForm && (
          <form
            onSubmit={handleAddProject}
            className="mb-8 border-2 border-dark bg-white p-6 shadow-[6px_6px_0_var(--color-maroon)]"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={`${FONT_DISPLAY} mb-1.5 block text-sm font-bold uppercase text-dark`}>
                  Judul Karya*
                </label>
                <input
                  type="text"
                  value={projectForm.title}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, title: e.target.value })
                  }
                  placeholder="e.g., Website E-Commerce"
                  className="w-full border-2 border-dark bg-white px-4 py-2.5 font-mono text-sm text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-maroon"
                />
              </div>

              <div>
                <label className={`${FONT_DISPLAY} mb-1.5 block text-sm font-bold uppercase text-dark`}>
                  Kategori
                </label>
                <select
                  value={projectForm.category}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, category: e.target.value })
                  }
                  className="w-full border-2 border-dark bg-white px-4 py-2.5 font-mono text-sm text-dark focus:outline-none focus:ring-2 focus:ring-maroon"
                >
                  {PROJECT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={`${FONT_DISPLAY} mb-1.5 block text-sm font-bold uppercase text-dark`}>
                  Deskripsi
                </label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, description: e.target.value })
                  }
                  placeholder="Jelaskan tentang karya ini..."
                  rows={3}
                  className="w-full border-2 border-dark bg-white px-4 py-2.5 font-mono text-sm text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-maroon"
                />
              </div>

              <div>
                <label className={`${FONT_DISPLAY} mb-1.5 block text-sm font-bold uppercase text-dark`}>
                  URL Gambar
                </label>
                <input
                  type="url"
                  value={projectForm.image_url}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, image_url: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full border-2 border-dark bg-white px-4 py-2.5 font-mono text-sm text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-maroon"
                />
              </div>

              <div>
                <label className={`${FONT_DISPLAY} mb-1.5 block text-sm font-bold uppercase text-dark`}>
                  Kategori
                </label>
                <input
                  type="url"
                  value={projectForm.category}
                  disabled
                  className="w-full border-2 border-dark bg-paper px-4 py-2.5 font-mono text-sm text-dark/50"
                />
              </div>

              <div>
                <label className={`${FONT_DISPLAY} mb-1.5 block text-sm font-bold uppercase text-dark`}>
                  URL Repository
                </label>
                <input
                  type="url"
                  value={projectForm.repo_url}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, repo_url: e.target.value })
                  }
                  placeholder="https://github.com/..."
                  className="w-full border-2 border-dark bg-white px-4 py-2.5 font-mono text-sm text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-maroon"
                />
              </div>

              <div>
                <label className={`${FONT_DISPLAY} mb-1.5 block text-sm font-bold uppercase text-dark`}>
                  URL Live Demo
                </label>
                <input
                  type="url"
                  value={projectForm.live_url}
                  onChange={(e) =>
                    setProjectForm({ ...projectForm, live_url: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full border-2 border-dark bg-white px-4 py-2.5 font-mono text-sm text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-maroon"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={submittingProject}
                className="inline-flex items-center gap-2 border-2 border-dark bg-maroon px-6 py-2 text-sm font-bold uppercase text-white shadow-[3px_3px_0_var(--color-dark)] transition-all hover:bg-hot active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
              >
                <Save className="h-4 w-4" strokeWidth={2.5} />
                {submittingProject ? "Menyimpan..." : "Simpan Karya"}
              </button>
              <button
                type="button"
                onClick={() => setShowProjectForm(false)}
                className="inline-flex items-center border-2 border-dark bg-paper px-6 py-2 text-sm font-bold uppercase text-dark shadow-[3px_3px_0_var(--color-dark)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Batal
              </button>
            </div>
          </form>
        )}

        {/* Projects List */}
        {projects.length === 0 ? (
          <p className={`${FONT_MONO} text-sm text-dark/50`}>
            Belum ada karya. Tambahkan karya pertama kamu! →
          </p>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-start justify-between border-2 border-dark bg-white p-4 shadow-[4px_4px_0_var(--color-maroon)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`${FONT_DISPLAY} truncate text-lg font-black uppercase text-dark`}>
                      {project.title}
                    </h3>
                    <span
                      className={`${FONT_MONO} w-fit border-[1px] border-dark px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                        project.status === "pending"
                          ? "bg-[#FFF3C4] text-dark"
                          : "bg-[#D1E7DD] text-dark"
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>
                  {project.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-dark/70">
                      {project.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {project.category && (
                      <span className={`${FONT_MONO} text-xs text-dark/60`}>
                        {project.category}
                      </span>
                    )}
                    {project.repo_url && (
                      <a
                        href={project.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${FONT_MONO} text-xs text-maroon hover:underline`}
                      >
                        Repo
                      </a>
                    )}
                    {project.live_url && (
                      <a
                        href={project.live_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${FONT_MONO} text-xs text-maroon hover:underline`}
                      >
                        Live
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteProject(project.id)}
                  className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center border-2 border-dark bg-[#F8D7DA] hover:bg-[#E9616D]"
                  title="Hapus karya"
                >
                  <Trash2 className="h-4 w-4 text-dark" strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
