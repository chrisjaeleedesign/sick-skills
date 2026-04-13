import { NextRequest, NextResponse } from 'next/server'
import { listMessages } from '@/app/lib/storage'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const messages = await listMessages(id)
  return NextResponse.json(messages)
}
