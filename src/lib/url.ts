// Lengkapi URL tanpa skema jadi https:// — buat SEMUA render link karya/sosmed.
// Data lama tersimpan tanpa prefix; tanpa ini href jadi relatif
// (vercel.app/instagram.com → 404).
export function withHttps(raw: string | null | undefined): string {
  const v = (raw ?? "").trim();
  if (!v) return "#";
  // URL relatif (mis. /api/files/<id> dari gudang Telegram) pakai apa adanya.
  if (v.startsWith("/")) return v;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}
