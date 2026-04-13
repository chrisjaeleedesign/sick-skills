import { NextRequest, NextResponse } from 'next/server'
import { createChat, listChats, createPrompt } from '@/app/lib/storage'

export async function GET() {
  const chats = await listChats()
  return NextResponse.json(chats)
}

export async function POST(req: NextRequest) {
  const { title, promptId } = await req.json()
  let pid = promptId
  // If no promptId provided, auto-create a new prompt with the same title
  if (!pid) {
    const prompt = await createPrompt(title ?? 'Untitled')
    pid = prompt.id
  }
  const chat = await createChat(title ?? 'Untitled chat', pid, 0)
  return NextResponse.json(chat, { status: 201 })
}
