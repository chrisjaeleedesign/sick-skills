import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { IMAGES_DIR } from '@/app/lib/paths'

export const runtime = 'nodejs'

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get('file')
  if (!file) return NextResponse.json({ error: 'Missing file param' }, { status: 400 })

  const resolved = path.resolve(IMAGES_DIR, file)
  if (!resolved.startsWith(IMAGES_DIR + path.sep)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ext = path.extname(file).toLowerCase()
  const contentType = MIME_TYPES[ext] ?? 'image/png'

  try {
    const data = await readFile(resolved)
    return new NextResponse(data, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000' },
    })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
