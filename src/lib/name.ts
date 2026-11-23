// Nama panggilan dari nama lengkap.
// Banyak nama diawali "Muhammad" (dan variasinya) — itu jarang jadi nama panggilan,
// jadi ambil kata berikutnya: "Muhamad Raffli Aldiansyah" → "Raffli".
const PREFIXES = new Set([
  'muhammad', 'muhamad', 'muhammed', 'mohammad', 'mohamad', 'mohammed', 'mohamed',
  'muhamed', 'muh', 'muh.', 'moh', 'moh.', 'moch', 'moch.', 'mochammad', 'mochamad',
  'm', 'm.', 'md', 'md.',
])

export function nickname(fullName: string | null | undefined, fallback = 'Anggota'): string {
  const words = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return fallback
  if (words.length > 1 && PREFIXES.has(words[0].toLowerCase())) return words[1]
  return words[0]
}
