import { NextRequest, NextResponse } from 'next/server'
import { getPrompt, updatePromptDraft, updatePromptName, deletePrompt } from '@/app/lib/storage'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const prompt = await getPrompt(id)
  return NextResponse.json(prompt)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  if (body.name !== undefined) await updatePromptName(id, body.name)
  if (body.draft !== undefined) await updatePromptDraft(id, body.draft)
  const prompt = await getPrompt(id)
  return NextResponse.json(prompt)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await deletePrompt(id)
  return NextResponse.json({ ok: true })
}
