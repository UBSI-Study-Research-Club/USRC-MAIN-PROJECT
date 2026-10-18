import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const tg = new FormData()
  tg.append('chat_id', process.env.TELEGRAM_STORAGE_CHAT_ID!)
  tg.append('document', file, file.name)

  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`,
    { method: 'POST', body: tg }
  )
  const json = await res.json()
  if (!json.ok) {
    console.error('telegram sendDocument failed:', json.description)
    return NextResponse.json({ error: 'gagal mengunggah ke penyimpanan telegram' }, { status: 502 })
  }

  const doc = json.result.document
  const { data, error } = await supabase
    .from('files')
    .insert({
      owner_id: user.id,
      telegram_file_id: doc.file_id,
      telegram_unique_id: doc.file_unique_id,
      name: file.name,
      mime: doc.mime_type ?? file.type ?? 'application/octet-stream',
      size: doc.file_size ?? file.size,
    })
    .select('id, name, size')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
