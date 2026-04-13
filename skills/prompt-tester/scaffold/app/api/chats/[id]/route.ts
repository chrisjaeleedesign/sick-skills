import { NextRequest, NextResponse } from 'next/server'
import { getChat, deleteChat } from '@/app/lib/storage'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const chat = await getChat(id)
  return NextResponse.json(chat)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await deleteChat(id)
  return NextResponse.json({ ok: true })
}
