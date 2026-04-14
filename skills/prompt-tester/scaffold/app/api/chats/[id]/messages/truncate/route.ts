import { NextRequest, NextResponse } from 'next/server'
import { truncateFromMessage } from '@/app/lib/storage'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = await params
  const { fromMessageId } = await req.json() as { fromMessageId: string }
  if (!fromMessageId) {
    return NextResponse.json({ error: 'fromMessageId required' }, { status: 400 })
  }
  const remaining = await truncateFromMessage(chatId, fromMessageId)
  return NextResponse.json(remaining)
}
