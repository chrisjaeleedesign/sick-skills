import { NextRequest, NextResponse } from 'next/server'
import { createBranchChat } from '@/app/lib/storage'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sourceChatId } = await params
  const { afterMessageId, title } = await req.json() as { afterMessageId: string; title?: string }
  if (!afterMessageId) {
    return NextResponse.json({ error: 'afterMessageId required' }, { status: 400 })
  }
  const chat = await createBranchChat(sourceChatId, afterMessageId, title)
  return NextResponse.json(chat)
}
