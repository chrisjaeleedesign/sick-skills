import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

const IMAGES_DIR = path.resolve(process.cwd(), '..', '..', '..', '.agents', 'workbench', 'images')

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get('file')
  if (!file) return NextResponse.json({ error: 'Missing file param' }, { status: 400 })

  // Reject path traversal
  const resolved = path.resolve(IMAGES_DIR, file)
  if (!resolved.startsWith(IMAGES_DIR)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const data = await readFile(resolved)
    return new NextResponse(data, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000' },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
