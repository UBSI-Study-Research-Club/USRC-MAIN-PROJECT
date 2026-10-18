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

// URL PDF untuk dibuka inline di tab baru browser.
// File di gudang Telegram (/api/files/<id>) dibuka via /api/files/<id>/raw agar inline (bukan download attachment).
export function getPdfViewUrl(raw: string | null | undefined): string {
  const v = (raw ?? "").trim();
  if (!v) return "#";
  if (v.includes("/api/files/") && !v.endsWith("/raw")) {
    const rawUrl = v.replace(/\/api\/files\/([^/?#]+)/, "/api/files/$1/raw");
    return withHttps(rawUrl);
  }
  return withHttps(v);
}
