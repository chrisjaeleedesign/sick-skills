import { NextRequest, NextResponse } from 'next/server'
import { listPromptVersions, savePromptVersion } from '@/app/lib/storage'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const versions = await listPromptVersions(id)
  return NextResponse.json(versions)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { note } = await req.json().catch(() => ({}))
  const version = await savePromptVersion(id, note)
  return NextResponse.json(version, { status: 201 })
}
