import Link from "next/link";
import Image from "next/image";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* ── Navbar ──────────────────────────────────── */}
      <header className="glass sticky top-0 z-50 border-b-2 border-dark/10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo-usrc.svg"
              alt="USRC"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="font-[family-name:var(--font-outfit)] text-lg font-extrabold uppercase tracking-wide text-maroon">
              USRC
            </span>
          </Link>
          <Link
            href="/daftar"
            className="border-2 border-dark bg-maroon px-4 py-1.5 font-[family-name:var(--font-outfit)] text-sm font-bold uppercase tracking-wider text-white neo-shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          >
            Gabung
          </Link>
        </nav>
      </header>

      {/* ── Content ─────────────────────────────────── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="border-t-2 border-dark/10 bg-dark text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center">
          <p className="font-[family-name:var(--font-ibm-plex-mono)] text-xs text-white/60">
            // EST. 2026 · UBSI Study &amp; Research Club — Pontianak
          </p>
        </div>
      </footer>
    </>
  );
}
