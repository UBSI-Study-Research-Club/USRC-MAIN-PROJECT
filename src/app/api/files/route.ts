import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadDocumentToTelegram, saveFileRow } from '@/lib/files/upload'

// ponytail: 4MB ceiling — Vercel serverless caps request body at ~4.5MB.
// Upgrade path: self-host Local Bot API (upload 2GB) + raise this constant.
const MAX_SIZE = 4 * 1024 * 1024

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'file wajib ada' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'ukuran maksimal 4MB' }, { status: 413 })

  const doc = await uploadDocumentToTelegram(file, file.name, file.type || 'application/octet-stream')
  if (!doc) return NextResponse.json({ error: 'gagal mengunggah ke penyimpanan telegram' }, { status: 502 })

  const data = await saveFileRow(supabase, user.id, doc, file.name, doc.mime_type ?? file.type ?? 'application/octet-stream', doc.file_size ?? file.size)
  if (!data) return NextResponse.json({ error: 'gagal menyimpan file' }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
