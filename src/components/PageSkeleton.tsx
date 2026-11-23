/* Kerangka halaman untuk loading.tsx.
   Tanpa loading boundary, Next.js tidak mem-prefetch rute dinamis sama sekali,
   jadi setiap klik menunggu server. Dengan kerangka ini, navigasi langsung
   pindah (kerangka sudah di-prefetch) lalu isi asli menggantikannya.
   Muncul dengan fade pendek supaya navigasi cepat tidak terasa berkedip. */
export function PageSkeleton() {
  return (
    <div className="animate-[fade-up_.25s_ease-out_.12s_both] space-y-8 py-2" aria-busy="true" aria-label="Memuat halaman">
      <div className="space-y-3">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-9 w-64 max-w-full md:h-11" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="skeleton h-40 w-full border-2 border-dark/10" />
          <div className="skeleton h-72 w-full border-2 border-dark/10" />
        </div>
        <div className="hidden space-y-6 lg:block">
          <div className="skeleton h-48 w-full border-2 border-dark/10" />
          <div className="skeleton h-40 w-full border-2 border-dark/10" />
        </div>
      </div>
    </div>
  );
}
