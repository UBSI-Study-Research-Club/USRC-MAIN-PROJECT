import { serveFile } from '@/lib/files/serve'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return serveFile(id, true)
}
