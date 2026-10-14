export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center bg-paper">
      <div className="flex flex-col items-center gap-3 border-[3px] border-dark bg-white p-6 neo-shadow">
        <div className="h-8 w-8 animate-spin rounded-none border-[3px] border-dark border-t-maroon" />
        <span className="font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold uppercase tracking-wider text-dark">
          // MEMUAT DASHBOARD...
        </span>
      </div>
    </div>
  );
}
