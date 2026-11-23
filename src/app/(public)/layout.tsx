import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import PublicHeader from "@/components/PublicHeader";
import { AppHeader } from "@/components/AppHeader";
import { PixelWordmark } from "@/components/PixelWordmark";
import { ArrowRight, ArrowUpRight } from "lucide-react";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Anggota yang sudah login memakai navbar yang sama dengan area dashboard.
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <>
      {profile ? (
        <AppHeader name={profile.full_name || user?.email || "Anggota"} role={profile.role || "anggota"} />
      ) : (
        <PublicHeader loggedIn={!!user} />
      )}

      {/* ── Content ─────────────────────────────────── */}
      <main className="flex-1 overflow-x-hidden">{children}</main>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="relative overflow-hidden border-t-[3px] border-dark bg-dark text-white">
        {/* Marquee band */}
        <div aria-hidden="true" className="pf-band border-b-[3px] border-dark bg-maroon py-2.5 font-[family-name:var(--font-outfit)] text-sm font-black uppercase tracking-[.18em] text-[#FFF3C4]">
          <span>
            {Array.from({ length: 4 }).flatMap((_, r) =>
              ["Study", "Research", "Build Project", "Kolaborasi Lintas Prodi", "UBSI Pontianak"].map((w) => (
                <span key={`${r}-${w}`} className="inline-flex items-center">
                  {w}
                  <span aria-hidden="true" className="mx-5 inline-block h-[3px] w-6 bg-pink align-middle" />
                </span>
              ))
            )}
          </span>
        </div>

        <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-6 pb-10 pt-14 md:grid-cols-12 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-5">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 rotate-[-3deg] items-center justify-center overflow-hidden border-2 border-white bg-white p-0.5 shadow-[3px_3px_0_var(--color-maroon)]">
                <Image src="/logo-usrc-main.jpeg" alt="USRC Logo" width={44} height={44} className="h-full w-full object-contain" />
              </div>
              <span className="font-[family-name:var(--font-outfit)] text-3xl font-black uppercase tracking-tight">USRC</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/65">
              UBSI Study &amp; Research Club — komunitas mahasiswa lintas prodi di UBSI Pontianak untuk belajar, meneliti, dan membangun karya nyata.
            </p>
            <Link
              href="/daftar"
              className="group mt-6 inline-flex items-center gap-2 border-2 border-white bg-[#FFF3C4] px-5 py-2.5 font-[family-name:var(--font-outfit)] text-sm font-black uppercase tracking-wider text-dark shadow-[4px_4px_0_var(--color-maroon)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--color-maroon)] active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              Gabung USRC
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
            </Link>
          </div>

          <FooterCol title="Jelajahi" links={[["Tentang", "/#tentang"], ["Sesi", "/#sesi"], ["Karya Terbaik", "/#karya"], ["Semua Karya", "/karya"]]} />
          <FooterCol title="Anggota" links={user ? [["Dashboard", "/dashboard"], ["Absensi", "/dashboard/absen"], ["Profil", "/profil"]] : [["Login", "/login"], ["Daftar", "/daftar"]]} />
          <div className="col-span-2 md:col-span-3">
            <p className="mb-4 font-[family-name:var(--font-ibm-plex-mono)] text-[11px] font-semibold uppercase tracking-[.2em] text-pink">Kampus</p>
            <p className="text-sm leading-relaxed text-white/80">Universitas Bina Sarana Informatika<br />Kampus Pontianak</p>
            <p className="mt-3 font-[family-name:var(--font-ibm-plex-mono)] text-xs leading-relaxed text-white/50">Informatika · Sistem Informasi · SI Akuntansi</p>
          </div>
        </div>

        {/* Wordmark pixel-art */}
        <div className="mx-auto max-w-7xl px-6 pb-10 pt-4">
          <PixelWordmark className="mx-auto block w-full max-w-5xl" />
        </div>

        <div className="relative border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 font-[family-name:var(--font-ibm-plex-mono)] text-[11px] uppercase tracking-wider text-white/45 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 USRC · UBSI Pontianak</span>
            <span>Dibangun oleh anggota, untuk anggota.</span>
          </div>
        </div>
      </footer>
      {(profile || !user) && <div aria-hidden="true" className="h-16 md:hidden" />}
    </>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="md:col-span-2">
      <p className="mb-4 font-[family-name:var(--font-ibm-plex-mono)] text-[11px] font-semibold uppercase tracking-[.2em] text-pink">{title}</p>
      <ul className="space-y-2.5">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 transition-colors hover:text-white">
              <span className="relative">
                {label}
                <span className="absolute -bottom-0.5 left-0 h-[2px] w-full origin-left scale-x-0 bg-[#FFF3C4] transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] group-hover:scale-x-100" />
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
