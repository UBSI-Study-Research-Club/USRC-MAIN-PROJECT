// Shared: unggah dokumen ke Telegram Datacenter + simpan baris file.
// Dipakai POST /api/files (upload anggota) dan pipeline cover karya (og:image).

export type TgDoc = {
  file_id: string
  file_unique_id: string
  mime_type?: string
  file_size?: number
}

/**
 * Kirim file ke chat penyimpanan (TELEGRAM_STORAGE_CHAT_ID).
 * Return dokumen Telegram (file_id dll.) atau null kalau gagal.
 */
export async function uploadDocumentToTelegram(
  bytes: Blob,
  name: string,
  _mime?: string
): Promise<TgDoc | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_STORAGE_CHAT_ID
  if (!token || !chatId) {
    console.error('telegram storage env kurang (TELEGRAM_BOT_TOKEN / TELEGRAM_STORAGE_CHAT_ID)')
    return null
  }

  const tg = new FormData()
  tg.append('chat_id', chatId)
  tg.append('document', bytes, name)

  const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: 'POST',
    body: tg,
  })
  const json = await res.json().catch(() => ({ ok: false }))
  if (!json.ok) {
    console.error('telegram sendDocument failed:', json.description)
    return null
  }
  // Telegram membungkus dokumen di result.document
  return json.result.document ?? null
}

/** Simpan metadata file ke tabel `files`, balikan id untuk dipakai /api/files/<id>. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveFileRow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  ownerId: string,
  doc: TgDoc,
  name: string,
  mime: string,
  size: number
): Promise<{ id: string; name: string; size: number } | null> {
  const { data, error } = await supabase
    .from('files')
    .insert({
      owner_id: ownerId,
      telegram_file_id: doc.file_id,
      telegram_unique_id: doc.file_unique_id,
      name,
      mime,
      size,
    })
    .select('id, name, size')
    .single()
  if (error) {
    console.error('gagal simpan baris files:', error.message)
    return null
  }
  return data
}

/** URL publik untuk menampilkan file yang sudah tersimpan. */
export function fileUrl(fileId: string): string {
  return `/api/files/${fileId}`
}
