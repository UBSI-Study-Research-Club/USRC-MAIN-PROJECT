import Link from "next/link";
import Image from "next/image";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* ── Navbar (Neobrutalist) ────────────────── */}
      <header className="sticky top-0 z-50 p-4 md:p-6 bg-paper/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between border-[3px] border-dark bg-white px-6 py-4 neo-shadow transition-all">
          
          {/* Logo (Custom graphic matching mockup) */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 rotate-[-3deg] items-center justify-center border-[3px] border-dark bg-white overflow-hidden p-0.5">
              <Image src="/logo-usrc-main.jpeg" alt="USRC Logo" width={40} height={40} className="h-full w-full object-contain" />
            </div>
            <span className="font-[family-name:var(--font-outfit)] text-2xl font-black uppercase tracking-tight text-dark">
              USRC
            </span>
          </Link>

          {/* Nav Links (Desktop) */}
          <div className="hidden items-center gap-2.5 md:flex">
            <Link
              href="/#tentang"
              className="flex items-center gap-1.5 border-2 border-dark bg-white px-3 py-1.5 font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold uppercase tracking-wider text-dark shadow-[2px_2px_0px_var(--color-dark)] transition-all hover:-translate-y-0.5 hover:bg-[#FFF3C4] hover:shadow-[4px_4px_0px_var(--color-dark)]"
            >
              <span className="font-black text-maroon">01</span>
              <span>Tentang</span>
            </Link>
            <Link
              href="/#sesi"
              className="flex items-center gap-1.5 border-2 border-dark bg-white px-3 py-1.5 font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold uppercase tracking-wider text-dark shadow-[2px_2px_0px_var(--color-dark)] transition-all hover:-translate-y-0.5 hover:bg-[#FFF3C4] hover:shadow-[4px_4px_0px_var(--color-dark)]"
            >
              <span className="font-black text-maroon">02</span>
              <span>Sesi</span>
            </Link>
            <Link
              href="/#project"
              className="flex items-center gap-1.5 border-2 border-dark bg-white px-3 py-1.5 font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold uppercase tracking-wider text-dark shadow-[2px_2px_0px_var(--color-dark)] transition-all hover:-translate-y-0.5 hover:bg-[#FFF3C4] hover:shadow-[4px_4px_0px_var(--color-dark)]"
            >
              <span className="font-black text-maroon">03</span>
              <span>Project</span>
            </Link>
          </div>

          {/* CTA */}
          <Link
            href="/daftar"
            className="border-[3px] border-dark bg-maroon px-6 py-2.5 font-[family-name:var(--font-outfit)] text-base font-black uppercase tracking-wider text-white neo-shadow transition-transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
          >
            DAFTAR
          </Link>
        </nav>
      </header>

      {/* ── Content ─────────────────────────────────── */}
      <main className="flex-1 overflow-x-hidden">{children}</main>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="border-t-[3px] border-dark bg-dark text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="flex h-8 w-8 rotate-[-3deg] items-center justify-center border-2 border-white bg-white overflow-hidden p-0.5">
              <Image src="/logo-usrc-main.jpeg" alt="USRC Logo" width={32} height={32} className="h-full w-full object-contain" />
            </div>
            <span className="font-[family-name:var(--font-outfit)] text-xl font-black uppercase text-white">USRC</span>
          </div>
          <p className="font-[family-name:var(--font-ibm-plex-mono)] text-xs text-white/60">
            // EST. 2026 · UBSI Study &amp; Research Club — Pontianak
          </p>
        </div>
      </footer>
    </>
  );
}
