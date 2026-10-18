import { createClient } from '@/lib/supabase/server'

// Telegram getFile download links stay valid for >=1h and cap at 20MB —
// fine for files uploaded through POST /api/files (4MB ceiling).
export async function serveFile(id: string, inline: boolean): Promise<Response> {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('files')
    .select('telegram_file_id, name, mime')
    .eq('id', id)
    .single()
  if (!row) return new Response('not found', { status: 404 })

  const token = process.env.TELEGRAM_BOT_TOKEN!
  const meta = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(row.telegram_file_id)}`
  )
  const metaJson = await meta.json()
  if (!metaJson.ok) {
    console.error('telegram getFile failed:', metaJson.description)
    return new Response('telegram error', { status: 502 })
  }

  const upstream = await fetch(
    `https://api.telegram.org/file/bot${token}/${metaJson.result.file_path}`
  )
  if (upstream.status === 404) {
    // File can lag a few seconds behind getFile on Telegram's download servers.
    await new Promise((r) => setTimeout(r, 2000))
    const retry = await fetch(
      `https://api.telegram.org/file/bot${token}/${metaJson.result.file_path}`
    )
    if (retry.ok && retry.body) return streamFile(retry, row, inline)
  }
  if (!upstream.ok || !upstream.body) return new Response('telegram error', { status: 502 })
  return streamFile(upstream, row, inline)
}

function streamFile(upstream: globalThis.Response, row: { name: string; mime: string }, inline: boolean): Response {
  const safeName = row.name.replace(/["\\\r\n]/g, '_')
  return new Response(upstream.body, {
    headers: {
      'Content-Type': row.mime,
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${safeName}"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
