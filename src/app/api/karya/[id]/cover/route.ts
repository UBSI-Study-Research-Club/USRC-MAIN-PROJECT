import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateOgCover } from '@/lib/karya/ogCover'

// Admin only: ambil/isi cover karya secara otomatis dari URL karya (og:image).
// Karya yang sudah punya image_url akan di-skip oleh pipeline (idempotent).
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized', reason: 'unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'forbidden', reason: 'forbidden' }, { status: 403 })
    }

    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ ok: false, error: 'id tidak valid', reason: 'id tidak valid' }, { status: 400 })
    }

    const result = await generateOgCover(id, supabase, user.id)
    return NextResponse.json(result, { status: result.ok ? 200 : 422 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'terjadi kesalahan server'
    console.error('cover endpoint error:', err)
    return NextResponse.json({ ok: false, error: message, reason: message }, { status: 500 })
  }
}
