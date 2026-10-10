export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="skeleton h-11 w-56" />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="skeleton h-28 w-full" />
        <div className="skeleton h-28 w-full" />
        <div className="skeleton h-28 w-full" />
      </div>
      <div className="skeleton mt-6 h-64 w-full" />
    </div>
  );
}
