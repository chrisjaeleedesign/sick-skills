import { NextRequest, NextResponse } from 'next/server'
import { getPromptVersion } from '@/app/lib/storage'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string; v: string }> }) {
  const { id, v } = await params
  const version = await getPromptVersion(id, parseInt(v, 10))
  return NextResponse.json(version)
}
